"use client";
import Link from "next/link";
import { useState } from "react";

/* How the help assistant is rated: average, share of 4 and 5 stars, the spread, and every rating with its conversation. */
type R = { id: string; stars: number; comment: string | null; handle: string | null; userId: string | null; role: string | null; filed: boolean; conversation: string | null; at: string };
export default function Csat({ s }: { s: { n: number; avg: number; csat: number; prevAvg: number; prevN: number; dist: { s: number; n: number }[]; recent: R[] } }) {
  const [open, setOpen] = useState(false);
  const max = Math.max(1, ...s.dist.map((d) => d.n));
  const diff = s.prevN ? s.avg - s.prevAvg : null;
  return (<section className="csat">
    <div className="csat-k"><span>Help rating, 30 days</span><b>{s.n ? s.avg.toFixed(1) : "–"}<i>★</i></b><small>{s.n} rating{s.n === 1 ? "" : "s"}{diff !== null ? ` · ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} vs 30 days before` : ""}</small></div>
    <div className="csat-k"><span>Satisfied (4 or 5 stars)</span><b>{s.n ? `${s.csat}%` : "–"}</b><small>The usual CSAT score</small></div>
    <div className="csat-d">{s.dist.map((d) => <div key={d.s}><span>{d.s}★</span><i><b style={{ width: `${(d.n / max) * 100}%` }} /></i><em>{d.n}</em></div>)}</div>
    <button className="pl-chip" onClick={() => setOpen((v) => !v)}>{open ? "Hide ratings" : "All ratings"}</button>
    {open ? <div className="csat-list">{s.recent.map((r) => (<details key={r.id} className="csat-r"><summary>
      <span className="csat-st">{"★".repeat(r.stars)}<em>{"★".repeat(5 - r.stars)}</em></span>
      <span>{r.userId ? <Link href={`/admin/users/${r.userId}`}>{r.handle}</Link> : "Deleted account"}<small>{r.role ?? ""}{r.filed ? " · passed to the team" : ""}</small></span>
      <span className="csat-c">{r.comment ?? <span className="muted">No comment</span>}</span>
      <time>{new Date(r.at).toLocaleString("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></summary>
      {r.conversation ? <code>{r.conversation}</code> : null}</details>))}
      {!s.recent.length ? <p className="muted t-sm">No ratings yet.</p> : null}</div> : null}
  </section>);
}
