"use client";
import { useState } from "react";

type Row = { d: string; v: number };
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/* Thirty days of one outside metric at a time; the tabs switch the metric, hover shows the day. */
export function Trend({ series }: { series: { k: string; label: string; total: number; rows: Row[] }[] }) {
  const [m, setM] = useState(0);
  const [i, setI] = useState<number | null>(null);
  const s = series[m]; const rows = s.rows;
  const max = Math.max(1, ...rows.map((r) => r.v)); const nice = Math.ceil(max / 4) * 4 || 4;
  const avg = rows.slice(0, -1).reduce((a, r) => a + r.v, 0) / Math.max(1, rows.length - 1);
  return (<div>
    <div className="ax-tabs" role="tablist">{series.map((x, k) => <button key={x.k} type="button" role="tab" aria-selected={k === m} className={k === m ? "on" : ""} onClick={() => { setM(k); setI(null); }}>{x.label}<b className="num">{x.total}</b></button>)}</div>
    <div className="dz-days" onPointerLeave={() => setI(null)}>
      <div className="dz-days-ax">{[4, 3, 2, 1, 0].map((g) => <span key={g}>{(nice / 4) * g}</span>)}</div>
      <div className="dz-days-plot">{[0, 1, 2, 3, 4].map((g) => <i key={g} className="dz-days-gl" style={{ bottom: `${g * 25}%` }} />)}
        <i className="ax-avg" style={{ bottom: `${(avg / nice) * 100}%` }}><span>avg {avg.toFixed(1)}</span></i>
        {rows.map((x, k) => <button type="button" key={x.d} className={"dz-bar" + (k === rows.length - 1 ? " today" : "") + (i === k ? " on" : "")} onPointerEnter={() => setI(k)} onFocus={() => setI(k)} aria-label={`${day(x.d)}: ${x.v}`}><i style={{ height: `${(x.v / nice) * 100}%` }} /></button>)}
        {i !== null ? <div className="dz-tip" style={{ left: `${((i + 0.5) / rows.length) * 100}%` }}><b>{day(rows[i].d)}</b><div>{s.label}<span>{rows[i].v}</span></div></div> : null}
      </div>
      <div className="dz-days-x"><span>{day(rows[0].d)}</span><span>{day(rows[15].d)}</span><span>Today</span></div>
    </div>
  </div>);
}
