import "server-only";
import { and, desc, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { netId } from "./referrals";

/* Everything that happened with each invite link, for staff, in plain words: every copy and share by the owner
   (and through which app), every link preview a chat app made, every open with device and place, which of those
   were the owner himself, how many different people that is, and how far each of them got. Older opens without
   details are matched to the visit that followed them. */
const { referralEvents: E, users: U, visits: V, visitEvents: VE } = schema;

export const CH: Record<string, string> = { wa: "WhatsApp", tg: "Telegram", sms: "SMS", sc: "Snapchat", ig: "Instagram", tt: "TikTok", x: "X", mail: "E-mail", fb: "Facebook", li: "LinkedIn", line: "LINE" };
export type Step = "opened" | "creator page" | "entered" | "sign in page" | "account" ;
export type Row = { at: Date; kind: "copy" | "share" | "qr" | "code" | "preview" | "open" | "signup"; text: string; sub?: string; who: "owner" | "person" | "preview" | "unknown"; person?: string; ch?: string | null;
  device?: string; place?: string; reached?: string; secs?: number; handle?: string };
export type Link = { code: string; owner: string; ownerId: string; rows: Row[]; k: { copies: number; shares: number; byCh: [string, number][]; previews: number; previewApps: [string, number][];
  opens: number; ownOpens: number; people: number; peopleCh: [string, number][]; places: [string, number][]; devices: [string, number][]; reachedCreator: number; entered: number; signups: number; firstOpen: Date | null; lastOpen: Date | null } };

const count = (xs: (string | null | undefined)[]) => [...xs.filter((x): x is string => !!x).reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

export async function linkActivity(days = 30): Promise<Link[]> {
  const since = new Date(Date.now() - days * 86400_000);
  const evs = await db.select().from(E).where(and(gt(E.createdAt, since), inArray(E.event, ["link_opened", "link_copied", "link_shared", "qr_shown", "code_copied", "signed_up"]))).orderBy(desc(E.createdAt)).limit(3000);
  const codes = [...new Set(evs.map((e) => e.code))];
  if (!codes.length) return [];
  const owners = await db.select({ id: U.id, handle: U.handle, code: U.refCode }).from(U).where(inArray(U.refCode, codes));
  const ownerIps = new Map<string, Set<string>>();
  if (owners.length) for (const r of await db.selectDistinct({ u: V.userId, ip: V.ip }).from(V).where(and(inArray(V.userId, owners.map((o) => o.id)), isNotNull(V.ip))))
    ownerIps.set(r.u!, (ownerIps.get(r.u!) ?? new Set()).add(r.ip!));

  // Visits that came in through a link: the first page with ?ref=CODE, or a visit tagged with the code.
  const hits = await db.select({ vid: VE.visitId, path: VE.path, at: sql<Date>`min(${VE.at})` }).from(VE).where(and(gt(VE.at, since), sql`${VE.path} like '%ref=%'`)).groupBy(VE.visitId, VE.path);
  const vids = [...new Set(hits.map((h) => h.vid))];
  const vs = vids.length ? await db.select().from(V).where(inArray(V.id, vids)) : [];
  const vById = new Map(vs.map((v) => [v.id, v]));
  const evByVisit = new Map<string, { path: string; kind: string; label: string | null }[]>();
  if (vids.length) for (const e of await db.select({ v: VE.visitId, path: VE.path, kind: VE.kind, label: VE.label }).from(VE).where(inArray(VE.visitId, vids)).orderBy(VE.at))
    evByVisit.set(e.v, [...(evByVisit.get(e.v) ?? []), e]);
  const accounts = new Map((vs.some((v) => v.userId) ? await db.select({ id: U.id, handle: U.handle, createdAt: U.createdAt }).from(U).where(inArray(U.id, vs.filter((v) => v.userId).map((v) => v.userId!))) : []).map((u) => [u.id, u]));

  const out: Link[] = [];
  for (const code of codes) {
    const o = owners.find((x) => x.code === code);
    if (!o) continue;
    const mine = ownerIps.get(o.id) ?? new Set<string>();
    const landed = hits.filter((h) => h.path.includes(`ref=${code}`)).map((h) => ({ ...h, v: vById.get(h.vid)! })).filter((h) => h.v).sort((a, b) => +new Date(a.at) - +new Date(b.at));
    const used = new Set<string>();
    const people = new Map<string, string>();   // network + device -> "Person A"
    const rows: Row[] = [];
    for (const e of evs.filter((x) => x.code === code).reverse()) {
      const d = (e.detail ?? {}) as Record<string, string | boolean | null>;
      const ch = (d.ch as string) || null;
      if (e.event !== "link_opened") {
        const kind = e.event === "link_shared" ? "share" : e.event === "qr_shown" ? "qr" : e.event === "code_copied" ? "code" : e.event === "signed_up" ? "signup" : "copy";
        rows.push({ at: e.createdAt, kind, who: "owner", ch, text: kind === "share" ? `${o.handle} shared the link${ch ? ` via ${CH[ch] ?? ch}` : " with the share button"}` : kind === "qr" ? `${o.handle} showed the QR code` : kind === "code" ? `${o.handle} copied the code` : kind === "signup" ? "Someone signed up with the code" : `${o.handle} copied the link` });
        continue;
      }
      if (d.who === "preview") { rows.push({ at: e.createdAt, kind: "preview", who: "preview", ch, text: `${d.app} made a link preview`, sub: "The link was pasted in a chat. This is the app, not a person." }); continue; }
      // The visit that followed this open: same code, within 3 minutes, and the same network when we know it.
      const h = landed.find((x) => !used.has(x.vid) && +new Date(x.at) >= +e.createdAt - 5000 && +new Date(x.at) <= +e.createdAt + 180_000 && (!d.net || netId(x.v.ip ?? "") === d.net));
      if (h) used.add(h.vid);
      const v = h?.v;
      const self = d.who === "owner" || (!!v && (v.userId === o.id || (!!v.ip && mine.has(v.ip))));
      const dev = v ? [v.device === "mobile" ? (v.os === "iOS" ? "iPhone" : v.os === "Android" ? "Android phone" : "Phone") : v.device === "tablet" ? "Tablet" : `${v.os ?? ""} computer`.trim(), v.browser].filter(Boolean).join(", ")
        : d.device ? [d.device === "mobile" ? (d.os === "iOS" ? "iPhone" : d.os === "Android" ? "Android phone" : "Phone") : d.device, d.browser].filter(Boolean).join(", ") : undefined;
      const key = v ? `${v.ip}|${v.os}|${v.browser}` : d.net ? `${d.net}|${d.os}|${d.browser}` : null;
      let person: string | undefined;
      if (!self && key) { if (!people.has(key)) people.set(key, `Person ${String.fromCharCode(65 + (people.size % 26))}${people.size >= 26 ? Math.floor(people.size / 26) : ""}`); person = people.get(key); }
      const steps = v ? evByVisit.get(v.id) ?? [] : [];
      const acct = v?.userId && v.userId !== o.id ? accounts.get(v.userId) : undefined;
      const reached = acct ? `Created an account: ${acct.handle}` : steps.some((s) => s.path.startsWith("/signin")) && steps.some((s) => s.path.startsWith("/creators")) ? "Went on to sign up"
        : steps.some((s) => s.kind === "click" && /18 or older|enter/i.test(s.label ?? "")) ? "Confirmed 18+ and looked around" : steps.some((s) => s.path.startsWith("/creators")) ? "Saw the creator page, then left" : v ? "Opened, then left" : "No page view: closed right away or a preview";
      rows.push({ at: e.createdAt, kind: "open", who: self ? "owner" : v || d.net ? "person" : "unknown", person, ch, device: dev, place: [v?.city, v?.country].filter(Boolean).join(", ") || undefined, reached, handle: acct?.handle,
        secs: v ? Math.round((+v.lastAt - +v.startedAt) / 1000) : undefined,
        text: self ? `${o.handle} opened their own link` : person ? `${person} opened the link${ch ? ` from ${CH[ch] ?? ch}` : ""}` : "The link was opened" });
    }
    rows.reverse();
    const opens = rows.filter((r) => r.kind === "open");
    const others = opens.filter((r) => r.who === "person");
    const firstPerOne = [...new Map(others.map((r) => [r.person, r])).values()];
    out.push({ code, owner: o.handle, ownerId: o.id, rows, k: {
      copies: rows.filter((r) => r.kind === "copy" || r.kind === "code").length, shares: rows.filter((r) => r.kind === "share" || r.kind === "qr").length,
      byCh: count(rows.filter((r) => r.kind === "share").map((r) => r.ch ? CH[r.ch] ?? r.ch : "Share button")),
      previews: rows.filter((r) => r.kind === "preview").length, previewApps: count(rows.filter((r) => r.kind === "preview").map((r) => r.text.replace(" made a link preview", ""))),
      opens: opens.length, ownOpens: opens.filter((r) => r.who === "owner").length, people: firstPerOne.length,
      peopleCh: count(firstPerOne.map((r) => r.ch ? CH[r.ch] ?? r.ch : "Unknown app")), places: count(firstPerOne.map((r) => r.place ?? "Unknown place")), devices: count(firstPerOne.map((r) => r.device?.split(",")[0])),
      reachedCreator: firstPerOne.filter((r) => !/^Opened, then|^No page/.test(r.reached ?? "")).length, entered: others.filter((r) => /18\+|sign up|account/i.test(r.reached ?? "")).length,
      signups: others.filter((r) => r.handle).length, firstOpen: opens.at(-1)?.at ?? null, lastOpen: opens[0]?.at ?? null } });
  }
  return out.sort((a, b) => +(b.k.lastOpen ?? 0) - +(a.k.lastOpen ?? 0));
}
