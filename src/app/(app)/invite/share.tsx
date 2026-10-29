"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";

const Ico = ({ n }: { n: string }) => <svg className="ico sm" aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* One invite link with copy and the phone's share sheet. */
export function ShareLink({ kind, url, code, title, text }: { kind: "earn" | "buy"; url: string; code: string; title: string; text: string }) {
  const t = useT();
  const [copied, setCopied] = useState<"url" | "code" | null>(null);
  const copy = async (what: "url" | "code") => {
    try { await navigator.clipboard.writeText(what === "url" ? url : code); setCopied(what); toast(t("Copied")); setTimeout(() => setCopied(null), 1800); } catch { toast(t("Copy did not work. Select the text and copy it."), "err"); }
  };
  const share = async () => {
    const msg = kind === "earn" ? t("Join me on ByRequest and earn by making what people ask for.") : t("Join me on ByRequest. Your first service fee is on them.");
    if (navigator.share) { try { await navigator.share({ title: "ByRequest", text: msg, url }); } catch { /* closed */ } } else copy("url");
  };
  return (<div className={"card inv-link inv-" + kind}>
    <div><b className="t-h3">{title}</b><p className="t-sm muted">{text}</p></div>
    <div className="inv-url"><span title={url}>{url.replace(/^https?:\/\//, "")}</span><button type="button" className="btn btn-secondary btn-sm" onClick={() => copy("url")}>{copied === "url" ? t("Copied") : t("Copy")}</button></div>
    <div className="inv-actions"><button type="button" className="btn btn-primary" onClick={share}><Ico n="share" />{t("Share")}</button>
      <button type="button" className="inv-code" onClick={() => copy("code")} aria-label={t("Copy code")}>{t("Code")} <b>{code}</b></button></div>
  </div>);
}
