"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestAlbum } from "../../actions";
import { toast } from "@/components/chrome";

const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* A buyer who is choosing can ask a candidate for a private preview: a few photos, each shown once
   for 10 seconds. At most 5 candidates per request, so it helps choosing and never turns into a gallery. */
export default function AlbumAsk({ offerId, handle, album, left }: { offerId: string; handle: string; album: { id: string; status: string } | null; left: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [asked, setAsked] = useState(false);
  const state = album?.status ?? (asked ? "requested" : null);
  // While you wait, the card turns into "ready" by itself once the creator shared.
  useEffect(() => { if (state !== "requested") return; const h = setInterval(() => router.refresh(), 8000); return () => clearInterval(h); }, [state, router]);
  const [pending, start] = useTransition();

  const card = !state ? (
    <div className="cp-al"><div className="cp-al-i"><Ico n="eye" /></div><div style={{ minWidth: 0 }}><b>{t("Want to see more first?")}</b><p className="t-sm muted">{left > 0 ? t("Ask {name} for a private preview. Each photo shows once, for 10 seconds. {n} of 5 asks left for this request.", { name: handle, n: left }) : t("You already asked 5 candidates for a preview on this request.")}</p></div>{left > 0 ? <button className="btn btn-primary" onClick={() => setOpen(true)}>{t("Ask for a preview")}</button> : null}</div>
  ) : state === "requested" ? (
    <div className="cp-al"><div className="cp-al-i"><Ico n="clock" /></div><div style={{ minWidth: 0 }}><b>{t("Preview asked")}</b><p className="t-sm muted">{t("{name} gets a discreet notification and decides whether to share.", { name: handle })}</p></div><span className="cp-wait"><i />{t("Waiting")}</span></div>
  ) : state === "ready" || state === "opened" ? (
    <div className="cp-al is-ready"><div className="cp-al-i"><Ico n="gift" /></div><div style={{ minWidth: 0 }}><b>{t("Your preview is ready")}</b><p className="t-sm muted">{t("Each photo shows once, for 10 seconds. Take your time to open it.")}</p></div><Link className="btn btn-brand" href={`/albums/${album!.id}`}>{t("Open")}</Link></div>
  ) : (
    <div className="cp-al"><div className="cp-al-i"><Ico n="check" /></div><div style={{ minWidth: 0 }}><b>{state === "declined" ? t("Not shared") : t("Viewed")}</b><p className="t-sm muted">{state === "declined" ? t("{name} chose not to share a preview.", { name: handle }) : t("The preview is gone. Nothing was kept.")}</p></div></div>
  );

  return (<>
    {card}
    {open ? (
      <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <div className="sheet" role="dialog" aria-modal="true" aria-label={t("Ask for a preview")}>
          <div className="sheet-h"><div><span className="eyebrow">{t("Private preview")}</span><h3 className="t-h2" style={{ marginTop: 4 }}>{t("Ask {name} to show a bit more", { name: handle })}</h3></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("Close")}><Ico n="x" /></button></div>
          <p className="t-sm muted">{t("{name} keeps a small private album and picks what to share with you. Every photo was checked by our team.", { name: handle })}</p>
          <div className="cp-rules"><div><Ico n="eye" c="sm" /><span>{t("Each photo once, 10 seconds")}</span></div><div><Ico n="lock" c="sm" /><span>{t("Your name on every photo")}</span></div><div><Ico n="x" c="sm" /><span>{t("Gone after viewing, nothing kept")}</span></div><div><Ico n="shield" c="sm" /><span>{t("Max 5 candidates per request")}</span></div></div>
          <button className="btn btn-brand btn-lg btn-block" disabled={pending} onClick={() => start(async () => { const r = await requestAlbum(offerId); if (r.ok) { setAsked(true); setOpen(false); toast(t(r.msg ?? "Sent")); } else toast(t(r.error), "err"); })}>{pending ? t("Sending…") : t("Send request")}</button>
          <p className="t-xs muted">{t("{name} can always say no. Free while you choose. {n} of 5 asks left.", { name: handle, n: left })}</p>
        </div>
      </div>) : null}
  </>);
}
