"use client";
import { useState, useTransition } from "react";
import type { IdRecord } from "@/server/idrecord";
import { showId } from "./actions";

/* Admins only: the details the ID partner read, loaded on request and never stored by us. */
export default function IdPanel({ userId }: { userId: string }) {
  const [p, start] = useTransition();
  const [recs, setRecs] = useState<IdRecord[] | null>(null);
  const [err, setErr] = useState("");
  const row = (k: string, v: unknown) => (v === undefined || v === null || v === "" ? null : <div key={k}><dt>{k}</dt><dd>{typeof v === "boolean" ? (v ? "yes" : "no") : String(v)}</dd></div>);
  const pct = (n?: number) => (typeof n === "number" ? `${Math.round(n)}%` : undefined);
  return (<section className="idp">
    <div className="idp-h"><h2 className="bo-sh">ID details <span className="idp-lock">admin only · every look is logged</span></h2>
      {!recs ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => { const r = await showId(userId); if (r.ok) setRecs(r.records); else setErr(r.error); })}>{p ? "Loading…" : "Show ID details"}</button>
        : <button className="btn btn-secondary btn-sm" onClick={() => setRecs(null)}>Hide</button>}</div>
    {err ? <p className="muted t-sm">{err}</p> : null}
    {recs?.map((r, i) => (<div key={i} className="idp-r">
      <p className="idp-meta"><b>{r.purpose === "buyer_age" ? "Age check" : "Creator ID check"}</b> · {new Date(r.when).toLocaleString("nl-BE", { timeZone: "Europe/Brussels" })} · {r.status}</p>
      <div className="idp-grid">
        <dl><h3>Person</h3>{row("Full name", r.person.name)}{row("Date of birth", r.person.birth)}{row("Age", r.person.age)}{row("Gender", r.person.gender)}{row("Nationality", r.person.nationality)}{row("Place of birth", r.person.birthplace)}</dl>
        <dl><h3>Document</h3>{row("Type", r.doc.type)}{row("Number", r.doc.number)}{row("Country", r.doc.country)}{row("Issued", r.doc.issued)}{row("Expires", r.doc.expires)}</dl>
        <dl><h3>Checks</h3>{row("Face match", pct(r.checks.faceMatch))}{row("Liveness", pct(r.checks.liveness))}{row("Estimated age from selfie", r.checks.estimatedAge ? Math.round(r.checks.estimatedAge) : undefined)}{row("Same face in other checks", r.checks.sameFaceElsewhere)}{row("Warnings", r.checks.warnings.join(" · ") || "none")}</dl>
        <dl><h3>Network at the check</h3>{row("Place", [r.network.city, r.network.country].filter(Boolean).join(", "))}{row("Provider", r.network.isp)}{row("VPN or Tor", r.network.vpn)}{row("Data centre", r.network.dataCenter)}{row("Device", r.network.device)}</dl>
      </div>
      {r.images.length ? <div className="idp-imgs">{r.images.map((m) => <figure key={m.label}><img src={m.url} alt={m.label} referrerPolicy="no-referrer" /><figcaption>{m.label}</figcaption></figure>)}</div> : null}
    </div>))}
    {recs ? <p className="t-xs muted">Fetched live from the ID partner and not stored by ByRequest. Image links expire after a short time; reload to see them again.</p> : null}
  </section>);
}
