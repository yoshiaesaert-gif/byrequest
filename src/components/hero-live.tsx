"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroReq = { id: string; title: string; cover: string | null; amount: number; unit: string; earn: string; ages: string; left: string; unitLabel?: string; earnLabel?: string; offerWord?: string; offersWord?: string };
export type HeroOffer = { handle: string; look: string | null; rating: string | null; note: string };

/* Replays the real offers on one open request: they arrive one by one, the counter follows, then it starts over. */
export default function HeroLive({ req, offers }: { req: HeroReq; offers: HeroOffer[] }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still && n === offers.length) return;
    const t = setTimeout(() => setN((x) => (still ? offers.length : x >= offers.length + 2 ? 0 : x + 1)), still ? 0 : n === 0 ? 900 : 2200);
    return () => clearTimeout(t);
  }, [n, offers.length]);
  const shown = Math.min(n, offers.length);
  const list = offers.slice(0, shown).reverse().slice(0, 3);

  return (
    <div className="hl" aria-hidden="true"><div className="hl-in">
      <Link href={`/requests/${req.id}`} className="hl-card" tabIndex={-1}>
        {req.cover ? <img className="hl-img" src={`/img/${req.cover}.webp`} alt="" /> : null}
        <span className="hl-shade" />
        <div className="hl-top"><span>{req.ages}</span><span>{req.left}</span></div>
        <div className="hl-bot">
          <b className="num">{req.amount}<small>{req.unitLabel ?? req.unit}</small></b>
          <div className="hl-t">{req.title}</div>
          <div className="hl-earn"><span>{req.earnLabel ?? "Earn"}</span><em className="num">{req.earn}</em></div>
        </div>
        {offers.length ? <span className={"hl-count" + (shown ? " on" : "")} key={shown}>{shown} {shown === 1 ? req.offerWord ?? "offer" : req.offersWord ?? "offers"}</span> : null}
      </Link>
      <div className="hl-feed">{list.map((o, i) => (
        <div key={o.handle} className="hl-of" style={{ ["--i" as string]: i }}>
          {o.look ? <img src={o.look} alt="" /> : <span className="hl-av">{o.handle[0].toUpperCase()}</span>}
          <div><b>{o.handle}</b><span>{o.note}</span></div>
          {o.rating ? <i>★ {o.rating}</i> : null}
        </div>))}</div>
    </div></div>
  );
}
