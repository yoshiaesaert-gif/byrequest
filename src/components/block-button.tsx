"use client";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/(app)/actions";
import { toast } from "@/components/chrome";
import { useT } from "@/i18n/client";

const Ico = ({ n }: { n: string }) => <svg className="ico sm" aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* Block, with a clear sheet that says what happens, and the option to report in the same step.
   Reporting stays a separate, always available link next to it. */
export function BlockButton({ handle, requestId, after, label }: { handle: string; requestId?: string; after?: string; label?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [pending, start] = useTransition();
  const go = () => start(async () => {
    const r = await blockUser(requestId ? { requestId } : { handle });
    if (!r.ok) { toast(t(r.error), "err"); return; }
    setOpen(false);
    toast(t("{name} is blocked", { name: handle }));
    if (report) router.push(requestId ? `/report?type=request&ref=${requestId}` : `/report?type=profile&ref=${encodeURIComponent(handle)}`);
    else if (after) router.push(after);
    else router.refresh();
  });
  return (<>
    <button type="button" className="report-link" onClick={() => setOpen(true)}><Ico n="block" />{label ?? t("Block {name}", { name: handle })}</button>
    {open ? createPortal(<div className="scrim" onClick={(e) => e.target === e.currentTarget && !pending && setOpen(false)}>
      <div className="sheet block-sheet" role="dialog" aria-modal="true" aria-label={t("Block {name}", { name: handle })}>
        <div className="sheet-h"><div><b className="t-h3">{t("Block {name}?", { name: handle })}</b><p className="t-sm muted" style={{ marginTop: 4 }}>{t("They are not told. You can undo it any time in your settings.")}</p></div>
          <button type="button" className="icon-btn" aria-label={t("Close")} onClick={() => setOpen(false)}><Ico n="x" /></button></div>
        <ul className="block-list">
          <li><Ico n="x" />{t("No more applications, offers or new deals between you")}</li>
          <li><Ico n="eyeoff" />{t("You no longer see each other's requests or profile")}</li>
          <li><Ico n="lock" />{t("Your chats with each other stop")}</li>
          <li><Ico n="shield" />{t("A deal that is already running stays protected: delivery, review and refund work as usual")}</li>
        </ul>
        <label className="block-report"><input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /><span><b>{t("Also report {name}", { name: handle })}</b><small>{t("For anything unsafe or against the rules. A person looks at every report.")}</small></span></label>
        <div className="block-actions"><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>{t("Cancel")}</button>
          <button type="button" className="btn btn-danger" onClick={go} disabled={pending}>{pending ? t("Blocking…") : t("Block")}</button></div>
      </div></div>, document.body) : null}
  </>);
}

export function UnblockButton({ handle, name, className }: { handle: string; name?: string; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" className={className ?? "btn btn-secondary btn-sm"} disabled={pending} onClick={() => start(async () => { const r = await unblockUser(handle); toast(r.ok ? t("{name} is unblocked", { name: name ?? handle }) : t(r.error), r.ok ? undefined : "err"); router.refresh(); })}>{t("Unblock")}</button>;
}
