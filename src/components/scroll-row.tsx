"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

/* A horizontal row that shows it can scroll: arrow buttons at the sides, a fade where more cards
   wait, and a thin bar underneath that follows the scroll position. */
export default function ScrollRow({ className, children }: { className: string; children: React.ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ start: true, end: false, pos: 0, size: 1 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const on = () => { const max = el.scrollWidth - el.clientWidth; setS({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8, pos: max > 0 ? el.scrollLeft / max : 0, size: Math.min(1, el.clientWidth / el.scrollWidth) }); };
    on(); el.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { el.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const go = (dir: number) => { const el = ref.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" }); };
  return (<div className={"srow" + (s.start ? " at-start" : "") + (s.end ? " at-end" : "")}>
    <div ref={ref} className={className}>{children}</div>
    <button type="button" className="srow-btn prev" onClick={() => go(-1)} aria-label={t("Previous")} tabIndex={s.start ? -1 : 0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" /></svg></button>
    <button type="button" className="srow-btn next" onClick={() => go(1)} aria-label={t("Next")} tabIndex={s.end ? -1 : 0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5" /></svg></button>
    {s.size < 1 ? <div className="srow-bar" aria-hidden="true"><i style={{ width: `${s.size * 100}%`, left: `${s.pos * (1 - s.size) * 100}%` }} /></div> : null}
  </div>);
}
