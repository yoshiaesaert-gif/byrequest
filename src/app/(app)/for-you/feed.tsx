"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSave } from "../actions";
import { toast } from "@/components/chrome";
import { CAT_LABEL, CREATOR_SHARE, amountLabel, euros, type Category } from "@/domain/rules";
import { useT } from "@/i18n/client";
import { BuyerLine, type BuyerStat } from "@/components/ui";

type Item = { id: string; title: string; category: Category; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; face: string; minVault: string; closesAt: Date; cover: string | null; offers: number; applied?: boolean; saved: boolean; house?: boolean; translated?: boolean; buyer?: BuyerStat };
const VAULT: Record<string, string> = { "7d": "7 days", "30d": "30 days", "1y": "1 year", forever: "Forever" };
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

function left(d: Date, now: number, t: ReturnType<typeof useT>) { const h = (new Date(d).getTime() - now) / 3600_000; return h < 1 ? t("Closes in {n}m", { n: Math.max(1, Math.round(h * 60)) }) : h < 48 ? t("Closes in {n}h", { n: Math.round(h) }) : t("Closes in {n} days", { n: Math.round(h / 24) }); }

export default function Feed({ items, tab, sell, frost }: { items: Item[]; tab: string; sell: boolean; frost: boolean }) {
  const router = useRouter();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState(false);
  const [now] = useState(() => Date.now());
  const [saved, setSaved] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, i.saved])));
  const step = (d: number) => ref.current?.scrollBy({ top: d * ref.current.clientHeight, behavior: "smooth" });
  // Arrow keys flip to the next or previous card, like swiping.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) || document.querySelector(".hw-glass")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const tabs: [string, string][] = [["for-you", t("For you")], ["new", t("New")], ["ending", t("Ending soon")]];

  return (
    <div className="feedwrap">
      <WorldNote />
      <div className="feed" id="feed" ref={ref}>
        {items.length === 0 ? <section className="fi"><div className="card empty" style={{ maxWidth: 420 }}><b className="t-h3">{t("Nothing here right now")}</b><p className="muted t-sm">{t("New requests appear all day. Post your own and creators come to you.")}</p><Link className="btn btn-primary" href="/post">{t("Post a request")}</Link></div></section> : null}
        {items.map((r) => (
          <section className="fi" key={r.id}>
            <article className={"fcard media" + (peek ? " revealed" : "")}>
              {r.cover && !r.cover.startsWith("g-") ? <><img className="cimg" src={`/img/${r.cover}.webp`} alt="" /><span className="cscrim" />{frost ? <span className="frost" aria-hidden="true" /> : null}</> : <span className={"neutralbg " + (r.cover ?? "")} />}
              <div className="top"><span className={"fpill" + ((new Date(r.closesAt).getTime() - now) / 3600_000 <= 6 ? " hot" : "")}><Ico n="clock" />{left(r.closesAt, now, t)}</span></div>
              <div className="mid">
                <div className="fhead"><span className="eyb">{t(CAT_LABEL[r.category])} · {amountLabel(r.category, r.amount, t)}</span><div className="t">{r.title}</div>
                  <div className="fmeta"><span>{t(r.who)}, {t("{a} to {b}", { a: r.ageMin, b: r.ageMax })}</span><span>{t(r.face === "not_needed" ? "No face" : r.face === "optional" ? "Face optional" : "Face required")}</span><span>{t("Vault")} {t(VAULT[r.minVault])}</span></div><BuyerLine b={r.buyer} t={t} light />{r.house ? <div className="by-brq" style={{ color: "rgba(255,255,255,.75)" }}>{t("by ByRequest")}</div> : null}</div>
                <div className="fdeal">
                  <div className="fearn"><span className="lbl">{t("Budget")}</span><b className="num">{euros(r.dealCents)}</b>{sell ? <span className="ffix">{t("You get {amount} · fixed price", { amount: euros(Math.round(r.dealCents * CREATOR_SHARE)) })}</span> : null}</div>
                  {r.applied ? <Link className="fgo is-applied" href={`/requests/${r.id}#offer`}><i><Ico n="check" c="sm" /></i><span>{t("Applied")}</span></Link>
                    : <Link className="fgo" href={`/requests/${r.id}`}><span>{sell ? t("Apply") : t("View request")}</span><i><Ico n="right" c="sm" /></i></Link>}
                </div>
              </div>
            </article>
            <div className="frail">
              {frost ? <button onClick={() => setPeek((p) => !p)} className={peek ? "is-on" : ""} aria-label={t("Peek at the cover")}><span className="c"><Ico n="eye" /></span><span className="l">{peek ? t("Hide") : t("Peek")}</span></button> : null}
              <button className={saved[r.id] ? "is-on" : ""} aria-label={t("Save")} onClick={async () => { const on = await toggleSave(r.id); setSaved((s) => ({ ...s, [r.id]: on })); toast(on ? t("Saved") : t("Removed from saved")); }}><span className="c"><Ico n="bookmark" /></span><span className="l">{saved[r.id] ? t("Saved") : t("Save")}</span></button>
              {!sell ? <Link href={`/post?c=${r.category}&amount=${r.amount}&budget=${Math.round(r.dealCents / 100)}&title=${encodeURIComponent(r.title)}`} aria-label={t("Post a similar request")}><span className="c"><Ico n="plus" /></span><span className="l">{t("Similar")}</span></Link> : null}
              {sell ? null : <button aria-label={t("Offers")} onClick={() => toast(t("{n} creators already made an offer.", { n: r.offers }))}><span className="c"><b className="num" style={{ fontSize: ".95rem" }}>{r.offers}</b></span><span className="l">{t("Offers")}</span></button>}
            </div>
          </section>
        ))}
      </div>
      <div className="feedtabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => router.push(k === "for-you" ? "/for-you" : `/for-you?tab=${k}`)}>{l}</button>)}</div>
      <div className="feed-hint"><button className="icon-btn" onClick={() => step(-1)} aria-label={t("Previous request")}><Ico n="up" /></button><button className="icon-btn" onClick={() => step(1)} aria-label={t("Next request")}><Ico n="down" /></button></div>
    </div>
  );
}

/* Requests come from buyers in many countries; say so, once per visit, so the board never feels local. */
function WorldNote() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => { let seen = false; try { seen = sessionStorage.getItem("brq_world") === "1"; } catch { /* private mode */ } if (!seen) setShow(true); }, 400); return () => clearTimeout(id); }, []);
  if (!show) return null;
  return (<div className="world-note" role="status"><span className="world-dot" /><span><b>{t("Requests from buyers worldwide")}</b> {t("Translated into your language automatically. New ones are released throughout the day, so check back.")}</span>
    <button type="button" aria-label={t("Close")} onClick={() => { try { sessionStorage.setItem("brq_world", "1"); } catch { /* private mode */ } setShow(false); }}><svg className="ico sm" aria-hidden="true"><use href="#i-x" /></svg></button></div>);
}
