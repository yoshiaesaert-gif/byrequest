"use client";
import { useState, useTransition } from "react";
import { makeOffer } from "../../actions";
import { toast } from "@/components/chrome";
import { VAULT_ORDER, VAULT_LABEL, type VaultPeriod } from "@/domain/rules";

export default function OfferForm({ requestId, minVault, faceRequired, dueHours, existing, defaults }: {
  requestId: string; minVault: VaultPeriod; faceRequired: boolean; dueHours: number;
  existing: { showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string; status: string } | null;
  defaults: { showsFace: boolean; vault: VaultPeriod };
}) {
  const minI = VAULT_ORDER.indexOf(minVault);
  const [face, setFace] = useState(existing?.showsFace ?? (faceRequired || defaults.showsFace));
  const [vault, setVault] = useState<VaultPeriod>(existing?.vault ?? (VAULT_ORDER.indexOf(defaults.vault) >= minI ? defaults.vault : minVault));
  const etas = [12, 24, 48, 72, 168].filter((h) => h <= dueHours);
  const [eta, setEta] = useState(existing?.etaHours ?? etas[Math.min(1, etas.length - 1)]);
  const [note, setNote] = useState(existing?.note ?? "");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(existing?.status === "pending");

  return (
    <form className="upbox" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await makeOffer({ requestId, showsFace: face, vault, etaHours: eta, note }); if (r.ok) { setSent(true); toast(r.msg ?? "Offer sent"); } else toast(r.error, "err"); }); }}>
      <b className="t-h3">{sent ? "Your offer is in" : "Make an offer"}</b>
      <div className="field"><label>Your face in the content</label><div className="optrow">
        <button type="button" className={"chip" + (!face ? " is-on" : "")} onClick={() => setFace(false)} disabled={faceRequired}>No face</button>
        <button type="button" className={"chip" + (face ? " is-on" : "")} onClick={() => setFace(true)}>Face shown</button></div>
        <span className="t-sm muted">The buyer sees this before choosing.{faceRequired ? " They asked for the face to be shown." : ""}</span></div>
      <div className="field"><label>Stays in the buyer vault</label><div className="optrow">{VAULT_ORDER.map((v, i) => (
        <button type="button" key={v} className={"chip" + (vault === v ? " is-on" : "")} disabled={i < minI} onClick={() => setVault(v)}>{VAULT_LABEL[v]}</button>))}</div>
        <span className="t-sm muted">They asked for at least {VAULT_LABEL[minVault].toLowerCase()}.</span></div>
      <div className="field"><label>I deliver within</label><div className="optrow">{etas.map((h) => (
        <button type="button" key={h} className={"chip" + (eta === h ? " is-on" : "")} onClick={() => setEta(h)}>{h < 72 ? `${h} hours` : `${h / 24} days`}</button>))}</div></div>
      <div className="field"><label htmlFor="note">Short note</label><input className="input" id="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Can deliver tomorrow evening." /></div>
      <button className="btn btn-brand btn-lg btn-block" disabled={pending}>{pending ? "Sending…" : sent ? "Update offer" : "Send offer"}</button>
      <p className="t-xs muted">Never share your real name, address or socials. Deals and payments outside ByRequest are not protected.</p>
    </form>
  );
}
