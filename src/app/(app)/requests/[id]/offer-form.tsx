"use client";
import { useState, useTransition } from "react";
import { makeOffer } from "../../actions";
import { toast } from "@/components/chrome";
import { VAULT_ORDER, VAULT_LABEL, type VaultPeriod } from "@/domain/rules";
import { useT } from "@/i18n/client";

export default function OfferForm({ requestId, minVault, faceRequired, dueHours, existing, defaults }: {
  requestId: string; minVault: VaultPeriod; faceRequired: boolean; dueHours: number;
  existing: { showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string; status: string } | null;
  defaults: { showsFace: boolean; vault: VaultPeriod };
}) {
  const t = useT();
  const minI = VAULT_ORDER.indexOf(minVault);
  const [face, setFace] = useState(existing?.showsFace ?? (faceRequired || defaults.showsFace));
  const [vault, setVault] = useState<VaultPeriod>(existing?.vault ?? (VAULT_ORDER.indexOf(defaults.vault) >= minI ? defaults.vault : minVault));
  const etas = [12, 24, 48, 72, 168].filter((h) => h <= dueHours);
  const [eta, setEta] = useState(existing?.etaHours ?? etas[Math.min(1, etas.length - 1)]);
  const [note, setNote] = useState(existing?.note ?? "");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(existing?.status === "pending");

  return (
    <form className="upbox" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await makeOffer({ requestId, showsFace: face, vault, etaHours: eta, note }); if (r.ok) { setSent(true); toast(r.msg ? t(r.msg) : t("Offer sent")); } else toast(t(r.error), "err"); }); }}>
      <b className="t-h3">{sent ? t("Your offer is in") : t("Make an offer")}</b>
      <div className="field"><label>{t("Your face in the content")}</label><div className="optrow">
        <button type="button" className={"chip" + (!face ? " is-on" : "")} onClick={() => setFace(false)} disabled={faceRequired}>{t("No face")}</button>
        <button type="button" className={"chip" + (face ? " is-on" : "")} onClick={() => setFace(true)}>{t("Face shown")}</button></div>
        <span className="t-sm muted">{t("The buyer sees this before choosing.")}{faceRequired ? " " + t("They asked for the face to be shown.") : ""}</span></div>
      <div className="field"><label>{t("Stays in the buyer vault")}</label><div className="optrow">{VAULT_ORDER.map((v, i) => (
        <button type="button" key={v} className={"chip" + (vault === v ? " is-on" : "")} disabled={i < minI} onClick={() => setVault(v)}>{t(VAULT_LABEL[v])}</button>))}</div>
        <span className="t-sm muted">{t("They asked for at least {period}.", { period: t(VAULT_LABEL[minVault]).toLowerCase() })}</span></div>
      <div className="field"><label>{t("I deliver within")}</label><div className="optrow">{etas.map((h) => (
        <button type="button" key={h} className={"chip" + (eta === h ? " is-on" : "")} onClick={() => setEta(h)}>{h < 72 ? t("{n} hours", { n: h }) : t("{n} days", { n: h / 24 })}</button>))}</div></div>
      <div className="field"><label htmlFor="note">{t("Short note")}</label><input className="input" id="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Can deliver tomorrow evening.")} /></div>
      <button className="btn btn-brand btn-lg btn-block" disabled={pending}>{pending ? t("Sending…") : sent ? t("Update offer") : t("Send offer")}</button>
      <p className="t-xs muted">{t("Never share your real name, address or socials. Deals and payments outside ByRequest are not protected.")}</p>
    </form>
  );
}
