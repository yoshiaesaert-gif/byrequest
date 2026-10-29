"use client";
import { useRef, useState } from "react";

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
export function Chg({ a, b, invert, suffix }: { a: number; b: number; invert?: boolean; suffix?: string }) {
  const p = pct(a, b);
  if (p === null) return <span className="dz-chg flat">{a ? "new" : "–"}{suffix ? <em>{suffix}</em> : null}</span>;
  const good = invert ? p < 0 : p > 0;
  return <span className={"dz-chg " + (p === 0 ? "flat" : (good ? "good" : "bad") + (p > 0 ? " rise" : " fall"))}>{p > 0 ? "+" : ""}{p}%{suffix ? <em>{suffix}</em> : null}</span>;
}

/* Visits so far today, hour by hour, against yesterday and the same weekday last week. */
export function DayRace({ today, yesterday, lastWeek, hour }: { today: number[]; yesterday: number[]; lastWeek: number[]; hour: number }) {
  const cum = (a: number[]) => a.reduce<number[]>((o, v, i) => (o.push((o[i - 1] ?? 0) + v), o), []);
  const T = cum(today).slice(0, hour + 1), Y = cum(yesterday), L = cum(lastWeek);
  const W = 760, H = 240, P = { l: 36, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...Y, ...L, ...T); const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => P.l + (i / 23) * (W - P.l - P.r), y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line(T)} L${x(T.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const [i, setI] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const move = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setI(Math.max(0, Math.min(23, Math.round(((px - P.l) / (W - P.l - P.r)) * 23)))); };
  const k = i ?? Math.min(hour, 23);
  return (<div className="dz-race">
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerLeave={() => setI(null)} role="img" aria-label="Visits so far today compared with yesterday and last week">
      <defs><linearGradient id="dzfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4434E6" stopOpacity=".16" /><stop offset="100%" stopColor="#4434E6" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((g) => <g key={g}><line x1={P.l} x2={W - P.r} y1={y((nice / 4) * g)} y2={y((nice / 4) * g)} className="dz-gl" /><text x={P.l - 8} y={y((nice / 4) * g) + 4} textAnchor="end" className="dz-ax">{(nice / 4) * g}</text></g>)}
      {[0, 6, 12, 18, 23].map((h) => <text key={h} x={x(h)} y={H - 6} textAnchor={h === 0 ? "start" : h === 23 ? "end" : "middle"} className="dz-ax">{String(h).padStart(2, "0")}:00</text>)}
      <path d={line(L)} className="dz-l lw" /><path d={line(Y)} className="dz-l yd" /><path d={area} fill="url(#dzfill)" /><path d={line(T)} className="dz-l td" />
      <circle cx={x(T.length - 1)} cy={y(T[T.length - 1] ?? 0)} r="4" className="dz-now" />
      {i !== null ? <g><line x1={x(k)} x2={x(k)} y1={P.t} y2={H - P.b} className="dz-cross" />{k < T.length ? <circle cx={x(k)} cy={y(T[k])} r="4.5" className="dz-dot td" /> : null}<circle cx={x(k)} cy={y(Y[k])} r="4" className="dz-dot yd" /><circle cx={x(k)} cy={y(L[k])} r="4" className="dz-dot lw" /></g> : null}
    </svg>
    {i !== null ? <div className="dz-tip" style={{ left: `${(x(k) / W) * 100}%` }}><b>Until {String(k).padStart(2, "0")}:59</b>
      <div><i className="td" />Today<span>{k < T.length ? T[k] : "–"}</span></div>
      <div><i className="yd" />Yesterday<span>{Y[k]}{k < T.length ? <Chg a={T[k]} b={Y[k]} /> : null}</span></div>
      <div><i className="lw" />Last week<span>{L[k]}{k < T.length ? <Chg a={T[k]} b={L[k]} /> : null}</span></div></div> : null}
    <div className="dz-leg"><span><i className="td" />Today</span><span><i className="yd" />Yesterday</span><span><i className="lw" />Same day last week</span></div>
  </div>);
}

/* Small trend line for a tile, with the value of the day under the cursor. */
const FMT = { n: (v: number) => String(v), dur: (v: number) => (v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${String(v % 60).padStart(2, "0")}s`), pct: (v: number) => `${Math.round(v * 100)}%` };
export function Spark({ data, kind = "n" }: { data: { d: string; v: number }[]; kind?: keyof typeof FMT }) {
  const fmt = FMT[kind];
  const W = 160, H = 40; const max = Math.max(1, ...data.map((p) => p.v));
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * W, y = (v: number) => H - 3 - (v / max) * (H - 8);
  const [i, setI] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const d = data.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  return (<div className="dz-spark"><svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onPointerMove={(e) => { const r = ref.current!.getBoundingClientRect(); setI(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1))))); }} onPointerLeave={() => setI(null)}>
    <path d={d} fill="none" stroke="#4434E6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{i !== null ? <circle cx={x(i)} cy={y(data[i].v)} r="2.5" fill="#4434E6" /> : null}</svg>
    <span className="dz-spark-l">{i !== null ? `${data[i].d.slice(8)}/${data[i].d.slice(5, 7)} · ${fmt(data[i].v)}` : "30 days"}</span></div>);
}

/* Thirty days of visitors, every bar opens its day. */
export function Days({ rows, signups }: { rows: { d: string; v: number; u: number; p: number; s: number; b: number; r: number }[]; signups: Record<string, number> }) {
  const max = Math.max(1, ...rows.map((r) => r.u)); const nice = Math.ceil(max / 4) * 4 || 4;
  const [i, setI] = useState<number | null>(null);
  const r = i !== null ? rows[i] : null;
  const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return (<div className="dz-days" onPointerLeave={() => setI(null)}>
    <div className="dz-days-ax">{[4, 3, 2, 1, 0].map((g) => <span key={g}>{(nice / 4) * g}</span>)}</div>
    <div className="dz-days-plot">{[0, 1, 2, 3, 4].map((g) => <i key={g} className="dz-days-gl" style={{ bottom: `${g * 25}%` }} />)}
      {rows.map((x, k) => <button type="button" key={x.d} className={"dz-bar" + (k === rows.length - 1 ? " today" : "") + (i === k ? " on" : "")} onPointerEnter={() => setI(k)} onFocus={() => setI(k)} aria-label={`${day(x.d)}: ${x.u} visitors`}><i style={{ height: `${(x.u / nice) * 100}%` }} /></button>)}
      {r ? <div className="dz-tip" style={{ left: `${((i! + 0.5) / rows.length) * 100}%` }}><b>{day(r.d)}</b><div>Visitors<span>{r.u}</span></div><div>Visits<span>{r.v}</span></div><div>Page views<span>{r.p}</span></div><div>Avg time<span>{r.s < 60 ? `${r.s}s` : `${Math.floor(r.s / 60)}m ${r.s % 60}s`}</span></div><div>Bounce<span>{Math.round(r.b * 100)}%</span></div><div>Via invite<span>{r.r}</span></div><div>New accounts<span>{signups[r.d] ?? 0}</span></div></div> : null}
    </div>
    <div className="dz-days-x"><span>{day(rows[0].d)}</span><span>{day(rows[Math.floor(rows.length / 2)].d)}</span><span>Today</span></div>
  </div>);
}
