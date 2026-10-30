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
    <div className="ck-tx"><b>{t("Cookies, your choice")}</b>
      <p>{t("We use necessary cookies to keep you signed in and safe. To run and protect ByRequest we measure visits without cookies: IP address for an estimated location, pages, clicks and time on site. With your permission we also recognise you when you return and record sessions to improve the site. Never shared, never sold.")} <Link href="/legal/privacy">{t("Privacy statement")}</Link></p></div>
    <div className="ck-btns"><button type="button" className="btn btn-secondary" onClick={() => pick("necessary")}>{t("Only necessary")}</button><button type="button" className="btn btn-primary" onClick={() => pick("all")}>{t("Accept all")}</button></div>
  </div>);
}

export function CookieSettingsLink({ label }: { label: string }) {
  return <button type="button" className="ft-ck" onClick={() => window.dispatchEvent(new CustomEvent("brq:consent-open"))}>{label}</button>;
}
