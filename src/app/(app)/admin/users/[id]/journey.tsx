"use client";
import Link from "next/link";
import { useState } from "react";
import type { Session, Step } from "@/server/journey";

/* The account's journey for staff: one card per visit, newest first, every page, click and action in order.
   A filter shows only what matters right now. */
type Filter = "all" | "page" | "click" | "action";
const TZ = "Europe/Brussels";
const time = (d: Date) => new Date(d).toLocaleTimeString("nl-BE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
const day = (d: Date) => new Date(d).toLocaleDateString("nl-BE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const dur = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
const KIND: Record<Step["kind"], string> = { page: "Page", click: "Click", action: "Action", signup: "Sign up" };

export default function Journey({ sessions, summary }: { sessions: Session[]; summary: { firstSeen: Date; lastSeen: Date | null; visits: number; pages: number; clicks: number; totalSec: number; online: boolean; actions: number } }) {
  const [f, setF] = useState<Filter>("all");
  const show = (s: Step) => f === "all" || s.kind === f || (f === "action" && s.kind === "signup");
  return (<section className="jr">
    <div className="jr-h">
      <h2 className="bo-sh">Journey on the site{summary.online ? <span className="jr-live">online now</span> : null}</h2>
      <div className="jr-f" role="tablist">{(["all", "page", "click", "action"] as Filter[]).map((k) => (
        <button key={k} role="tab" aria-selected={f === k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{k === "all" ? "Everything" : k === "page" ? "Pages" : k === "click" ? "Clicks" : "Actions"}</button>))}</div>
    </div>
    <dl className="jr-sum">
      <div><dt>First seen</dt><dd>{day(summary.firstSeen)} {time(summary.firstSeen).slice(0, 5)}</dd></div>
      <div><dt>Last seen</dt><dd>{summary.lastSeen ? `${day(summary.lastSeen)} ${time(summary.lastSeen).slice(0, 5)}` : "Not tracked"}</dd></div>
      <div><dt>Visits</dt><dd className="num">{summary.visits}</dd></div>
      <div><dt>Time on site</dt><dd className="num">{dur(summary.totalSec)}</dd></div>
      <div><dt>Pages · clicks</dt><dd className="num">{summary.pages} · {summary.clicks}</dd></div>
      <div><dt>Actions</dt><dd className="num">{summary.actions}</dd></div>
    </dl>
    {!sessions.length ? <p className="muted t-sm">No visits recorded yet.</p> : null}
    <div className="jr-list">{sessions.map((s, i) => {
      const steps = s.steps.filter(show);
      const sec = Math.max(0, Math.round((+new Date(s.lastAt) - +new Date(s.startedAt)) / 1000));
      return (<details key={s.id ?? "loose"} className="jr-s" open={i === 0}>
        <summary>
          <span className="jr-when"><b>{day(s.startedAt)}</b>{time(s.startedAt).slice(0, 5)} to {time(s.lastAt).slice(0, 5)}</span>
          <span className="jr-meta">{s.id ? <>{[s.device && s.device[0].toUpperCase() + s.device.slice(1), s.browser && s.os ? `${s.browser} on ${s.os}` : s.browser, [s.city, s.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</> : "Actions outside a tracked visit"}</span>
          <span className="jr-tags">{s.beforeSignup ? <i className="t-pre">before sign up</i> : null}{s.refCode ? <i>invite {s.refCode}</i> : null}{s.referrer ? <i>from {s.referrer}</i> : null}
            {s.id ? <i className="t-n">{dur(sec)} · {s.pages} pages · {s.clicks} clicks</i> : null}</span>
        </summary>
        <ol className="jr-steps">{steps.map((x, j) => (
          <li key={j} className={`k-${x.kind}${x.tone ? ` t-${x.tone}` : ""}`}>
            <time>{time(x.at)}</time><span className="jr-dot" aria-hidden="true" /><em>{KIND[x.kind]}</em>
            <span className="jr-tx">{x.href ? <Link href={x.href}>{x.text}</Link> : x.kind === "click" ? <>“{x.text}”</> : x.text}{x.sub ? <small>{x.sub}</small> : null}</span>
          </li>))}
          {!steps.length ? <li className="jr-none">Nothing of this kind in this visit.</li> : null}</ol>
      </details>);
    })}</div>
  </section>);
}
