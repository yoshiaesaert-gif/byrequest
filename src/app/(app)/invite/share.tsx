"use client";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";
import { changeRefCode } from "../actions";

const Ico = ({ n }: { n: string }) => <svg className="ico sm" aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* The one link, with the phone's share sheet, copy, and a QR code to scan in person. */
export function ShareBox({ url, display, code, qr }: { url: string; display: string; code: string; qr: string }) {
  const t = useT();
  const [showQr, setQr] = useState(false);
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); toast(t("Copied")); } catch { toast(t("Copy did not work. Select the text and copy it."), "err"); } };
  const share = async () => {
    const text = t("Join me on ByRequest. Use my code {code} when you sign up.", { code });
    if (navigator.share) { try { await navigator.share({ title: "ByRequest", text, url }); } catch { /* closed */ } } else copy(url);
  };
  return (<div className="inv-share">
    <span className="t-xs inv-share-l">{t("Your code")}</span>
    <button type="button" className="inv-codebig" onClick={() => copy(code)} aria-label={t("Copy code")}>{code}</button>
    <button type="button" className="inv-link" onClick={() => copy(url)}><span>{display}</span><Ico n="share" /></button>
    <div className="inv-btns">
      <button type="button" className="btn btn-primary" onClick={share}><Ico n="send" />{t("Share")}</button>
      <button type="button" className="btn btn-secondary" onClick={() => copy(url)}>{t("Copy link")}</button>
      <button type="button" className="btn btn-secondary inv-qrbtn" onClick={() => setQr(true)} aria-label={t("Show QR code")}><Ico n="image" />QR</button>
    </div>
    {showQr ? createPortal(<div className="scrim" onClick={(e) => e.target === e.currentTarget && setQr(false)}><div className="sheet inv-qr" role="dialog" aria-modal="true" aria-label={t("QR code")}>
      <div className="sheet-h"><b className="t-h3">{t("Let them scan this")}</b><button type="button" className="icon-btn" onClick={() => setQr(false)} aria-label={t("Close")}><Ico n="x" /></button></div>
      <div className="inv-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
      <p className="t-sm muted" style={{ textAlign: "center" }}>{t("Opens sign up with your code already filled in.")}</p>
    </div></div>, document.body) : null}
  </div>);
}

/* Change the code into something easy to say. The old link stops working. */
export function CodeEditor({ code }: { code: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(code);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="linkbtn inv-edit" onClick={() => setOpen(true)}>{t("Make your own code, like SAM or LUCA10")}</button>;
  return (<form className="card inv-codeform" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changeRefCode(v); if (r.ok) { toast(t("Your new code is ready")); setOpen(false); router.refresh(); } else toast(t(r.error), "err"); }); }}>
    <label htmlFor="rc"><b>{t("Your own code")}</b><span className="t-xs muted">{t("3 to 12 letters or numbers. Your current link stops working.")}</span></label>
    <div className="inv-codeform-row"><input id="rc" className="input" value={v} maxLength={12} autoCapitalize="characters" autoComplete="off" onChange={(e) => setV(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} />
      <button className="btn btn-primary" disabled={pending || v.length < 3 || v === code}>{pending ? t("Saving…") : t("Save")}</button></div>
  </form>);
}
