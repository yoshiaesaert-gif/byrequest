"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import type { Tip } from "@/content/tips";

/* A row of tip cards; each opens in a pop up over a glass wall, with arrows to the next tip. */
export default function Tips({ tips, kick, title }: { tips: Tip[]; kick: string; title: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((x) => (x === null ? x : (x + 1) % tips.length));
      if (e.key === "ArrowLeft") setOpen((x) => (x === null ? x : (x - 1 + tips.length) % tips.length));
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, tips.length]);
  const tip = open === null ? null : tips[open];

  return (<section className="h-sec">
    <div className="h-head"><div><span className="h-kick dark">{kick}</span><h2>{title}</h2></div></div>
    <div className="tips">{tips.map((x, i) => (
      <button key={x.k} type="button" className="tip media" onClick={() => setOpen(i)}>
        <img className="cimg" src={`/img/${x.cover}.webp`} alt="" loading="lazy" /><span className="tip-shade" />
        <span className="tip-n num">{String(i + 1).padStart(2, "0")}</span>
        <span className="tip-tx"><b>{x.title}</b><span>{x.sub}</span><em>{t("Read the tips")} →</em></span>
      </button>))}</div>
    {tip ? createPortal(
      <div className="hw-glass" role="dialog" aria-modal="true" aria-label={tip.title} onClick={() => setOpen(null)}>
        <div className="hw-modal tip-modal" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="hw-x" onClick={() => setOpen(null)} aria-label={t("Close")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <div className="tip-stage" key={tip.k}><img src={`/img/${tip.cover}.webp`} alt="" /><span className="tip-shade" /><span className="tip-big"><span className="num">{String(open! + 1).padStart(2, "0")}</span><b>{tip.title}</b><span>{tip.sub}</span></span></div>
          <div className="hw-copy tip-copy" key={tip.k + "c"}>
            <span className="hw-step num">{kick}</span>
            <h2>{tip.title}</h2>
            <ol className="tip-list">{tip.points.map((p, i) => <li key={i} style={{ animationDelay: `${0.05 + i * 0.07}s` }}><span className="num">{i + 1}</span><p>{p}</p></li>)}</ol>
            <div className="hw-nav">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen((open! - 1 + tips.length) % tips.length)}>← {t("Previous")}</button>
              <button type="button" className="btn btn-primary" onClick={() => setOpen((open! + 1) % tips.length)}>{t("Next tip")} →</button>
            </div>
          </div>
        </div>
      </div>, document.body) : null}
  </section>);
}
