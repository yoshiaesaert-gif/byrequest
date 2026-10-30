"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { object } from "../../actions";
import { BuyerReview, CreatorReview, TipCard, ReviewDone } from "./review";
import { toast } from "@/components/chrome";
import { UpTile, useUploads } from "@/components/uploads";
import { when } from "@/components/ui";
import { useLocale, useT } from "@/i18n/client";

type Props = {
  me: { id: string; handle: string; role: "buyer" | "creator" };
  other: { id: string; handle: string };
  deal: { id: string; status: string; dueAt: string; objectUntil: string | null; creatorCents: number; rated: boolean; ratedBuyer: boolean; category: string; amount: number; stars: number | null; tipCents: number; tipCreatorCents: number; vatRate: number; tipOpen: boolean };
  delivery: { review: string; onlyCreator: boolean } | null;
  canUpload: boolean; missing: string[]; payoutHeld: boolean;
  participants: { id: string; label: string; identity: string }[];
  dispute: { outcome: string } | null;
  blocked: "me" | "them" | null;   // the chat stops after a block; the deal itself keeps its protection
};
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const eur = (c: number) => "€" + Math.round(c / 100);
const noop = () => () => {};
const REASONS = ["Not what was agreed", "Face does not match the offer", "Unusable, for example black or silent", "Someone other than the creator"];

export default function Room(p: Props) {
  const router = useRouter();
  const tr = useT();
  const locale = useLocale();
  const [sheet, setSheet] = useState<null | "object" | "upload">(null);
  const buyer = p.me.role === "buyer";
  const s = p.deal.status;
  const steps = ["Accepted", "Making it", "Review", buyer ? "In your vault" : "In the vault", "Paid out"].map((x) => tr(x));
  // The highlighted step is the one in progress now, never one that has not happened yet.
  const cur = s === "held" ? 1 : s === "reviewing" ? 2 : s === "disputed" ? 3 : s === "delivered" ? 4 : 5;

  // Both sides are asked for a review once the content is in the vault; a tip stays possible for 14 days.
  const reviewable = (s === "delivered" || s === "released") && !p.blocked;
  const canTip = buyer && reviewable && !p.deal.tipCents && p.deal.tipOpen;
  let next: { t: string; d: string; acts?: React.ReactNode };
  if (buyer) {
    if (s === "held") next = { t: tr("{name} is making it", { name: p.other.handle }), d: tr("Expected by {time}. No delivery in time means a full refund.", { time: when(p.deal.dueAt, locale) }) };
    else if (s === "reviewing") next = { t: tr("Delivered, being reviewed"), d: p.delivery?.review === "blocked_participants" ? tr("Waiting for verification and consent of everyone who appears. Then it reaches your vault.") : tr("It passed the file check. A reviewer checks it before it reaches your vault.") };
    else if (s === "delivered") next = { t: tr("In your vault, your turn"), d: tr("Not what you agreed? Report it before {time}: we check it independently first. Otherwise the payment goes to the creator automatically, 60 minutes after you first open it.", { time: when(p.deal.objectUntil!, locale) }), acts: <><button className="btn btn-secondary" onClick={() => setSheet("object")}>{tr("Report a problem")}</button><Link className="btn btn-secondary" href="/vault">{tr("Open vault")}</Link></> };
    else if (s === "disputed") next = { t: tr("Under review"), d: tr("A person compares the file with the terms of the accepted offer. The money stays held until then.") };
    else if (s === "released") next = { t: tr("Deal completed"), d: tr("It stays in your vault for the agreed period."), acts: <><Link className="btn btn-secondary" href="/vault">{tr("Open vault")}</Link></> };
    else next = { t: tr("Refunded"), d: tr("The full amount goes back to you through the payment partner.") };
  } else {
    if (s === "held") next = p.canUpload
      ? { t: tr("Deliver by {time}", { time: when(p.deal.dueAt, locale) }), d: tr("Upload here. We check length and format, remove location and device data, and review it before it reaches the buyer."), acts: <button className="btn btn-brand" onClick={() => setSheet("upload")}>{tr("Upload delivery")}</button> }
      : { t: tr("Finish your setup to upload"), d: p.missing.map((m) => tr(m)).join(" · "), acts: <Link className="btn btn-primary" href="/onboarding">{tr("Continue setup")}</Link> };
    else if (s === "reviewing") next = { t: p.delivery?.review === "blocked_participants" ? tr("Waiting for participants") : tr("Being reviewed"), d: p.delivery?.review === "blocked_participants" ? tr("Everyone else who appears must verify and consent through their link first.") : tr("A reviewer checks every delivery before it is made available.") };
    else if (s === "delivered") next = { t: tr("In the buyer's vault"), d: tr("The buyer can object until {time}. Then {amount} is released to you.", { time: when(p.deal.objectUntil!, locale), amount: eur(p.deal.creatorCents) }) };
    else if (s === "disputed") next = { t: tr("The buyer reported a problem"), d: tr("A person reviews the file against the accepted offer. You are paid if it matches.") };
    else if (s === "released") next = p.payoutHeld ? { t: tr("Action needed to enable payouts"), d: tr("{amount} is waiting until your payout setup is approved.", { amount: eur(p.deal.creatorCents) }), acts: <Link className="btn btn-primary" href="/onboarding">{tr("Open payout setup")}</Link> } : { t: tr("Paid"), d: tr("{amount} was released to your payout account.", { amount: eur(p.deal.creatorCents) }) };
    else next = { t: tr("Refunded to the buyer"), d: tr("This deal ended without payment.") };
  }

  return (<div>
    <div className="stepper">{steps.map((l, i) => <div key={l} className={"stp " + (i < cur ? "done" : i === cur ? "cur" : "")}><i /><span>{l}</span></div>)}</div>
    <p className="stp-now">{tr("Step {n} of {total}", { n: Math.min(cur + 1, steps.length), total: steps.length })} · <b>{steps[Math.min(cur, steps.length - 1)]}</b></p>
    <div className={"next is-" + s}><div style={{ minWidth: 0 }}><b className="t-h3">{next.t}</b><p className="t-sm muted" style={{ marginTop: 4 }}>{next.d}</p></div>{next.acts ? <div className="acts">{next.acts}</div> : null}</div>
    {reviewable ? (buyer
      ? (!p.deal.rated ? <BuyerReview dealId={p.deal.id} name={p.other.handle} vatBp={p.deal.vatRate} canTip={canTip} /> : canTip ? <TipCard dealId={p.deal.id} name={p.other.handle} vatBp={p.deal.vatRate} /> : null)
      : (!p.deal.ratedBuyer ? <CreatorReview dealId={p.deal.id} name={p.other.handle} /> : null)) : null}
    <ReviewDone stars={p.deal.stars} tipCents={buyer ? p.deal.tipCents : p.deal.tipCreatorCents} name={p.other.handle} buyer={buyer} />
    {sheet === "object" ? <ObjectSheet dealId={p.deal.id} onClose={() => setSheet(null)} /> : null}
    {sheet === "upload" ? <UploadSheet p={p} onClose={() => setSheet(null)} /> : null}
  </div>);
}

function ObjectSheet({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const tr = useT();
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label={tr("Report a problem")}>
    <div className="sheet-h"><h3 className="t-h2">{tr("What does not match?")}</h3><button className="icon-btn" onClick={onClose} aria-label={tr("Close")}><Ico n="x" /></button></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{REASONS.map((r) => <button key={r} className={"choice" + (reason === r ? " is-on" : "")} onClick={() => setReason(r)}><span className="ci" style={{ background: "var(--sunk)", color: "var(--ink)" }}><Ico n="alert" /></span><b>{tr(r)}</b></button>)}</div>
    <div className="field"><label htmlFor="on">{tr("Add a short note, optional")}</label><input id="on" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
    <div className="verd"><div><b><Ico n="check" c="sm" />{tr("The delivery does not match")}</b><span>{tr("You get a full refund. The creator is not paid.")}</span></div><div><b><Ico n="alert" c="sm" />{tr("The delivery matches the offer")}</b><span>{tr("The creator is paid. Only reports made in bad faith, again and again, can lead to closing an account, and you can always appeal.")}</span></div></div>
    <button className="btn btn-primary btn-lg btn-block" disabled={pending} onClick={() => start(async () => { const r = await object(dealId, reason, note); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) onClose(); })}>{pending ? tr("Sending…") : tr("Send report")}</button>
    <p className="t-sm muted">{tr("A person reviews the file against the terms of the accepted offer within 24 hours. Your chat stays encrypted.")}</p>
  </div></div>);
}

function UploadSheet({ p, onClose }: { p: Props; onClose: () => void }) {
  const tr = useT();
  const [only, setOnly] = useState<boolean | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [lines, setLines] = useState<{ ok: boolean; text: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const cat = p.deal.category;
  const accept = cat === "photos" || cat === "worn" ? "image/*" : cat === "voice" ? "audio/*" : "video/*";
  const many = cat === "photos" || cat === "worn";
  // Every file uploads on its own, in parallel; the delivery is sent once they are all in.
  const up = useUploads<{ id: string }>({ endpoint: `/api/deliveries/${p.deal.id}/files`, target: `delivery:${p.deal.id}`, shrink: { side: 4096, quality: 0.92, over: 12 * 1048576 }, parse: (j) => j.item as { id: string } });
  const drop = (key: string) => { const u = up.list.find((x) => x.key === key); if (u?.result) fetch(`/api/deliveries/${p.deal.id}/files?id=${u.result.id}`, { method: "DELETE" }).catch(() => null); up.remove(key); setLines(null); };
  const ready = up.list.length > 0 && up.list.every((u) => u.state === "done");
  const go = async () => {
    setBusy(true); setErr(null); setLines(null);
    try {
      const r = await (await fetch(`/api/deliveries/${p.deal.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaIds: up.list.map((u) => u.result!.id), onlyCreator: !!only, participantIds: only ? [] : sel }) })).json();
      setLines(r.lines ?? null);
      if (r.ok) { toast(tr("Delivered. It is being reviewed.")); router.refresh(); setTimeout(onClose, 900); } else setErr(r.error);
    } catch { setErr(tr("Sending failed. Check your connection.")); }
    setBusy(false);
  };
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && !busy && !up.busy && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label={tr("Upload delivery")}>
    <div className="sheet-h"><div><span className="eyebrow">{tr("Deliver to {name}", { name: p.other.handle })}</span><h3 className="t-h2" style={{ marginTop: 4 }}>{cat === "photos" ? tr("{n} photos", { n: p.deal.amount }) : tr("{n} minutes", { n: p.deal.amount })}</h3></div><button className="icon-btn" onClick={onClose} aria-label={tr("Close")} disabled={busy}><Ico n="x" /></button></div>
    <div className="up-grid">
      {up.list.map((u) => <UpTile key={u.key} u={u} onRemove={() => drop(u.key)} onRetry={() => up.retry(u.key)} />)}
      {many || !up.list.length ? <label className="up-add"><input type="file" accept={accept} multiple={many} hidden onChange={(e) => { up.add(Array.from(e.target.files ?? [])); e.target.value = ""; setLines(null); setErr(null); }} />
        <Ico n={cat === "photos" || cat === "worn" ? "image" : cat === "voice" ? "mic" : "video"} c="lg" /><b>{up.list.length ? tr("Add more") : tr(many ? "Choose your photos" : "Choose your file")}</b><span>{many ? tr("{n} of {m} added", { n: up.list.length, m: p.deal.amount }) : tr("Uploads start right away")}</span></label> : null}
    </div>
    <div className="field"><label>{tr("Who appears in this content?")}</label><div className="seg2">
      <button type="button" className={only === true ? "on" : ""} onClick={() => setOnly(true)}><b>{tr("Only me")}</b><span className="t-sm muted">{tr("Nobody else is visible or audible.")}</span></button>
      <button type="button" className={only === false ? "on" : ""} onClick={() => setOnly(false)}><b>{tr("Me and others")}</b><span className="t-sm muted">{tr("Each person verifies and consents first.")}</span></button></div></div>
    {only === false ? (<div className="field"><label>{tr("Select everyone else who appears")}</label>
      {p.participants.length ? <div className="optrow">{p.participants.map((x) => <button key={x.id} type="button" className={"chip" + (sel.includes(x.id) ? " is-on" : "")} onClick={() => setSel((s) => s.includes(x.id) ? s.filter((y) => y !== x.id) : [...s, x.id])}>{x.label}{x.identity === "approved" ? ` · ${tr("verified")}` : ` · ${tr("not verified yet")}`}</button>)}</div> : null}
      <Link href="/studio#participants" className="t-sm" style={{ fontWeight: 600 }}>{tr("Add a person and send them their private link")}</Link>
      <span className="t-sm muted">{tr("Your own statement is not enough. The delivery stays hidden until each person has verified and consented.")}</span></div>) : null}
    {lines ? <div className="upl">{lines.map((l) => <div key={l.text} className={"upc" + (l.ok ? "" : " bad")}><Ico n={l.ok ? "check" : "x"} c="sm" /><span>{l.text}</span></div>)}</div> : null}
    {err ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{tr(err)}{lines?.some((l) => !l.ok) ? " " + tr("Fix the item in red and upload again. This protects the buyer, and you.") : ""}</span></div> : null}
    <button className="btn btn-brand btn-lg btn-block" disabled={busy || !ready || only === null || (only === false && !sel.length)} onClick={go}>{busy ? tr("Checking…") : up.busy ? tr("Uploading…") : tr("Check and send")}</button>
    <p className="t-xs muted">{tr("The file check reads only technical facts. A reviewer then checks the content before it is made available.")}</p>
  </div></div>);
}
