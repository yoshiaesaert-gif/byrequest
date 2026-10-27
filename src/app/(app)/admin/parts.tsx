"use client";
import { useState, useTransition } from "react";
import { reviewD, reviewA, decide, requestInfo, restrict, answer, reveal, removal, block, staffRole, handleR, supportOrg } from "./actions";
import { toast } from "@/components/chrome";

const say = (r: { ok: boolean; error?: string }, ok = "Done") => toast(r.ok ? ok : r.error ?? "Failed", r.ok ? "ok" : "err");

export function DeliveryReview({ id }: { id: string }) {
  const [note, setNote] = useState(""); const [p, start] = useTransition();
  return <div className="upbox"><input className="input" placeholder="Reviewer note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
    <div className="optrow"><button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(async () => say(await reviewD(id, "approved", note), "Approved"))}>Approve content</button>
      <button className="btn btn-secondary btn-sm" disabled={p || note.length < 5} onClick={() => start(async () => say(await reviewD(id, "rejected", note), "Rejected"))}>Reject</button></div></div>;
}
export function AlbumReview({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <div className="optrow"><button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(async () => say(await reviewA(id, "approved"), "Approved"))}>Approve</button><button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await reviewA(id, "rejected"), "Rejected"))}>Reject</button></div>;
}
export function DisputeDecide({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <div className="optrow" style={{ marginTop: 10 }}><button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await decide(id, "upheld"), "Buyer refunded, creator flagged for review"))}>Buyer is right</button><button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await decide(id, "rejected"), "Creator paid, buyer flagged for review"))}>Delivery matches</button></div>;
}
export function RemovalHandle({ id }: { id: string }) {
  const [dl, setDl] = useState(""); const [p, start] = useTransition();
  return <div className="optrow"><input className="input" style={{ maxWidth: 280 }} placeholder="Delivery id to hide (optional)" value={dl} onChange={(e) => setDl(e.target.value)} />
    <button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(async () => say(await removal(id, "content_hidden", dl || undefined), "Hidden"))}>Hide content</button>
    <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await removal(id, "resolved")))}>Resolved</button>
    <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await removal(id, "rejected")))}>Not applicable</button></div>;
}
export function CreatorActions({ userId }: { userId: string }) {
  const [area, setArea] = useState<"identity" | "payout" | "agreement">("identity");
  const [msg, setMsg] = useState(""); const [level, setLevel] = useState<"none" | "restricted" | "suspended">("restricted"); const [why, setWhy] = useState(""); const [purpose, setPurpose] = useState("");
  const [shown, setShown] = useState<string | null>(null); const [p, start] = useTransition();
  return (<div className="upbox">
    <b>Ask for more information</b>
    <div className="optrow"><select className="select" style={{ width: "auto" }} value={area} onChange={(e) => setArea(e.target.value as "identity")}><option value="identity">Identity</option><option value="payout">Payout</option><option value="agreement">Agreement</option></select>
      <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Internal note (no sensitive data)" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await requestInfo(userId, area, msg), "Creator notified"))}>Request</button></div>
    <p className="t-xs muted">Staff cannot mark identity or payouts as approved. Those change only through signed provider events.</p>
    <b>Restriction</b>
    <div className="optrow"><select className="select" style={{ width: "auto" }} value={level} onChange={(e) => setLevel(e.target.value as "none")}><option value="restricted">Restrict</option><option value="suspended">Suspend</option><option value="none">Lift</option></select>
      <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Reason" value={why} onChange={(e) => setWhy(e.target.value)} />
      <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await restrict(userId, level, why), "Saved"))}>Apply</button></div>
    <b>Confidential identity</b>
    <div className="optrow"><input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Purpose of access (logged)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => { const r = await reveal(userId, purpose); if (r.ok) setShown(JSON.stringify(r.data ?? "No record")); else say(r); })}>Reveal (admins)</button></div>
    {shown ? <pre>{shown}</pre> : null}
  </div>);
}
export function AppealAnswer({ id }: { id: string }) {
  const [t, setT] = useState(""); const [p, start] = useTransition();
  return <div className="optrow"><input className="input" style={{ flex: 1 }} value={t} onChange={(e) => setT(e.target.value)} placeholder="Reply to the creator" /><button className="btn btn-secondary btn-sm" disabled={p || t.length < 5} onClick={() => start(async () => say(await answer(id, t), "Sent"))}>Reply</button></div>;
}

export function BlockAccount({ id, blocked }: { id: string; blocked: boolean }) {
  const [reason, setReason] = useState(""); const [p, start] = useTransition();
  if (blocked) return <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await block(id, false, ""), "Account unblocked"))}>Unblock account</button>;
  return <div className="bo-inline"><input className="input" placeholder="Reason (logged, no sensitive data)" value={reason} onChange={(e) => setReason(e.target.value)} />
    <button className="btn btn-secondary btn-sm" disabled={p || reason.trim().length < 5} onClick={() => start(async () => say(await block(id, true, reason), "Account blocked and signed out"))}>Block account</button></div>;
}
export function TeamAdd() {
  const [who, setWho] = useState(""); const [role, setRole] = useState<"support" | "admin">("support"); const [p, start] = useTransition();
  return <div className="bo-inline"><input className="input" placeholder="Username or email of an existing account" value={who} onChange={(e) => setWho(e.target.value)} />
    <select className="input" value={role} onChange={(e) => setRole(e.target.value as "support" | "admin")} aria-label="Role"><option value="support">Support</option><option value="admin">Admin</option></select>
    <button className="btn btn-primary btn-sm" disabled={p || !who.trim()} onClick={() => start(async () => { const r = await staffRole(who, role); say(r, "Added to the team"); if (r.ok) setWho(""); })}>Add</button></div>;
}
export function TeamRole({ handle, role, self }: { handle: string; role: string; self: boolean }) {
  const [p, start] = useTransition();
  if (self) return <span className="t-sm muted">This is you</span>;
  return <div className="optrow">
    {role !== "admin" ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await staffRole(handle, "admin"), "Now admin"))}>Make admin</button> : <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await staffRole(handle, "support"), "Now support"))}>Make support</button>}
    <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => say(await staffRole(handle, "none"), "Removed from the team"))}>Remove</button></div>;
}

export function ReportHandle({ id }: { id: string }) {
  const [note, setNote] = useState(""); const [p, start] = useTransition();
  const go = (st: "reviewing" | "actioned" | "passed_to_police" | "rejected", msg: string) => start(async () => say(await handleR(id, st, note), msg));
  return <div className="upbox"><input className="input" placeholder="What was done (logged, no sensitive data)" value={note} onChange={(e) => setNote(e.target.value)} />
    <div className="optrow"><button className="btn btn-secondary btn-sm" disabled={p} onClick={() => go("reviewing", "Marked as in review")}>Take it</button>
      <button className="btn btn-primary btn-sm" disabled={p || note.trim().length < 5} onClick={() => go("passed_to_police", "Logged as passed to the police")}>Passed to police</button>
      <button className="btn btn-secondary btn-sm" disabled={p || note.trim().length < 5} onClick={() => go("actioned", "Closed with action")}>Action taken</button>
      <button className="btn btn-secondary btn-sm" disabled={p || note.trim().length < 5} onClick={() => go("rejected", "Closed without action")}>No violation</button></div></div>;
}
export function SupportOrgForm({ id, org }: { id: string; org: string | null }) {
  const [v, setV] = useState(org ?? ""); const [p, start] = useTransition();
  return <div className="bo-inline"><input className="input" placeholder="Organisation name, for example a recognised centre" value={v} onChange={(e) => setV(e.target.value)} />
    <button className="btn btn-secondary btn-sm" disabled={p || !v.trim()} onClick={() => start(async () => say(await supportOrg(id, v), "Marked as support organisation"))}>Save</button>
    {org ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(async () => { const r = await supportOrg(id, null); say(r, "Removed"); if (r.ok) setV(""); })}>Remove</button> : null}</div>;
}
