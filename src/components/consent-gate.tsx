"use client";
import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { giveSensitiveConsent } from "@/app/(app)/actions";

/* Shown once to accounts created before explicit consent was asked at sign up. */
export default function ConsentGate() {
  const t = useT();
  const [on, setOn] = useState(false); const [p, start] = useTransition();
  return (<div className="wrap"><div className="va">
    <img src="/icon.png" alt="" width={48} height={48} style={{ borderRadius: 12 }} />
    <h1 className="t-h1">{t("One thing before you continue")}</h1>
    <p className="muted">{t("Requests, deals and content on ByRequest can say something about your sex life. The law treats that as sensitive data, so we ask your explicit consent to handle it for the service.")}</p>
    <label className="check"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> <span>{t("I explicitly agree that ByRequest handles my requests, deals and content for the purpose of the service. I can withdraw this by deleting my account.")} <a href="/legal/privacy" target="_blank">{t("Privacy statement")}</a></span></label>
    <button className="btn btn-primary btn-lg" disabled={!on || p} onClick={() => start(async () => { await giveSensitiveConsent(); })}>{t("Continue")}</button>
  </div></div>);
}
