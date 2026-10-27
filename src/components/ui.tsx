import Link from "next/link";
import { CAT_LABEL, euros, CREATOR_SHARE, type Category } from "@/domain/rules";

export function I({ n, c }: { n: string; c?: "sm" | "lg" }) {
  return <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
}

const LOOKS = new Set(["ava", "nour", "dre", "milo", "kai", "lina", "jens", "noah", "ruby", "sem"]);
type Avatar = { kind: "3d"; look: string } | { kind: "built"; spec: Record<string, unknown> } | { kind: "photo"; blur: boolean } | null | undefined;

export function Av({ a, name, size = 40, square }: { a: Avatar; name: string; size?: number; square?: boolean }) {
  const r = square ? Math.round(size * 0.26) : size / 2;
  if (a?.kind === "3d" && LOOKS.has(a.look))
    return <img className="av3d" src={`/av/${a.look}.webp`} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: r, objectFit: "cover", flex: "0 0 auto" }} />;
  return <span className="avx" style={{ width: size, height: size, borderRadius: r, fontSize: size * 0.42 }} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export function Cover({ cover, frost }: { cover: string | null; frost?: boolean }) {
  if (!cover) return <span className="neutralbg" />;
  return (<>
    <img className="cimg" src={`/img/${cover}.webp`} alt="" loading="lazy" />
    <span className="cscrim" />
    {frost ? <span className="frost" aria-hidden="true" /> : null}
  </>);
}

export function hoursLeft(d: Date) { return Math.max(0, (d.getTime() - Date.now()) / 3600_000); }
export function leftLabel(d: Date) {
  const h = hoursLeft(d);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m left`;
  if (h < 48) return `${Math.round(h)}h left`;
  return `${Math.round(h / 24)} days left`;
}
export function ageLabel(a: number, b: number) { return `${a} to ${b}`; }
const UNIT: Record<Category, string> = { video: "MIN VIDEO", photos: "PHOTOS", voice: "MIN VOICE", custom: "MIN CUSTOM", worn: "ITEM" };

export type CardReq = { id: string; title: string; category: Category; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; closesAt: Date; cover: string | null; offers: number };

export function Chips({ r }: { r: CardReq }) {
  const hot = hoursLeft(r.closesAt) <= 6;
  return (<div className="chips">
    <span className="mc"><I n="user" />{ageLabel(r.ageMin, r.ageMax)}</span>
    <span className={"mc" + (hot ? " hot" : "")}><I n="clock" />{leftLabel(r.closesAt)}</span>
  </div>);
}
export function BigNum({ r }: { r: CardReq }) { return <div className="bn num">{r.amount}<small>{UNIT[r.category]}</small></div>; }
export function Earn({ cents }: { cents: number }) {
  return <div className="pr"><span className="lbl">Earn</span><b className="num">{euros(Math.round(cents * CREATOR_SHARE))}</b></div>;
}

export function RequestCard({ r, frost = true }: { r: CardReq; frost?: boolean }) {
  return (
    <Link href={`/requests/${r.id}`} className="rq">
      <div className="media">
        <Cover cover={r.cover} frost={frost} />
        <div className="ov"><div><Chips r={r} /><BigNum r={r} /></div><Earn cents={r.dealCents} /></div>
      </div>
      <div><div className="t">{r.title}</div><div className="m">{CAT_LABEL[r.category]} · {r.who} · {ageLabel(r.ageMin, r.ageMax)} · {r.offers} offers</div></div>
    </Link>
  );
}

export function Stars({ sum, count }: { sum: number; count: number }) {
  return count ? <><span className="star">★</span> {(sum / count).toFixed(1)}</> : <span className="badge ok">New</span>;
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty card"><span className="empty-i"><I n={icon} c="lg" /></span><b className="t-h3">{title}</b><p className="muted t-sm">{text}</p>{action}</div>;
}
