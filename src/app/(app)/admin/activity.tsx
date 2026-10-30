"use client";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Chg, DayRace, Spark } from "./visitors/charts";

type Row = { d: string; v: number };
export type MetricData = { k: string; label: string; hint: string; today: number; yday: number; lweek: number; w7: number; p7: number; daily: Row[]; hToday: number[]; hYesterday: number[]; hLastWeek: number[]; more?: string };
const day = (d: string, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", o);

/* Pick a metric in the tiles; the charts below follow it. */
export function ActivityBoard({ metrics, hour }: { metrics: MetricData[]; hour: number }) {
  const [m, setM] = useState(0);
  const [view, setView] = useState<"today" | "month">("today");
  const s = metrics[m];
  return (<>
    <div className="ax-tiles" role="tablist" aria-label="Metric">{metrics.map((x, k) => (
      <button key={x.k} type="button" role="tab" aria-selected={k === m} className={"dz-card ax-tile" + (k === m ? " on" : "")} onClick={() => setM(k)}>
        <span className="ax-tl"><span className="dz-lbl">{x.label}</span>{x.more ? <Link href={x.more} className="ax-more" onClick={(e) => e.stopPropagation()}>See who</Link> : null}</span>
        <span className="ax-tv"><b className="num">{x.today}</b><small>today · {x.hint}</small></span>
        <span className="ax-tc"><Chg a={x.today} b={x.yday} suffix=" vs yesterday" /><Chg a={x.today} b={x.lweek} suffix=" vs last week" /></span>
        <span className="ax-w"><span>Last 7 days <b className="num">{x.w7}</b></span><Chg a={x.w7} b={x.p7} suffix=" w/w" /></span>
        <Spark data={x.daily} />
      </button>))}</div>
    <section className="dz-card ax-chart">
      <div className="ax-ch"><div><h3>{s.label}</h3><span>{view === "today" ? "So far today, cumulative per hour, against yesterday and the same day last week" : "Per day over the last 30 days, against the same weekday a week before"}</span></div>
        <div className="ax-seg" role="tablist"><button type="button" role="tab" aria-selected={view === "today"} className={view === "today" ? "on" : ""} onClick={() => setView("today")}>Today</button><button type="button" role="tab" aria-selected={view === "month"} className={view === "month" ? "on" : ""} onClick={() => setView("month")}>30 days</button></div></div>
      {view === "today" ? <DayRace today={s.hToday} yesterday={s.hYesterday} lastWeek={s.hLastWeek} hour={hour} /> : <Month rows={s.daily} label={s.label} />}
    </section>
  </>);
}

/* Thirty days as an area line with a crosshair; the tooltip compares with the same weekday a week before. */
function Month({ rows, label }: { rows: Row[]; label: string }) {
  const W = 760, H = 240, P = { l: 36, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...rows.map((r) => r.v)); const nice = Math.ceil(max / 4) * 4;
  const n = rows.length - 1;
  const x = (i: number) => P.l + (i / n) * (W - P.l - P.r), y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(r.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const avg = rows.slice(0, -1).reduce((a, r) => a + r.v, 0) / Math.max(1, n);
  const [i, setI] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const move = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setI(Math.max(0, Math.min(n, Math.round(((px - P.l) / (W - P.l - P.r)) * n)))); };
  const k = i ?? n;
  return (<div className="dz-race">
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerLeave={() => setI(null)} role="img" aria-label={`${label} per day, last 30 days`}>
      <defs><linearGradient id="axfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4434E6" stopOpacity=".18" /><stop offset="100%" stopColor="#4434E6" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((g) => <g key={g}><line x1={P.l} x2={W - P.r} y1={y((nice / 4) * g)} y2={y((nice / 4) * g)} className="dz-gl" /><text x={P.l - 8} y={y((nice / 4) * g) + 4} textAnchor="end" className="dz-ax">{(nice / 4) * g}</text></g>)}
      {[0, 7, 14, 21, n].map((d) => <text key={d} x={x(d)} y={H - 6} textAnchor={d === 0 ? "start" : d === n ? "end" : "middle"} className="dz-ax">{d === n ? "Today" : day(rows[d].d, { day: "numeric", month: "short" })}</text>)}
      <line x1={P.l} x2={W - P.r} y1={y(avg)} y2={y(avg)} className="ax-avgl" />
      <path d={area} fill="url(#axfill)" /><path d={line} className="dz-l td" />
      <circle cx={x(n)} cy={y(rows[n].v)} r="4" className="dz-now" />
      {i !== null ? <g><line x1={x(k)} x2={x(k)} y1={P.t} y2={H - P.b} className="dz-cross" /><circle cx={x(k)} cy={y(rows[k].v)} r="4.5" className="dz-dot td" />{k >= 7 ? <circle cx={x(k - 7)} cy={y(rows[k - 7].v)} r="3.5" className="dz-dot lw" /> : null}</g> : null}
    </svg>
    {i !== null ? <div className="dz-tip" style={{ left: `${(x(k) / W) * 100}%` }}><b>{day(rows[k].d, { weekday: "long", day: "numeric", month: "long" })}</b>
      <div><i className="td" />{label}<span>{rows[k].v}</span></div>
      {k >= 7 ? <div><i className="lw" />A week before<span>{rows[k - 7].v}<Chg a={rows[k].v} b={rows[k - 7].v} /></span></div> : null}
      <div><i className="avg" />30 day average<span>{avg.toFixed(1)}</span></div></div> : null}
    <div className="dz-leg"><span><i className="td" />{label}</span><span><i className="lw" />Same weekday a week before</span><span><i className="avg" />Average</span></div>
  </div>);
}

/* What outside people did lately, grouped by day, with a time that stays current. */
type Ev = { at: string; kind: string; who: string; uid: string; what: string | null };
const KIND: Record<string, [string, string]> = { signup: ["user", "created an account"], request: ["plus", "posted a request"], offer: ["deals", "applied for"], message: ["inbox", "sent a message"] };
const noop = () => () => {};
export function Feed({ items }: { items: Ev[] }) {
  const now = useSyncExternalStore(noop, () => Date.now(), () => 0);
  if (!items.length) return <p className="dz-empty">Nothing from outside yet</p>;
  const rel = (iso: string) => { if (!now) return ""; const m = Math.round((now - new Date(iso).getTime()) / 60000); return m < 1 ? "now" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  const group = (iso: string) => { const d = new Date(iso).toDateString(); return d === new Date().toDateString() ? "Today" : d === new Date(Date.now() - 86400_000).toDateString() ? "Yesterday" : "Earlier"; };
  const out: React.ReactNode[] = []; let g = "";
  items.forEach((f, n) => {
    const h = now ? group(f.at) : "";
    if (h && h !== g) { g = h; out.push(<li key={"g" + n} className="ax-fg">{h}</li>); }
    const [ico, verb] = KIND[f.kind] ?? ["spark", f.kind];
    out.push(<li key={n} className="ax-fi"><span className={"ax-fic k-" + f.kind}><svg className="ico sm" aria-hidden="true"><use href={`#i-${ico}`} /></svg></span>
      <span className="ax-ft"><span><Link href={`/admin/users/${f.uid}`}>{f.who}</Link> {verb}</span>{f.what ? <em>{f.what}</em> : null}</span><time>{rel(f.at)}</time></li>);
  });
  return <ol className="ax-fl">{out}</ol>;
}
