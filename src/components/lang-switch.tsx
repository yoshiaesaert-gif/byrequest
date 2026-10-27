"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_LABEL } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { setLanguage } from "@/i18n/actions";

export default function LangSwitch({ className }: { className?: string }) {
  const cur = useLocale(); const router = useRouter(); const [p, start] = useTransition();
  return <div className={"lang " + (className ?? "")} role="group" aria-label="Language">{LOCALES.map((l) => (
    <button key={l} type="button" disabled={p} aria-pressed={l === cur} className={l === cur ? "on" : ""} onClick={() => start(async () => { await setLanguage(l); router.refresh(); })} title={LOCALE_LABEL[l]}>{l.toUpperCase()}</button>))}</div>;
}
