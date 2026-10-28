"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/chrome";
import { reqApprove, reqAuto, reqBulk, reqEdit, reqReject, reqRescreen } from "../actions";
import type { Flag } from "@/domain/screening";

const say = (r: { ok: boolean; error?: string }, ok: string) => toast(r.ok ? ok : r.error ?? "Failed", r.ok ? "ok" : "err");

/* Standard reasons. They reach the buyer as a statement of reasons, translated into their language. */
export const REASONS: [string, string][] = [
  ["gibberish", "The title or description is not understandable."],
  ["contact", "The request contains contact details or asks to talk outside ByRequest."],
  ["payment", "The request asks to pay outside ByRequest."],
  ["meet", "The request asks to meet in person. ByRequest is only for content delivered online."],
  ["minor", "The request may involve someone under 18. That is never allowed."],
  ["consent", "Consent of everyone involved is missing or unclear."],
  ["illegal", "The request asks for something that is not allowed on ByRequest."],
  ["real_person", "The request refers to a real person without their consent."],
  ["duplicate", "The same request was already posted."],
];
const VERDICT: Record<string, [string, string]> = { approve: ["Suggestion: approve", "Nothing found"], check: ["Suggestion: check", "Look at the points below"], reject: ["Suggestion: reject", "Hard line found"] };

export function CheckResult({ verdict, flags, id }: { verdict: string | null; flags: Flag[]; id: string }) {
  const [p, start] = useTransition(); const router = useRouter();
  const v = VERDICT[verdict ?? "check"] ?? VERDICT.check;
  return (<div className={"rq-check v-" + (verdict ?? "check")}>
    <div className="rq-check-h"><b>{v[0]}</b><button type="button" disabled={p} onClick={() => start(async () => { say(await reqRescreen(id), "Checked again"); router.refresh(); })}>Run again</button></div>
    {flags.length ? <ul>{flags.map((f, i) => <li key={i} className={"lv-" + f.level}><i />{f.label}{f.match ? <q>{f.match}</q> : null}</li>)}</ul> : <p>{v[1]}</p>}
  </div>);
}

export function ReviewActions({ id, suggestion, flags }: { id: string; suggestion: string | null; flags: Flag[] }) {
  const pre = REASONS.find(([k]) => flags.some((f) => f.code === k && f.level !== "info"));
  const [mode, setMode] = useState<"" | "reject">(suggestion === "reject" ? "reject" : "");
  const [reason, setReason] = useState(pre?.[1] ?? "");
  const [p, start] = useTransition(); const router = useRouter();
  const done = (r: { ok: boolean; error?: string }, ok: string) => { say(r, ok); if (r.ok) router.refresh(); };
  if (mode === "reject") return (<div className="rq-act">
    <select className="input" value={REASONS.find(([, l]) => l === reason)?.[0] ?? ""} onChange={(e) => setReason(REASONS.find(([k]) => k === e.target.value)?.[1] ?? "")}>
      <option value="">Own reason…</option>{REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, sent to the buyer with how to appeal" />
    <div className="rq-btns"><button className="btn btn-secondary btn-sm" onClick={() => setMode("")}>Cancel</button>
      <button className="btn btn-danger btn-sm" disabled={p || reason.trim().length < 5} onClick={() => start(async () => done(await reqReject(id, reason), "Rejected, the buyer got the reason"))}>Reject</button></div>
  </div>);
  return (<div className="rq-btns">
    <button className="btn btn-secondary btn-sm" onClick={() => setMode("reject")}>Reject…</button>
    <button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(async () => done(await reqApprove(id), "Approved, it is live"))}>Approve</button>
  </div>);
}

export function AutoApprove({ on, canChange }: { on: boolean; canChange: boolean }) {
  const [v, setV] = useState(on); const [p, start] = useTransition();
  return <label className="rq-auto"><input type="checkbox" checked={v} disabled={!canChange || p} onChange={(e) => { const n = e.target.checked; setV(n); start(async () => say(await reqAuto(n), n ? "Clean requests now go live by themselves" : "Every request waits for a person again")); }} />
    <span><b>Publish clean requests automatically</b><small>Only when the check finds nothing at all. Everything else still waits for a person. {canChange ? "" : "Admins can change this."}</small></span></label>;
}

export function BulkApprove({ ids }: { ids: string[] }) {
  const [p, start] = useTransition(); const router = useRouter();
  return <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => { if (confirm(`Approve ${ids.length} requests where the check found nothing?`)) start(async () => { const r = await reqBulk(ids, "approve"); say(r, "Approved"); router.refresh(); }); }}>Approve all {ids.length} clean ones</button>;
}

type R = { id: string; title: string; details: string; category: string; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; face: string; minVault: string; dueHours: number; lang: string; cover: string | null; status: string };

export function EditRequest({ r, covers, locked, canEdit }: { r: R; covers: string[]; locked: boolean; canEdit: boolean }) {
  const [f, setF] = useState({ title: r.title, details: r.details, category: r.category, amount: r.amount, budget: Math.round(r.dealCents / 100), who: r.who, ageMin: r.ageMin, ageMax: r.ageMax, face: r.face, minVault: r.minVault, dueHours: r.dueHours, lang: r.lang, cover: r.cover, status: r.status, extendHours: 0, reason: "" });
  const [p, start] = useTransition(); const router = useRouter();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  const statusOptions: Record<string, string[]> = { open: ["open", "closed"], closed: ["closed", "open"], expired: ["expired", "open", "closed"], in_review: ["in_review"], rejected: ["rejected"], matched: ["matched"] };
  const dis = !canEdit || p;
  const sel = (k: keyof typeof f, opts: [string, string][], lock = false) => <select className="input" value={String(f[k] ?? "")} onChange={set(k)} disabled={dis || lock}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  const save = () => start(async () => {
    const r2 = await reqEdit(r.id, { ...f, cover: f.cover || null } as never);
    if (!r2.ok) return toast(r2.error, "err");
    const ch = (r2.data as { changed: string[] }).changed;
    toast(ch.length || f.extendHours ? `Saved: ${[...ch, ...(f.extendHours ? ["closing time"] : [])].join(", ")}` : "Nothing changed", "ok");
    setF({ ...f, extendHours: 0, reason: "" }); router.refresh();
  });
  return (<div className="rq-form">
    {!canEdit ? <p className="banner warn" style={{ margin: 0 }}>Only admins can edit requests. You can approve or reject.</p> : null}
    {locked ? <p className="banner info" style={{ margin: 0 }}>This request has a deal. Its terms are fixed; you can still change the wording and the cover.</p> : null}
    <div className="field"><label>Title</label><input className="input" value={f.title} onChange={set("title")} maxLength={70} disabled={dis} /></div>
    <div className="field"><label>Description</label><textarea className="input" rows={4} value={f.details} onChange={set("details")} maxLength={600} disabled={dis} /></div>
    <div className="rq-grid">
      <div className="field"><label>Type</label>{sel("category", [["video", "Video"], ["photos", "Photos"], ["voice", "Voice note"], ["custom", "Custom"], ["worn", "Worn"]], locked)}</div>
      <div className="field"><label>{f.category === "photos" ? "Photos" : "Minutes"}</label><input className="input" type="number" min={1} max={120} value={f.amount} onChange={set("amount")} disabled={dis || locked} /></div>
      <div className="field"><label>Budget (€)</label><input className="input" type="number" min={10} max={5000} value={f.budget} onChange={set("budget")} disabled={dis || locked} /></div>
      <div className="field"><label>Looking for</label>{sel("who", [["Anyone", "Anyone"], ["Woman", "Woman"], ["Man", "Man"]], locked)}</div>
      <div className="field"><label>Age from</label><input className="input" type="number" min={18} max={80} value={f.ageMin} onChange={set("ageMin")} disabled={dis || locked} /></div>
      <div className="field"><label>Age to</label><input className="input" type="number" min={18} max={99} value={f.ageMax} onChange={set("ageMax")} disabled={dis || locked} /></div>
      <div className="field"><label>Face</label>{sel("face", [["not_needed", "Not needed"], ["optional", "Optional"], ["required", "Required"]], locked)}</div>
      <div className="field"><label>Vault at least</label>{sel("minVault", [["7d", "7 days"], ["30d", "30 days"], ["1y", "1 year"], ["forever", "Forever"]], locked)}</div>
      <div className="field"><label>Deliver within</label>{sel("dueHours", [["24", "24 hours"], ["48", "48 hours"], ["72", "3 days"], ["168", "7 days"], ["336", "14 days"]], locked)}</div>
      <div className="field"><label>Language</label>{sel("lang", [["nl", "Dutch"], ["en", "English"], ["fr", "French"]])}</div>
      <div className="field"><label>Status</label>{sel("status", (statusOptions[r.status] ?? [r.status]).map((s) => [s, s.replace("_", " ")]))}</div>
      <div className="field"><label>Extend closing time</label>{sel("extendHours", [["0", "No change"], ["24", "+ 1 day"], ["48", "+ 2 days"], ["72", "+ 3 days"], ["168", "+ 7 days"]])}</div>
    </div>
    <div className="field"><label>Cover</label><div className="rq-covers">
      <button type="button" className={"rq-cv none" + (!f.cover ? " on" : "")} onClick={() => setF({ ...f, cover: null })} disabled={dis}>Neutral</button>
      {covers.map((c) => <button key={c} type="button" className={"rq-cv" + (f.cover === c ? " on" : "")} onClick={() => setF({ ...f, cover: c })} disabled={dis}><img src={`/img/${c}.webp`} alt={c} /></button>)}</div></div>
    <div className="field"><label>Note for the audit log (optional)</label><input className="input" value={f.reason} onChange={set("reason")} maxLength={300} placeholder="Why you changed this" disabled={dis} /></div>
    <button className="btn btn-primary btn-lg" onClick={save} disabled={dis}>Save changes</button>
  </div>);
}
