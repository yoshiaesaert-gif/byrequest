"use client";
import { useState, useTransition } from "react";
import { makeOffer } from "../../actions";
import { toast } from "@/components/chrome";
import { VAULT_ORDER, VAULT_LABEL, type VaultPeriod } from "@/domain/rules";
import { useLocale, useT } from "@/i18n/client";
import Link from "next/link";

type Sent = { showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string; status: string; at: string };
const hours = (t: ReturnType<typeof useT>, h: number) => (h < 72 ? t("{n} hours", { n: h }) : t("{n} days", { n: h / 24 }));

/* Once applied, the form makes way for a clear receipt: what was sent, when, and what happens next.
   An application is final, so the buyer compares exactly what each creator promised. */
function Applied({ o, rivals }: { o: Sent; rivals: number }) {
  const t = useT();
  const locale = useLocale();
  const when = new Date(o.at).toLocaleString(locale === "nl" ? "nl-BE" : locale === "fr" ? "fr-BE" : "en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const lost = o.status === "declined" || o.status === "withdrawn";
  return (
    <div className={"applied" + (lost ? " is-lost" : "")} role="status">
      <span className="applied-ic" aria-hidden="true"><svg className="ico lg"><use href={lost ? "#i-x" : "#i-check"} /></svg></span>
      <b className="applied-h">{lost ? t("The buyer chose someone else") : t("You applied for this request")}</b>
      <p className="applied-sub" suppressHydrationWarning>{t("Sent on {date}", { date: when })}{!lost && rivals > 0 ? " · " + t("{n} other creators applied", { n: rivals }) : ""}</p>
      <dl className="applied-sum">
        <div><dt>{t("Your face")}</dt><dd>{o.showsFace ? t("Face shown") : t("No face")}</dd></div>
        <div><dt>{t("In their vault")}</dt><dd>{t(VAULT_LABEL[o.vault])}</dd></div>
        <div><dt>{t("Delivery")}</dt><dd>{t("Within {time}", { time: hours(t, o.etaHours) })}</dd></div>
        {o.note ? <div><dt>{t("Your note")}</dt><dd>“{o.note}”</dd></div> : null}
      </dl>
      {lost ? null : <ol className="applied-next">
        <li><span>1</span>{t("The buyer compares the applications.")}</li>
        <li><span>2</span>{t("Chosen? You get a message and the chat opens.")}</li>
        <li><span>3</span>{t("You deliver within {time} and get paid right after.", { time: hours(t, o.etaHours) })}</li>
      </ol>}
      <Link href="/deals" className="btn btn-primary btn-lg btn-block">{t("See my applications")}</Link>
      <Link href="/for-you" className="btn btn-secondary btn-block">{t("Find more requests")}</Link>
      {lost ? null : <p className="t-xs muted">{t("An application cannot be changed once it is sent.")}</p>}
    </div>
  );
}

export default function OfferForm({ requestId, minVault, faceRequired, dueHours, existing, rivals, defaults }: {
  requestId: string; minVault: VaultPeriod; faceRequired: boolean; dueHours: number;
  existing: Sent | null; rivals: number;
  defaults: { showsFace: boolean; vault: VaultPeriod };
}) {
  const t = useT();
  const minI = VAULT_ORDER.indexOf(minVault);
  const [face, setFace] = useState(faceRequired || defaults.showsFace);
  const [vault, setVault] = useState<VaultPeriod>(VAULT_ORDER.indexOf(defaults.vault) >= minI ? defaults.vault : minVault);
  const etas = [12, 24, 48, 72, 168].filter((h) => h <= dueHours);
  const [eta, setEta] = useState(etas[Math.min(1, etas.length - 1)]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<Sent | null>(existing);
  if (sent) return <Applied o={sent} rivals={rivals} />;

  return (
    <form className="upbox" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await makeOffer({ requestId, showsFace: face, vault, etaHours: eta, note }); if (r.ok) { setSent({ showsFace: face, vault, etaHours: eta, note: note.trim(), status: "pending", at: new Date().toISOString() }); window.scrollTo({ top: 0, behavior: "smooth" }); toast(t("You applied for this request")); } else toast(t(r.error), "err"); }); }}>
      <b className="t-h3">{t("Make an offer")}</b>
      <div className="field"><label>{t("Your face in the content")}</label><div className="optrow">
        <button type="button" className={"chip" + (!face ? " is-on" : "")} onClick={() => setFace(false)} disabled={faceRequired}>{t("No face")}</button>
        <button type="button" className={"chip" + (face ? " is-on" : "")} onClick={() => setFace(true)}>{t("Face shown")}</button></div>
        <span className="t-sm muted">{t("The buyer sees this before choosing.")}{faceRequired ? " " + t("They asked for the face to be shown.") : ""}</span></div>
      <div className="field"><label>{t("Stays in the buyer vault")}</label><div className="optrow">{VAULT_ORDER.map((v, i) => (
        <button type="button" key={v} className={"chip" + (vault === v ? " is-on" : "")} disabled={i < minI} onClick={() => setVault(v)}>{t(VAULT_LABEL[v])}</button>))}</div>
        <span className="t-sm muted">{t("They asked for at least {period}.", { period: t(VAULT_LABEL[minVault]).toLowerCase() })}</span></div>
      <div className="field"><label>{t("I deliver within")}</label><div className="optrow">{etas.map((h) => (
        <button type="button" key={h} className={"chip" + (eta === h ? " is-on" : "")} onClick={() => setEta(h)}>{hours(t, h)}</button>))}</div></div>
      <div className="field"><label htmlFor="note">{t("Short note")}</label><input className="input" id="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Can deliver tomorrow evening.")} /></div>
      <button className="btn btn-brand btn-lg btn-block" disabled={pending}>{pending ? t("Sending…") : t("Send offer")}</button>
      <p className="t-xs muted">{t("You cannot change your application once it is sent.")} {t("Never share your real name, address or socials. Deals and payments outside ByRequest are not protected.")}</p>
    </form>
  );
}
