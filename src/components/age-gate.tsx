"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";

/* 18+ warning before any adult content, required by the card networks. Shown once per browser to
   visitors who are not signed in; signed in members confirmed their age when they joined. */
export default function AgeGate() {
  const t = useT();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const enter = () => { document.cookie = `brq_18=1; path=/; max-age=${400 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`; setOpen(false); };
  return (<div className="ag" role="dialog" aria-modal="true" aria-labelledby="ag-h">
    <div className="ag-card">
      <img src="/logo.png" alt="byrequest" className="ag-logo" />
      <span className="ag-18">18+</span>
      <h2 id="ag-h">{t("Adults only")}</h2>
      <p>{t("ByRequest contains sexually explicit content intended for adults. Enter only if you are at least 18 years old, or the age of majority where you live, and if viewing such content is legal for you.")}</p>
      <div className="ag-b"><button type="button" className="btn btn-primary btn-lg btn-block" onClick={enter}>{t("I am 18 or older, enter")}</button><a className="btn btn-ghost btn-block" href="https://www.google.com" rel="noreferrer">{t("Leave")}</a></div>
      <p className="ag-f">{t("By entering you accept our")} <a href="/legal/terms">{t("Terms of use")}</a>. <a href="/legal/2257">18 U.S.C. 2257</a></p>
    </div>
  </div>);
}
