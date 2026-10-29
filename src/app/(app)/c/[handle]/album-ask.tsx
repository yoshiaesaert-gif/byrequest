"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { requestAlbum } from "../../actions";
import { toast } from "@/components/chrome";

const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const KINDS = [["looks", "Looks", "Outfit, hair, style. Face only if they show it."], ["body", "Body", "Physique and build, as they choose."], ["intimate", "Intimate, 18+", "Only if the creator agrees. Never shown in any feed."]] as const;

export default function AlbumAsk({ offerId, handle, album }: { offerId: string; handle: string; album: { id: string; status: string } | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"looks" | "body" | "intimate">("looks");
  const [state, setState] = useState(album?.status ?? null);
  const [pending, start] = useTransition();

  const card = !state ? (
    <div className="cp-al"><div className="cp-al-i"><Ico n="eye" /></div><div style={{ minWidth: 0 }}><b>{t("Want to see more first?")}</b><p className="t-sm muted">{t("Ask {name} for a few private photos. They open once, for 60 seconds, with your name as watermark. Then they are gone.", { name: handle })}</p></div><button className="btn btn-primary" onClick={() => setOpen(true)}>{t("Request preview album")}</button></div>
  ) : state === "requested" || state === "in_review" ? (
    <div className="cp-al"><div className="cp-al-i"><Ico n="clock" /></div><div style={{ minWidth: 0 }}><b>{state === "requested" ? "Preview album requested" : "Preview album is being reviewed"}</b><p className="t-sm muted">{state === "requested" ? `${handle} gets a neutral notification and decides whether to send it.` : "Every upload is reviewed before you can open it."}</p></div><span className="badge amber">{t("Waiting")}</span></div>
  ) : state === "ready" ? (
    <div className="cp-al is-ready"><div className="cp-al-i"><Ico n="gift" /></div><div style={{ minWidth: 0 }}><b>{t("Your preview album is ready")}</b><p className="t-sm muted">{t("Opens once. 60 seconds.")}</p></div><Link className="btn btn-brand" href={`/albums/${album!.id}`}>{t("Open once")}</Link></div>
  ) : (
    <div className="cp-al"><div className="cp-al-i"><Ico n="check" /></div><div style={{ minWidth: 0 }}><b>{state === "declined" ? "Not available" : "Viewed"}</b><p className="t-sm muted">{state === "declined" ? `${handle} chose not to send a preview.` : "The preview album is gone, on both sides."}</p></div></div>
  );

  return (<>
    {card}
    {open ? (
      <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <div className="sheet" role="dialog" aria-modal="true" aria-label={t("Request preview album")}>
          <div className="sheet-h"><div><span className="eyebrow">{t("Preview album")}</span><h3 className="t-h2" style={{ marginTop: 4 }}>{t("Ask {name} for a few photos", { name: handle })}</h3></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("Close")}><Ico n="x" /></button></div>
          <div className="field"><label>{t("What would you like to see?")}</label><div className="optrow">{KINDS.map(([k, l]) => <button key={k} className={"chip" + (kind === k ? " is-on" : "")} onClick={() => setKind(k)}>{t(l)}</button>)}</div><span className="t-sm muted">{t(KINDS.find((k) => k[0] === kind)![2])}</span></div>
          <div className="cp-rules"><div><Ico n="eye" c="sm" /><span>{t("Opens once, for 60 seconds")}</span></div><div><Ico n="lock" c="sm" /><span>{t("Your name as watermark on every photo")}</span></div><div><Ico n="x" c="sm" /><span>{t("Deleted on both sides after viewing")}</span></div><div><Ico n="shield" c="sm" /><span>{t("Reviewed before you can open it")}</span></div></div>
          <button className="btn btn-brand btn-lg btn-block" disabled={pending} onClick={() => start(async () => { const r = await requestAlbum(offerId, kind); if (r.ok) { setState("requested"); setOpen(false); toast(r.msg ?? "Sent"); } else toast(t(r.error), "err"); })}>{pending ? "Sending…" : "Send request"}</button>
          <p className="t-xs muted">{handle} can always say no. One preview album per offer. Free while you choose between offers.</p>
        </div>
      </div>) : null}
  </>);
}
