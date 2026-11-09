"use client";
import { useState, useTransition } from "react";
import { metricsLinkNew, metricsLinkRevoke } from "../actions";
import { ask } from "@/components/confirm";
import { toast } from "@/components/chrome";

import { currentTz } from "@/lib/tz";
/* The private growth link for GrokBot: numbers only, no names or chats. Shown once when made; renew or revoke anytime. */
export default function MetricsLink({ active, since, by }: { active: boolean; since: string | null; by: string | null }) {
  const [url, setUrl] = useState(""); const [p, start] = useTransition();
  const make = () => start(async () => { const r = await metricsLinkNew(); if (r.url) setUrl(r.url); else toast(r.error ?? "That did not work", "err"); });
  return (<section className="dz-card ml">
    <div className="dz-h"><h3>Growth link for GrokBot</h3><span>Read only · counts per day, landing page and campaign · no names, emails or chats</span></div>
    {url ? <div className="ml-url"><code>{url}</code><button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(url).then(() => toast("Link copied")); }}>Copy</button></div> : null}
    {url ? <p className="t-xs muted">Shown only now. Give it to GrokBot; a new link makes this one stop working.</p> : null}
    <div className="ml-row"><span>{active ? <>Active since {since ? new Date(since).toLocaleString("en-GB", { timeZone: currentTz(), day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "?"}{by ? ` · made by ${by}` : ""}</> : "No link yet"}</span>
      <button className="btn btn-secondary btn-sm" disabled={p} onClick={async () => { if (!active || await ask("The current link stops working right away.", { title: "Make a new link?", ok: "New link" })) make(); }}>{active ? "New link" : "Make link"}</button>
      {active ? <button className="btn btn-ghost btn-sm" disabled={p} onClick={async () => { if (await ask("GrokBot loses access right away.", { title: "Revoke the growth link?", ok: "Revoke", danger: true })) start(async () => { await metricsLinkRevoke(); setUrl(""); toast("Link revoked"); }); }}>Revoke</button> : null}</div>
  </section>);
}
