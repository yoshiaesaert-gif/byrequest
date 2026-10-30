"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";

type Pt = { k: string; deals: number; tips: number; invites: number; total: number };
type Line = { id: string; at: string; kind: "deal" | "tip" | "invite"; title: string; category: string | null; buyer: string | null; dealCents: number; feeCents: number; cents: number; dealId: string | null };
const eur = (c: number) => "€" + (c / 100).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (c: number) => (c >= 100000 ? "€" + (c / 100000).toFixed(c >= 1000000 ? 0 : 1) + "k" : "€" + Math.round(c / 100));

function label(k: string, unit: string, long = false) {
  if (unit === "month") { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-GB", long ? { month: "long", year: "numeric" } : { month: "short" }); }
  const d = new Date(k + "T12:00:00");
  return unit === "week" ? (long ? "Week of " : "") + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : d.toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });
}

/* Stacked bars: deals, tips and invites per day, week or month, with a hover card. */
export function EarnChart({ points, unit }: { points: Pt[]; unit: string }) {
  const t = useT();
  const [i, setI] = useState<number | null>(null);
  const W = 960, H = 260, P = { l: 52, r: 8, t: 14, b: 28 };
  const max = Math.max(100, ...points.map((p) => p.total));
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const nice = Math.ceil(max / 4 / step) * step * 4;
  const n = points.length, bw = (W - P.l - P.r) / Math.max(1, n), gap = Math.min(6, bw * 0.25);
  const y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const every = Math.ceil(n / 8);
  const p = i === null ? null : points[i];
  return (<div className="ea-chart" onMouseLeave={() => setI(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Earnings over time")}>
      {[0, 1, 2, 3, 4].map((g) => <g key={g}><line x1={P.l} x2={W - P.r} y1={y((nice / 4) * g)} y2={y((nice / 4) * g)} className="ea-gl" /><text x={P.l - 8} y={y((nice / 4) * g) + 4} textAnchor="end" className="ea-ax">{short((nice / 4) * g)}</text></g>)}
      {points.map((pt, k) => {
        const x = P.l + k * bw + gap / 2, w = Math.max(1, bw - gap);
        const segs: [string, number][] = [["s-deals", pt.deals], ["s-tips", pt.tips], ["s-invites", pt.invites]];
        let base = 0;
        return (<g key={pt.k} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} tabIndex={0}>
          <rect x={P.l + k * bw} y={P.t} width={bw} height={H - P.t - P.b} fill="transparent" />
          {segs.map(([c, v], j) => { if (!v) return null; const y0 = y(base), y1 = y(base + v); base += v; const top = base === pt.total; return <rect key={j} x={x} y={y1} width={w} height={Math.max(1, y0 - y1 - (top ? 0 : 1))} rx={top ? Math.min(4, w / 2) : 0} className={c + (i !== null && i !== k ? " dim" : "")} />; })}
          {k % every === 0 ? <text x={x + w / 2} y={H - 8} textAnchor="middle" className="ea-ax">{label(pt.k, unit)}</text> : null}
        </g>);
      })}
    </svg>
    {p ? <div className="ea-tip" style={{ left: `${((P.l + (i! + 0.5) * bw) / W) * 100}%` }}>
      <b>{label(p.k, unit, true)}</b>
      <div><i className="s-deals" />{t("Deals")}<span>{eur(p.deals)}</span></div>
      <div><i className="s-tips" />{t("Tips")}<span>{eur(p.tips)}</span></div>
      {p.invites ? <div><i className="s-invites" />{t("Invites")}<span>{eur(p.invites)}</span></div> : null}
      <div className="tot">{t("Total")}<span>{eur(p.total)}</span></div>
    </div> : null}
  </div>);
}

/* Every line of income in the period: searchable, filterable, newest first. */
export function Ledger({ lines }: { lines: Line[] }) {
  const t = useT();
  const [q, setQ] = useState(""); const [k, setK] = useState<"all" | Line["kind"]>("all"); const [more, setMore] = useState(25);
  const list = useMemo(() => { const n = q.trim().toLowerCase(); return lines.filter((l) => (k === "all" || l.kind === k) && (!n || `${l.title} ${l.buyer ?? ""}`.toLowerCase().includes(n))); }, [lines, q, k]);
  const total = list.reduce((a, l) => a + l.cents, 0);
  const KIND = { deal: t("Deal"), tip: t("Tip"), invite: t("Invite") };
  return (<section className="ea-card ea-led">
    <div className="ea-ch"><div><h2>{t("Transactions")}</h2><p>{t("{n} lines in this period", { n: lines.length })}</p></div>
      <div className="ea-lf"><label className="pl-search"><svg className="ico sm" aria-hidden="true"><use href="#i-search" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search request or buyer")} /></label>
        <div className="pl-seg">{(["all", "deal", "tip", "invite"] as const).map((x) => <button key={x} className={k === x ? "on" : ""} onClick={() => setK(x)}>{x === "all" ? t("All") : KIND[x]}</button>)}</div></div></div>
    {list.length ? <div className="ea-tbl" role="table">
      <div className="ea-tr ea-th" role="row"><span>{t("Date")}</span><span>{t("Description")}</span><span>{t("Type")}</span><span className="r">{t("You earned")}</span></div>
      {list.slice(0, more).map((l) => <div key={l.id} className="ea-tr" role="row">
        <span className="ea-dt">{new Date(l.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span className="ea-ds">{l.dealId && l.kind !== "invite" ? <Link href={`/deals/${l.dealId}`}>{l.title}</Link> : t(l.title)}{l.buyer ? <small>{l.buyer}</small> : null}</span>
        <span><em className={"ea-kind k-" + l.kind}>{KIND[l.kind]}</em></span>
        <b className="num r">{eur(l.cents)}</b>
      </div>)}
      <div className="ea-tr ea-tf" role="row"><span /><span>{t("Total of {n} lines", { n: list.length })}</span><span /><b className="num r">{eur(total)}</b></div>
    </div> : <p className="ea-empty">{lines.length ? t("Nothing matches.") : t("No income in this period yet.")}</p>}
    {list.length > more ? <button className="btn btn-secondary btn-sm ea-more" onClick={() => setMore((m) => m + 50)}>{t("Show more")}</button> : null}
  </section>);
}

/* Download the period as a spreadsheet or a designed PDF statement. */
export function ExportMenu({ period }: { period: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", d); return () => document.removeEventListener("mousedown", d);
  }, [open]);
  return (<div className="ea-x" ref={ref}>
    <button className="btn btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}><svg className="ico sm" aria-hidden="true"><use href="#i-down" /></svg>{t("Export")}</button>
    {open ? <div className="ea-xm" role="menu" onClick={() => setOpen(false)}>
      <a role="menuitem" href={`/api/earnings/export?p=${period}&f=pdf`}><b>{t("PDF statement")}</b><span>{t("A designed overview to keep or share")}</span></a>
      <a role="menuitem" href={`/api/earnings/export?p=${period}&f=xlsx`}><b>{t("Excel")}</b><span>{t("Every line, ready for your bookkeeping")}</span></a>
    </div> : null}
  </div>);
}
