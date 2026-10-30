"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { answerAlbum, addParticipant, removePreviewPhoto } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "@/components/chrome";

type Photo = { id: string; mediaId: string; kind: string; status: string; mime: string; durationSec: number | null };
/* Album tile: a photo, or a muted looping video with its length. */
function Tile({ p }: { p: Photo }) {
  return p.mime.startsWith("video/") ? <><video src={`/api/preview-photo/${p.id}`} muted loop playsInline autoPlay preload="metadata" /><span className="badge glass alb-len">▶ {p.durationSec ?? 0}s</span></> : <img src={`/api/preview-photo/${p.id}`} alt="" draggable={false} />;
}
const KINDS = [["looks", "Looks"], ["body", "Body"], ["intimate", "Intimate"]] as const;

/* The creator's own hidden album: up to six photos or videos, each checked before it can be shared. Uploads go through
   a plain route with a progress bar, so a large video never blocks the page and a new release never breaks it. */
export function AlbumManager({ photos, max, canUpload }: { photos: Photo[]; max: number; canUpload: boolean }) {
  const t = useT();
  const router = useRouter();
  const [kind, setKind] = useState<"looks" | "body" | "intimate">("looks");
  const [pending, start] = useTransition();
  const [pct, setPct] = useState<number | null>(null);
  const live = photos.filter((p) => p.status !== "rejected");
  const send = (files: File[]) => {
    if (!files.length) return;
    const f = new FormData(); files.forEach((x) => f.append("files", x)); f.set("kind", kind);
    const x = new XMLHttpRequest();
    x.open("POST", "/api/album/upload");
    x.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { setPct(null); let j: { ok?: boolean; msg?: string; error?: string } = {}; try { j = JSON.parse(x.responseText); } catch { /* not json */ } toast(t(j.ok ? j.msg! : j.error ?? "Upload failed. Please try again."), j.ok ? "ok" : "err"); router.refresh(); };
    x.onerror = () => { setPct(null); toast(t("Upload failed. Check your connection and try again."), "err"); };
    setPct(0); x.send(f);
  };
  const busy = pct !== null;
  return (<div className="alb">
    <div className="alb-grid">{live.map((p) => (
      <div key={p.id} className="alb-ph"><Tile p={p} />
        <span className={"badge alb-st " + (p.status === "approved" ? "ok" : "amber")}>{t(p.status === "approved" ? "Ready to share" : "Being checked")}</span>
        <span className="badge glass alb-k">{t(KINDS.find((k) => k[0] === p.kind)?.[1] ?? "Looks")}</span>
        <button className="alb-x" aria-label={t("Remove")} disabled={pending || busy} onClick={() => start(async () => { const r = await removePreviewPhoto(p.id); toast(r.ok ? t(r.msg!) : t(r.error), r.ok ? "ok" : "err"); router.refresh(); })}><svg className="ico sm" aria-hidden="true"><use href="#i-x" /></svg></button></div>))}
      {live.length < max ? (canUpload ? <label className={"alb-add" + (busy ? " is-busy" : "")}><input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden disabled={busy} onChange={(e) => { send(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        {busy ? <><span className="alb-pct">{pct}%</span><span>{pct! < 100 ? t("Uploading…") : t("Processing…")}</span><i className="alb-prog"><b style={{ width: `${pct}%` }} /></i></> : <><svg className="ico" aria-hidden="true"><use href="#i-plus" /></svg><span>{t("Add photos or a video")}</span><small>{live.length}/{max}</small></>}</label>
        : <Link href="/onboarding" className="alb-add"><span>{t("Finish setup to add photos")}</span></Link>) : null}
    </div>
    <div className="optrow alb-kind"><span className="t-sm muted">{t("New items are")}</span>{KINDS.map(([k, l]) => <button key={k} type="button" className={"chip" + (kind === k ? " is-on" : "")} onClick={() => setKind(k)}>{t(l)}</button>)}</div>
    <p className="t-xs muted" style={{ margin: 0 }}>{t("Photos show 10 seconds each. A video plays once, from start to end, at most 2 minutes.")}</p>
  </div>);
}

/* A buyer who is choosing asks to see more. The creator shares (picks which approved photos) or says no. */
export function AlbumAnswer({ id, title, photos, canShare }: { id: string; title: string; photos: Photo[]; canShare: boolean }) {
  const t = useT();
  const ready = photos.filter((p) => p.status === "approved");
  const [pick, setPick] = useState<string[]>(ready.map((p) => p.id));
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return null;
  const go = (share: string[] | null) => start(async () => { const r = await answerAlbum(id, share); toast(r.ok ? t(r.msg!) : t(r.error), r.ok ? "ok" : "err"); if (r.ok) setDone(true); });
  return (<div className="alb-req">
    <div><b>{t("A buyer would like to see more")}</b><div className="t-sm muted">{t("For: {title}", { title })} · {t("They see each photo once for 10 seconds and each video once, with their name on it.")}</div></div>
    {ready.length ? <div className="alb-pick">{ready.map((p) => <label key={p.id} className={"alb-pk" + (pick.includes(p.id) ? " is-on" : "")}><input type="checkbox" hidden checked={pick.includes(p.id)} onChange={(e) => setPick(e.target.checked ? [...pick, p.id] : pick.filter((x) => x !== p.id))} /><Tile p={p} /></label>)}</div>
      : <p className="t-sm muted">{t("Your album has no approved photos yet. Add some above.")}</p>}
    <div className="optrow"><button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => go(null)}>{t("No thanks")}</button>
      <button className="btn btn-primary btn-sm" disabled={pending || !canShare || !pick.length} onClick={() => go(pick)}>{t("Share {n} items", { n: pick.length })}</button></div>
  </div>);
}

export function AddParticipant() {
  const t = useT();
  const [label, setLabel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (<div className="upbox" style={{ padding: "14px 0" }}>
    <div className="field"><label htmlFor="pl">{t("Private label, only for you")}</label><div style={{ display: "flex", gap: 8 }}><input id="pl" className="input" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("For example: training partner")} />
      <button className="btn btn-primary" disabled={pending || !label.trim()} onClick={() => start(async () => { const r = await addParticipant(label); if (r.ok) { setLink(r.link!); setLabel(""); } else toast(t(r.error), "err"); })}>{t("Add")}</button></div></div>
    {link ? <div className="banner info" style={{ margin: 0 }}><div className="grow"><b>{t("Send this private link to them yourself")}</b><div className="t-sm" style={{ wordBreak: "break-all" }}>{link}</div><div className="t-xs muted">{t("It is shown only now. Anyone with the link can verify and consent for this person.")}</div></div><button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(link); toast(t("Link copied")); }}>{t("Copy")}</button></div> : null}
  </div>);
}
