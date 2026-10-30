import { LOOKS as ALL_LOOKS } from "@/domain/looks";
import Link from "next/link";
import { CAT_LABEL, euros, CREATOR_SHARE, type Category } from "@/domain/rules";

export function I({ n, c }: { n: string; c?: "sm" | "lg" }) {
  return <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
}

const LOOKS = new Set(ALL_LOOKS);
type Avatar = { kind: "3d"; look: string } | { kind: "built"; spec: Record<string, unknown>; svg?: string } | { kind: "photo"; blur: boolean } | null | undefined;

/** Data URL for a stored avatar SVG; adds the namespace an <img> needs to render it. */
export function svgSrc(svg: string) {
  const s = svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"');
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

export function Av({ a, name, size = 40, square }: { a: Avatar; name: string; size?: number; square?: boolean }) {
  const r = square ? Math.round(size * 0.26) : size / 2;
  if (a?.kind === "3d" && (LOOKS.has(a.look) || /^b_[a-z0-9]+$/.test(a.look)))
    return <img className="av3d" src={`/av/${a.look}.webp`} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: r, objectFit: "cover", flex: "0 0 auto" }} />;
  if (a?.kind === "built" && a.svg)   // pre-rendered SVG; an <img> keeps its internal ids isolated
    return <img className="av3d" src={svgSrc(a.svg)} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: r, objectFit: "cover", flex: "0 0 auto" }} />;
  return <span className="avx" style={{ width: size, height: size, borderRadius: r, fontSize: size * 0.42 }} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export function Cover({ cover, frost }: { cover: string | null; frost?: boolean }) {
  if (!cover || cover.startsWith("g-")) return <span className={"neutralbg " + (cover ?? "")} />;   // g-<tint>: a colour the buyer picked
  return (<>
    <img className="cimg" src={`/img/${cover}.webp`} alt="" loading="lazy" />
    <span className="cscrim" />
    {frost ? <span className="frost" aria-hidden="true" /> : null}
  </>);
}

/** One time format for server and client, so a deadline reads the same everywhere. */
export const TZ = "Europe/Brussels";
const LOCALE_TAG: Record<string, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };
export function when(d: Date | string, locale = "en") { return new Date(d).toLocaleString(LOCALE_TAG[locale] ?? "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }); }

export function hoursLeft(d: Date) { return Math.max(0, (d.getTime() - Date.now()) / 3600_000); }
type Tr = (s: string, v?: Record<string, string | number>) => string;
const same: Tr = (s, v) => { let o = s; for (const [k, x] of Object.entries(v ?? {})) o = o.split(`{${k}}`).join(String(x)); return o; };
export function leftLabel(d: Date, t: Tr = same) {
  const h = hoursLeft(d);
  if (h < 1) return t("{n}m left", { n: Math.max(1, Math.round(h * 60)) });
  if (h < 48) return t("{n}h left", { n: Math.round(h) });
  return t("{n} days left", { n: Math.round(h / 24) });
}
export function ageLabel(a: number, b: number, t: Tr = same) { return t("{a} to {b}", { a, b }); }
const UNIT: Record<Category, string> = { video: "MIN VIDEO", photos: "PHOTOS", voice: "MIN VOICE", custom: "MIN CUSTOM", worn: "ITEM" };

/* translated: the title shown is a machine translation, marked above it (see server/translate.ts). */
export type CardReq = { id: string; title: string; category: Category; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; closesAt: Date; cover: string | null; offers: number; house?: boolean; translated?: boolean; buyer?: BuyerStat; forCreatorId?: string | null; circleUntil?: Date | null };
export type BuyerStat = { sum: number; count: number; deals: number };

/* What a creator sees about the person behind a request: stars from earlier creators and completed deals. */
export function BuyerLine({ b, t = same, light }: { b?: BuyerStat; t?: Tr; light?: boolean }) {
  if (!b) return null;
  return <span className={"buyer-ln" + (light ? " light" : "")}>{b.count ? <><span className="star">★</span> {(b.sum / b.count).toFixed(1)} · </> : null}{b.deals ? t(b.deals === 1 ? "1 deal" : "{n} deals", { n: b.deals }) : t("New buyer")}</span>;
}

export function Chips({ r, t = same }: { r: CardReq; t?: Tr }) {
  const hot = hoursLeft(r.closesAt) <= 6;
  return (<div className="chips">
    <span className="mc"><I n="user" />{ageLabel(r.ageMin, r.ageMax, t)}</span>
    <span className={"mc" + (hot ? " hot" : "")}><I n="clock" />{leftLabel(r.closesAt, t)}</span>
  </div>);
}
export function BigNum({ r, t = same }: { r: CardReq; t?: Tr }) { return <div className="bn num">{r.amount}<small>{t(UNIT[r.category])}</small></div>; }
export function Earn({ cents, t = same, budget }: { cents: number; t?: Tr; budget?: boolean }) {
  // Everyone sees the budget the buyer set; creators also see what they receive after the platform fee.
  return <div className="pr"><span className="lbl">{t("Budget")}</span><b className="num">{euros(cents)}</b>{budget ? null : <small className="pr-net">{t("You get {amount}", { amount: euros(Math.round(cents * CREATOR_SHARE)) })}</small>}</div>;
}
export const who = (w: string, t: Tr = same) => t(w);

export function RequestCard({ r, frost = true, t = same, budget, isNew }: { r: CardReq; frost?: boolean; t?: Tr; budget?: boolean; isNew?: boolean }) {
  return (
    <Link href={`/requests/${r.id}`} className={"rq" + (isNew ? " is-new" : "")}>
      <div className="media">
        <Cover cover={r.cover} frost={frost} />
        <div className="ov"><div><Chips r={r} t={t} /><BigNum r={r} t={t} /></div><Earn cents={r.dealCents} t={t} budget={budget} /></div>
      </div>
      <div>{r.forCreatorId ? <span className="new-chip ic">{t("For you only")}</span> : r.circleUntil && r.circleUntil > new Date() ? <span className="new-chip ic">{t("Inner Circle first")}</span> : isNew ? <span className="new-chip">{t("New")}</span> : null}<div className="t">{r.title}</div><div className="m">{t(CAT_LABEL[r.category])} · {t(r.who)} · {ageLabel(r.ageMin, r.ageMax, t)}{budget ? ` · ${t("{n} offers", { n: r.offers })}` : ""}</div><BuyerLine b={r.buyer} t={t} />{r.house ? <div className="by-brq">{t("by ByRequest")}</div> : null}</div>
    </Link>
  );
}

export function Stars({ sum, count, t = same }: { sum: number; count: number; t?: Tr }) {
  return count ? <><span className="star">★</span> {(sum / count).toFixed(1)}</> : <span className="badge ok">{t("New")}</span>;
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty card"><span className="empty-i"><I n={icon} c="lg" /></span><b className="t-h3">{title}</b><p className="muted t-sm">{text}</p>{action}</div>;
}
