"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";
import { deleteMyAccount, sendDeleteCode, confirmDeleteCode } from "../../actions";

const Ico = ({ n }: { n: string }) => <svg className="ico sm" aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const REASONS = ["I found what I was looking for", "I do not use it enough", "Privacy reasons", "Something did not work", "Other"];

/* Three steps, each one on purpose: 1 what you lose, 2 your username and a reason, 3 a code from your
   email and the final button. Nothing happens before the very last tap. */
export default function DeleteFlow({ handle, balance }: { handle: string; balance: string | null }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [ack, setAck] = useState({ final: false, vault: false, money: false });
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pending, start] = useTransition();
  const losses = ["Your profile, username and avatar", "Every request, application and chat", "Everything in your vault, for good", "Your ratings and reviews", "Your bonus balance and free service fees"];
  return (<div className="del-card card">
    <ol className="del-steps" aria-label={t("Steps")}>{[1, 2, 3].map((n) => <li key={n} className={n < step ? "done" : n === step ? "cur" : ""}><span>{n < step ? <Ico n="check" /> : n}</span>{t(["What you lose", "Confirm it is you", "Final step"][n - 1])}</li>)}</ol>

    {step === 1 ? (<div className="del-body">
      <h2 className="t-h2">{t("This cannot be undone")}</h2>
      <p className="muted">{t("Your account is erased for good. Nobody at ByRequest can bring it back.")}</p>
      <ul className="del-list">{losses.map((l) => <li key={l}><Ico n="x" />{t(l)}</li>)}</ul>
      {balance ? <div className="banner info"><Ico n="wallet" /><div className="grow">{t("You still have {amount} on your bonus balance. Transfer it first, or it is lost.", { amount: balance })}</div><Link href="/invite" className="btn btn-secondary btn-sm">{t("Bonus balance")}</Link></div> : null}
      <p className="t-sm muted">{t("Payment and tax records stay as the law requires, locked and separate.")}</p>
      <label className="check"><input type="checkbox" checked={ack.final} onChange={(e) => setAck({ ...ack, final: e.target.checked })} /><span>{t("I understand my account cannot be restored")}</span></label>
      <label className="check"><input type="checkbox" checked={ack.vault} onChange={(e) => setAck({ ...ack, vault: e.target.checked })} /><span>{t("I understand I lose everything in my vault")}</span></label>
      {balance ? <label className="check"><input type="checkbox" checked={ack.money} onChange={(e) => setAck({ ...ack, money: e.target.checked })} /><span>{t("I understand my bonus balance is lost")}</span></label> : null}
      <div className="del-actions"><Link href="/settings" className="btn btn-primary">{t("Keep my account")}</Link><button className="btn btn-secondary" disabled={!ack.final || !ack.vault || (!!balance && !ack.money)} onClick={() => setStep(2)}>{t("Continue")}</button></div>
    </div>) : null}

    {step === 2 ? (<div className="del-body">
      <h2 className="t-h2">{t("Confirm it is you")}</h2>
      <div className="field"><label htmlFor="why">{t("Why are you leaving? Optional")}</label><select id="why" className="input" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">{t("Choose a reason")}</option>{REASONS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</select></div>
      <div className="field"><label htmlFor="typed">{t("Type your username: {name}", { name: handle })}</label><input id="typed" className="input" autoComplete="off" autoCapitalize="none" value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
      <div className="del-actions"><button className="btn btn-primary" onClick={() => setStep(1)}>{t("Back")}</button><button className="btn btn-secondary" disabled={typed.trim().toLowerCase() !== handle || pending} onClick={() => start(async () => { const r = await sendDeleteCode(); if (r.ok) { setSent(true); setStep(3); if ("devCode" in r && r.devCode) setCode(String(r.devCode)); } else toast(t(r.error), "err"); })}>{pending ? t("Sending…") : t("Send me a code")}</button></div>
    </div>) : null}

    {step === 3 ? (<div className="del-body">
      <h2 className="t-h2">{t("Final step")}</h2>
      <p className="muted">{sent ? t("We sent a code to your email. Enter it to unlock the last button.") : null}</p>
      <div className="field"><label htmlFor="dcode">{t("Code")}</label><div className="del-code"><input id="dcode" className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={verified} />
        <button className="btn btn-secondary" disabled={pending || verified || code.replace(/\D/g, "").length < 6} onClick={() => start(async () => { const r = await confirmDeleteCode(code); if (r.ok) setVerified(true); else toast(t(r.error), "err"); })}>{verified ? t("Confirmed") : t("Confirm code")}</button></div></div>
      <div className="del-actions"><Link href="/settings" className="btn btn-primary">{t("Keep my account")}</Link>
        <button className="btn btn-danger" disabled={!verified || pending} onClick={() => start(async () => { const r = await deleteMyAccount(typed, reason); if (r && !r.ok) toast(t(r.error), "err"); })}>{pending ? t("Deleting…") : t("Delete my account for good")}</button></div>
    </div>) : null}
  </div>);
}
