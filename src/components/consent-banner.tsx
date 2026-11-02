"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";

/* Cookie choice, asked once on the first visit. Necessary cookies (sign in, language, safety) always
   work; visit statistics (IP, pages, clicks, time on site) run without cookies. "Accept all" only adds recognising you on a return visit and, later, recording sessions to improve the site. */
export const CONSENT = "brq_consent";
export const consent = () => (typeof document === "undefined" ? null : document.cookie.match(/(?:^|; )brq_consent=([^;]+)/)?.[1] ?? null);
export function setConsent(v: "all" | "necessary") {
  document.cookie = `${CONSENT}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.dispatchEvent(new CustomEvent("brq:consent", { detail: v }));
}

export default function ConsentBanner() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const open = () => setShow(true);
    const id = window.setTimeout(() => { if (!consent()) setShow(true); }, 0);
    window.addEventListener("brq:consent-open", open);
    return () => { clearTimeout(id); window.removeEventListener("brq:consent-open", open); };
  }, []);
  if (!show) return null;
  const pick = (v: "all" | "necessary") => { setConsent(v); setShow(false); };
  return (<div className="ck" role="dialog" aria-modal="false" aria-label={t("Cookies")}>
    <p className="ck-tx">{t("We use cookies to make the site work and better.")} <Link href="/legal/privacy">{t("More info")}</Link></p>
    <div className="ck-btns"><button type="button" className="ck-no" onClick={() => pick("necessary")}>{t("Decline")}</button><button type="button" className="btn btn-primary ck-ok" onClick={() => pick("all")}>{t("Accept")}</button></div>
  </div>);
}

export function CookieSettingsLink({ label }: { label: string }) {
  return <button type="button" className="ft-ck" onClick={() => window.dispatchEvent(new CustomEvent("brq:consent-open"))}>{label}</button>;
}
