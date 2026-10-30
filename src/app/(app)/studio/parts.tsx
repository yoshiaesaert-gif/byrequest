"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { answerAlbum, addParticipant } from "../actions";
import { Lightbox, UpTile, useUploads } from "@/components/uploads";
import { useRouter } from "next/navigation";
import { toast } from "@/components/chrome";

type Photo = { id: string; mediaId: string; kind: string; status: string; mime: string; durationSec: number | null };
/* Album tile: a photo, or a muted looping video with its length. */
function Tile({ p }: { p: Photo }) {
  return p.mime.startsWith("video/") ? <><video src={`/api/preview-photo/${p.id}`} muted loop playsInline autoPlay preload="metadata" /><span className="badge glass alb-len">▶ {p.durationSec ?? 0}s</span></> : <img src={`/api/preview-photo/${p.id}`} alt="" draggable={false} />;
}
const KINDS = [["looks", "Looks"], ["body", "Body"], ["intimate", "Intimate"]] as const;

/* The creator's own hidden album: up to six photos or videos, ready to share at once. Every file uploads on its own
   tile with its own progress; removing is instant; a tap opens it full screen. */
export function AlbumManager({ photos, max, canUpload }: { photos: Photo[]; max: number; canUpload: boolean }) {
  const t = useT();
  const router = useRouter();
  const [kind, setKind] = useState<"looks" | "body" | "intimate">("looks");
  const [added, setAdded] = useState<Photo[]>([]);
  const [gone, setGone] = useState<string[]>([]);
  const [view, setView] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const up = useUploads<Photo | undefined>({ endpoint: "/api/album/upload", field: "files", extra: () => ({ kind }), parse: (j) => (j.items as Photo[] | undefined)?.[0],
    onDone: (p, u) => { if (p) setAdded((a) => [...a, p]); window.setTimeout(() => up.remove(u.key), 450); } });
  const items = [...photos, ...added.filter((a) => !photos.some((p) => p.id === a.id))].filter((p) => p.status !== "rejected" && !gone.includes(p.id));
  const room = max - items.length - up.list.filter((u) => u.state !== "done").length;
  const pick = (files: File[]) => {
    setNote("");
    const ok = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const big = ok.find((f) => (f.type.startsWith("video/") ? f.size > 300 * 1048576 : f.size > 25 * 1048576));
    if (big) { setNote(t(big.type.startsWith("video/") ? "This video is larger than 300 MB. Shorten or compress it first." : "This photo is larger than 25 MB.")); return; }
    if (ok.length > room) setNote(t("Only {n} more fit in your album.", { n: Math.max(0, room) }));
    up.add(ok.slice(0, Math.max(0, room)));
  };
  const drop = async (id: string) => {
    setGone((g) => [...g, id]);
    const r = await fetch(`/api/album/upload?id=${id}`, { method: "DELETE" }).then((x) => x.json()).catch(() => ({ ok: false }));
    if (!r.ok) { setGone((g) => g.filter((x) => x !== id)); toast(t(r.error ?? "Could not remove it. Try again."), "err"); } else router.refresh();
  };
  return (<div className="alb">
    <div className="alb-grid">
      {items.map((p, i) => (<div key={p.id} className="alb-ph" role="button" tabIndex={0} onClick={() => setView(i)} onKeyDown={(e) => e.key === "Enter" && setView(i)}><Tile p={p} />
        <span className="badge glass alb-k">{t(KINDS.find((k) => k[0] === p.kind)?.[1] ?? "Looks")}</span>
        <button className="alb-x" aria-label={t("Remove")} onClick={(e) => { e.stopPropagation(); drop(p.id); }}><svg className="ico sm" aria-hidden="true"><use href="#i-x" /></svg></button></div>))}
      {up.list.map((u) => <UpTile key={u.key} u={u} onRemove={() => up.remove(u.key)} onRetry={() => up.retry(u.key)} />)}
      {room > 0 ? (canUpload ? <label className="alb-add"><input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={(e) => { pick(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <svg className="ico" aria-hidden="true"><use href="#i-plus" /></svg><span>{t("Add photos or a video")}</span><small>{items.length}/{max}</small></label>
        : <Link href="/onboarding" className="alb-add"><span>{t("Finish setup to add photos")}</span></Link>) : null}
    </div>
    {note ? <p className="up-note">{note}</p> : null}
    <div className="optrow alb-kind"><span className="t-sm muted">{t("New items are")}</span>{KINDS.map(([k, l]) => <button key={k} type="button" className={"chip" + (kind === k ? " is-on" : "")} onClick={() => setKind(k)}>{t(l)}</button>)}</div>
    <p className="t-xs muted" style={{ margin: 0 }}>{t("Photos up to 25 MB, shown 10 seconds each. One video up to 2 minutes and 300 MB, played once from start to end.")}</p>
    {view !== null ? <Lightbox items={items.map((p) => ({ src: `/api/preview-photo/${p.id}`, video: p.mime.startsWith("video/") }))} index={view} onClose={() => setView(null)} /> : null}
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
