import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/* Everything one account did on the site, as a readable timeline for staff: every visit (also the visits from the
   same browser before signing up), with each page, click and logged action in order. */
const { visits, visitEvents, audit, users } = schema;

export type Step = { at: Date; kind: "page" | "click" | "action" | "signup"; text: string; sub?: string; href?: string; tone?: "ok" | "warn" };
export type Session = { id: string | null; startedAt: Date; lastAt: Date; device?: string | null; browser?: string | null; os?: string | null; city?: string | null; country?: string | null;
  referrer?: string | null; refCode?: string | null; landing?: string | null; pages: number; clicks: number; beforeSignup: boolean; steps: Step[] };

const ACTION: Record<string, string> = {
  "consent.terms": "Accepted the terms of use", "consent.privacy": "Accepted the privacy statement", "consent.creator_agreement": "Signed the creator agreement",
  "consent.sensitive_data": "Agreed to the use of sensitive data", "marketing.opt_in": "Opted in to marketing", "referral.signup": "Signed up through an invite link",
  "identity.started": "Started the ID and age check", "identity.result": "ID and age check finished", "age_check.started": "Started the buyer age check", "age_check.result": "Buyer age check finished",
  "payout.started": "Started the payout setup", "payout.result": "Payout setup finished", "album.photos_added": "Added photos to the preview album", "album.photo_removed": "Removed a photo from the preview album",
  "album.requested": "Asked a creator for a preview album", "album.shared": "Shared a preview album", "album.opened": "Opened a preview album", "auth.passkey_added": "Added a passkey (Face ID, fingerprint)",
  "user.handle_changed": "Changed username", "privacy.account_deleted": "Deleted the account", "mail.lifecycle": "Was sent an email", "house.offer_message": "Got a message from a team profile",
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const STEP: Record<string, string> = { account: "account", identity: "ID check", payouts: "payouts", agreement: "agreement", done: "done" };

function page(path: string, titles: Map<string, string>): { text: string; href?: string } {
  const [p, q = ""] = path.split("?");
  const qs = new URLSearchParams(q);
  const id = p.match(UUID)?.[0];
  const t = id ? titles.get(id) : undefined;
  if (p === "/") return { text: "Home" };
  if (p === "/signin") return { text: qs.get("as") === "earn" ? "Landing page, creator side" : "Landing and sign in page" };
  if (p === "/creators") return { text: "Creator invite page" };
  if (p.startsWith("/r/")) return { text: `Opened invite link ${p.slice(3)}` };
  if (p === "/for-you") return { text: "Feed of requests" };
  if (p.startsWith("/requests/") && p.endsWith("/offers")) return { text: `Applications on “${t ?? "a request"}”`, href: id && `/admin/requests/${id}` };
  if (p.startsWith("/requests/")) return { text: `Request “${t ?? id?.slice(0, 8) ?? "?"}”`, href: id && `/admin/requests/${id}` };
  if (p.startsWith("/deals/")) return { text: `Deal “${t ?? "?"}”`, href: id && `/admin/chat/${id}` };
  if (p.startsWith("/c/")) return { text: `Profile of ${decodeURIComponent(p.slice(3))}` };
  if (p === "/onboarding") return { text: qs.get("welcome") ? "Welcome tour" : `Creator setup${qs.get("step") ? `: ${STEP[qs.get("step")!] ?? qs.get("step")}` : ""}` };
  if (p.startsWith("/sandbox/identity")) return { text: "ID check (test provider)" };
  if (p.startsWith("/sandbox/payout")) return { text: "Payout setup (test provider)" };
  const named: Record<string, string> = { "/post": "Post a request", "/inbox": "Inbox", "/studio": "Studio", "/earnings": "Earnings", "/settings": "Settings", "/vault": "Vault", "/deals": "Deals",
    "/help": "Help centre", "/contact": "Contact form", "/invite": "Invite friends", "/profile": "Own profile", "/avatar": "Avatar editor", "/notifications": "Notifications" };
  return { text: named[p] ?? p };
}

function act(a: string, d: Record<string, unknown>): { text: string; sub?: string; tone?: "ok" | "warn" } {
  const status = typeof d.status === "string" ? d.status : typeof d.decision === "string" ? d.decision : undefined;
  const sub = [status, d.provider && `via ${d.provider}`, d.env === "test" && "test mode", typeof d.subject === "string" && d.subject].filter(Boolean).join(" · ") || undefined;
  return { text: ACTION[a] ?? a.replace(/[._]/g, " "), sub, tone: status === "approved" ? "ok" : status && /declin|reject|fail/.test(status) ? "warn" : undefined };
}

export async function journey(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true, createdAt: true } });
  if (!u) return null;
  // The browsers this account used, so the visits before signing up show too.
  const mine = await db.select({ vid: visits.visitorId }).from(visits).where(eq(visits.userId, userId));
  const vids = [...new Set(mine.map((m) => m.vid))];
  const vs = await db.select().from(visits).where(vids.length ? or(eq(visits.userId, userId), and(inArray(visits.visitorId, vids), sql`${visits.userId} is null`)) : eq(visits.userId, userId))
    .orderBy(desc(visits.startedAt)).limit(60);
  const evs = vs.length ? await db.select().from(visitEvents).where(inArray(visitEvents.visitId, vs.map((v) => v.id))).orderBy(visitEvents.at).limit(4000) : [];
  const logs = await db.select().from(audit).where(eq(audit.subjectUserId, userId)).orderBy(desc(audit.at)).limit(1000);

  // Titles for the requests and deals that were opened.
  const ids = [...new Set(evs.flatMap((e) => [e.path.match(UUID)?.[0], e.label?.match(UUID)?.[0]]).filter((x): x is string => !!x))];
  const titles = new Map<string, string>();
  if (ids.length) {
    for (const r of await db.select({ id: schema.requests.id, title: schema.requests.title }).from(schema.requests).where(inArray(schema.requests.id, ids))) titles.set(r.id, r.title);
    for (const d of await db.select({ id: schema.deals.id, title: schema.requests.title }).from(schema.deals).innerJoin(schema.requests, eq(schema.requests.id, schema.deals.requestId)).where(inArray(schema.deals.id, ids))) titles.set(d.id, d.title);
  }

  const sessions: Session[] = vs.map((v) => ({ id: v.id, startedAt: v.startedAt, lastAt: v.lastAt, device: v.device, browser: v.browser, os: v.os, city: v.city, country: v.country, referrer: v.referrer, refCode: v.refCode,
    landing: v.landing, pages: v.pages, clicks: v.clicks, beforeSignup: v.startedAt < u.createdAt && !v.userId, steps: [] }));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  for (const e of evs) {
    const s = byId.get(e.visitId); if (!s) continue;
    if (e.kind === "page") { const p = page(e.path, titles); s.steps.push({ at: e.at, kind: "page", text: p.text, href: p.href, sub: e.path.length > 1 ? e.path : undefined }); }
    else {
      // The tracker writes "label → /target" for links: show the label, and where it led in words.
      const [label, to] = (e.label ?? "Clicked").split(" → ");
      s.steps.push({ at: e.at, kind: "click", text: label, sub: `on ${page(e.path, titles).text}${to ? `, to ${page(to, titles).text}` : ""}` });
    }
  }
  // Logged actions go into the visit they happened in; the rest stand on their own.
  const loose: Step[] = [];
  const signup: Step = { at: u.createdAt, kind: "signup", text: "Created the account", tone: "ok" };
  for (const a of [...logs.map((l) => ({ at: l.at, kind: "action" as const, ...act(l.action, l.detail) })), signup]) {
    const s = sessions.find((x) => a.at >= new Date(x.startedAt.getTime() - 60_000) && a.at <= new Date(x.lastAt.getTime() + 120_000));
    if (s) s.steps.push(a); else loose.push(a);
  }
  for (const s of sessions) s.steps.sort((a, b) => +a.at - +b.at);
  if (loose.length) {
    loose.sort((a, b) => +a.at - +b.at);
    sessions.push({ id: null, startedAt: loose[0].at, lastAt: loose.at(-1)!.at, pages: 0, clicks: 0, beforeSignup: false, steps: loose });
    sessions.sort((a, b) => +b.startedAt - +a.startedAt);
  }
  const total = vs.reduce((n, v) => n + Math.max(0, +v.lastAt - +v.startedAt), 0);
  return { sessions, firstSeen: vs.at(-1)?.startedAt ?? u.createdAt, lastSeen: vs[0]?.lastAt ?? null, visits: vs.length, pages: vs.reduce((n, v) => n + v.pages, 0), clicks: vs.reduce((n, v) => n + v.clicks, 0),
    totalSec: Math.round(total / 1000), online: !!vs[0] && Date.now() - +vs[0].lastAt < 5 * 60_000, actions: logs.length };
}
