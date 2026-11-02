"use client";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";
import { withdrawBalance } from "../actions";

const enc = encodeURIComponent;
const CHANNELS: [string, string, (u: string, text: string) => string][] = [
  ["wa", "WhatsApp", (u, x) => `https://wa.me/?text=${enc(x + " " + u)}`],
  ["tg", "Telegram", (u, x) => `https://t.me/share/url?url=${enc(u)}&text=${enc(x)}`],
  ["sms", "SMS", (u, x) => `sms:?&body=${enc(x + " " + u)}`],
  ["sc", "Snapchat", (u) => `https://www.snapchat.com/scan?attachmentUrl=${enc(u)}`],
  ["ig", "Instagram", (u) => u],
  ["tt", "TikTok", (u) => u],
  ["x", "X", (u, x) => `https://x.com/intent/post?text=${enc(x)}&url=${enc(u)}`],
  ["mail", "E-mail", (u, x) => `mailto:?subject=ByRequest&body=${enc(x + " " + u)}`],
];
const Ico = ({ n }: { n: string }) => <svg className="ico sm" aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* The one link, with the phone's share sheet, copy, and a QR code to scan in person. */
export function ShareBox({ url, display, code, qr }: { url: string; display: string; code: string; qr: string }) {
  const t = useT();
  const [showQr, setQr] = useState(false);
  const note = (kind: string, ch?: string) => { try { navigator.sendBeacon?.("/api/ref-event", new Blob([JSON.stringify({ kind, ch })], { type: "application/json" })); } catch { /* not important */ } };
  // Each channel gets its own tag on the link, so staff see where opens and sign ups came from.
  const tag = (c: string) => `${url}?c=${c}`;
  const copy = async (s: string, ch?: string) => { if (!ch) note(s === code ? "code" : "copy"); try { await navigator.clipboard.writeText(s); toast(t("Copied")); } catch { toast(t("Copy did not work. Select the text and copy it."), "err"); } };
  const share = async () => {
    const text = t("Join me on ByRequest. Use my code {code} when you sign up.", { code });
    if (navigator.share) { note("share"); try { await navigator.share({ title: "ByRequest", text, url }); } catch { /* closed */ } } else copy(url);
  };
  return (<div className="inv-share">
    <span className="t-xs inv-share-l">{t("Your code")}</span>
    <button type="button" className="inv-codebig" onClick={() => copy(code)} aria-label={t("Copy code")}>{code}</button>
    <button type="button" className="inv-link" onClick={() => copy(url)}><span>{display}</span><Ico n="share" /></button>
    <div className="inv-btns">
      <button type="button" className="btn btn-primary" onClick={share}><Ico n="send" />{t("Share")}</button>
      <button type="button" className="btn btn-secondary" onClick={() => copy(url)}>{t("Copy link")}</button>
      <button type="button" className="btn btn-secondary inv-qrbtn" onClick={() => { note("qr"); setQr(true); }} aria-label={t("Show QR code")}><Ico n="image" />QR</button>
    </div>
    <div className="inv-ch" aria-label={t("Share through")}>
      {CHANNELS.map(([c, label, href]) => (<a key={c} className={"inv-ch-b ch-" + c} href={href(tag(c), t("Join me on ByRequest. Use my code {code} when you sign up.", { code }))} target="_blank" rel="noopener noreferrer"
        onClick={(e) => { note("share", c); if (c === "ig" || c === "tt") { e.preventDefault(); copy(tag(c), c); toast(t("Link copied. Paste it in your {app} story or bio.", { app: label })); } }}>{label}</a>))}
    </div>
    {showQr ? createPortal(<div className="scrim" onClick={(e) => e.target === e.currentTarget && setQr(false)}><div className="sheet inv-qr" role="dialog" aria-modal="true" aria-label={t("QR code")}>
      <div className="sheet-h"><b className="t-h3">{t("Let them scan this")}</b><button type="button" className="icon-btn" onClick={() => setQr(false)} aria-label={t("Close")}><Ico n="x" /></button></div>
      <div className="inv-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
      <p className="t-sm muted" style={{ textAlign: "center" }}>{t("Opens sign up with your code already filled in.")}</p>
    </div></div>, document.body) : null}
  </div>);
}

/* Transfer the whole balance to the person's own verified payout account. */
export function Withdraw({ balance, min, ready }: { balance: number; min: number; ready: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const ok = ready && balance >= min;
  return <button type="button" className="btn btn-primary" disabled={!ok || pending} title={!ready ? t("To transfer, set up your payouts once.") : balance < min ? t("You can transfer from €10.") : undefined}
    onClick={() => start(async () => { const r = await withdrawBalance(); if (r.ok) { toast(t(r.msg!)); router.refresh(); } else toast(t(r.error), "err"); })}>{pending ? t("Transferring…") : t("Transfer to my account")}</button>;
}
