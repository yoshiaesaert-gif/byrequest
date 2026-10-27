"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSave } from "../actions";
import { toast } from "@/components/chrome";
import { CAT_LABEL, CREATOR_SHARE, amountLabel, euros, type Category } from "@/domain/rules";

type Item = { id: string; title: string; category: Category; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; face: string; minVault: string; closesAt: Date; cover: string | null; offers: number; saved: boolean; house?: boolean };
const VAULT: Record<string, string> = { "7d": "7 days", "30d": "30 days", "1y": "1 year", forever: "Forever" };
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

function left(d: Date, now: number) { const h = (new Date(d).getTime() - now) / 3600_000; return h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)} days`; }

export default function Feed({ items, tab, sell, frost }: { items: Item[]; tab: string; sell: boolean; frost: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState(false);
  const [now] = useState(() => Date.now());
  const [saved, setSaved] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, i.saved])));
  const step = (d: number) => ref.current?.scrollBy({ top: d * ref.current.clientHeight, behavior: "smooth" });
  const tabs: [string, string][] = [["for-you", "For you"], ["new", "New"], ["ending", "Ending soon"]];

  return (
    <div className="feedwrap">
      <div className="feed" id="feed" ref={ref}>
        {items.length === 0 ? <section className="fi"><div className="card empty" style={{ maxWidth: 420 }}><b className="t-h3">Nothing here right now</b><p className="muted t-sm">New requests appear all day. Post your own and creators come to you.</p><Link className="btn btn-primary" href="/post">Post a request</Link></div></section> : null}
        {items.map((r) => (
          <section className="fi" key={r.id}>
            <article className={"fcard media" + (peek ? " revealed" : "")}>
              {r.cover ? <><img className="cimg" src={`/img/${r.cover}.webp`} alt="" /><span className="cscrim" />{frost ? <span className="frost" aria-hidden="true" /> : null}</> : <span className="neutralbg" />}
              <div className="top"><span className={"fpill" + ((new Date(r.closesAt).getTime() - now) / 3600_000 <= 6 ? " hot" : "")}><Ico n="clock" />Closes in {left(r.closesAt, now)}</span></div>
              <div className="mid">
                <div className="fhead"><span className="eyb">{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)}</span><div className="t">{r.title}</div>
                  <div className="fmeta"><span>{r.who}, {r.ageMin} to {r.ageMax}</span><span>{r.face === "not_needed" ? "No face" : r.face === "optional" ? "Face optional" : "Face required"}</span><span>Vault {VAULT[r.minVault]}</span></div>{r.house ? <div className="by-brq" style={{ color: "rgba(255,255,255,.75)" }}>by ByRequest</div> : null}</div>
                <div className="fdeal"><div className="fearn"><span className="lbl">You earn</span><b className="num">{euros(Math.round(r.dealCents * CREATOR_SHARE))}</b></div>
                  <Link className="btn btn-white fgo" href={`/requests/${r.id}${sell ? "#offer" : ""}`}>Make an offer<Ico n="right" c="sm" /></Link></div>
              </div>
            </article>
            <div className="frail">
              {frost ? <button onClick={() => setPeek((p) => !p)} className={peek ? "is-on" : ""} aria-label="Peek at the cover"><span className="c"><Ico n="eye" /></span><span className="l">{peek ? "Hide" : "Peek"}</span></button> : null}
              <button className={saved[r.id] ? "is-on" : ""} aria-label="Save" onClick={async () => { const on = await toggleSave(r.id); setSaved((s) => ({ ...s, [r.id]: on })); toast(on ? "Saved" : "Removed from saved"); }}><span className="c"><Ico n="bookmark" /></span><span className="l">{saved[r.id] ? "Saved" : "Save"}</span></button>
              {!sell ? <Link href={`/post?c=${r.category}&amount=${r.amount}&budget=${Math.round(r.dealCents / 100)}&title=${encodeURIComponent(r.title)}`} aria-label="Post a similar request"><span className="c"><Ico n="plus" /></span><span className="l">Similar</span></Link> : null}
              <button aria-label="Offers" onClick={() => toast(`${r.offers} creators already made an offer.`)}><span className="c"><b className="num" style={{ fontSize: ".95rem" }}>{r.offers}</b></span><span className="l">Offers</span></button>
            </div>
          </section>
        ))}
      </div>
      <div className="feedtabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => router.push(k === "for-you" ? "/for-you" : `/for-you?tab=${k}`)}>{l}</button>)}</div>
      <div className="feed-hint"><button className="icon-btn" onClick={() => step(-1)} aria-label="Previous request"><Ico n="up" /></button><button className="icon-btn" onClick={() => step(1)} aria-label="Next request"><Ico n="down" /></button></div>
    </div>
  );
}
