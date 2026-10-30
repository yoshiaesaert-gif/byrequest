"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { closePreview } from "../../actions";

/* One photo at a time, each for its own 10 seconds, then the next. No going back, no download,
   blurred as soon as the window loses focus. The server refuses a photo after its turn, so this
   screen is a courtesy: the real limit lives on the server. */
export default function Viewer({ id, items, start, handle }: { id: string; items: { video: boolean; seconds: number }[]; start: number; handle: string }) {
  const count = items.length;
  const tr = useT();
  const [n, setN] = useState(start);
  const [muted, setMuted] = useState(true);
  const seconds = items[Math.min(n, count - 1)]?.seconds ?? 10;
  const [ms, setMs] = useState(seconds * 1000);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const done = n >= count;
  const t0 = useRef(0);

  useEffect(() => {
    if (done) { closePreview(id); return; }
    if (!ready) return;
    t0.current = performance.now();
    const h = setInterval(() => {
      const left = seconds * 1000 - (performance.now() - t0.current);
      if (left <= 0) { clearInterval(h); setReady(false); setFailed(false); setMs((items[n + 1]?.seconds ?? 10) * 1000); setN((x) => x + 1); } else setMs(left);
    }, 100);
    return () => clearInterval(h);
  }, [n, ready, done, id, seconds, items]);

  useEffect(() => {
    const off = () => setHidden(true);
    const on = () => setHidden(document.visibilityState !== "visible");
    const key = (e: KeyboardEvent) => { if (e.key === "PrintScreen" || ((e.metaKey || e.ctrlKey) && ["s", "p"].includes(e.key.toLowerCase()))) { e.preventDefault(); setHidden(true); } };
    window.addEventListener("blur", off); window.addEventListener("focus", on); document.addEventListener("visibilitychange", on); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("blur", off); window.removeEventListener("focus", on); document.removeEventListener("visibilitychange", on); window.removeEventListener("keydown", key); };
  }, []);

  const wm = Array.from({ length: 36 }, (_, i) => <span key={i}>{handle} · byrequest</span>);
  return (
    <div className="scrim" style={{ position: "fixed" }}>
      <div className={"viewer media alb-view" + (hidden ? " is-hidden" : "")} role="dialog" aria-modal="true" aria-label={tr("Private preview")} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
        <span className="neutralbg" style={{ background: "#0E1013" }} />
        <div className="alb-bars">{Array.from({ length: count }, (_, i) => <i key={i}><b style={{ width: i < n ? "100%" : i > n ? "0%" : `${100 - (ms / (seconds * 1000)) * 100}%` }} className={items[i].video ? "v" : ""} /></i>)}</div>
        {done ? (
          <div className="alb-end"><b className="t-h2">{tr("That was the preview")}</b><p className="t-sm" style={{ opacity: 0.75 }}>{tr("The preview is gone. Nothing was kept on your device.")}</p><Link href="/deals" className="btn btn-primary">{tr("Back to your offers")}</Link></div>
        ) : failed ? (
          <div className="alb-end"><b className="t-h3">{tr("This one is gone")}</b><p className="t-sm" style={{ opacity: 0.75 }}>{tr("Its turn already passed.")}</p><button className="btn btn-primary" onClick={() => { setFailed(false); setN((x) => x + 1); }}>{tr("Next")}</button></div>
        ) : (
          <div className="alb-stage">{items[n].video
            ? <><video key={n} src={`/api/album/${id}/${n}`} autoPlay muted={muted} playsInline disablePictureInPicture controls={false} controlsList="nodownload noplaybackrate noremoteplayback" onPlaying={() => setReady(true)} onEnded={() => { setReady(false); setMs((items[n + 1]?.seconds ?? 10) * 1000); setN((x) => x + 1); }} onError={() => setFailed(true)} />
              <button className="alb-snd" onClick={() => setMuted((m) => !m)}>{muted ? tr("Tap for sound") : tr("Mute")}</button></>
            : <img key={n} src={`/api/album/${id}/${n}`} alt="" draggable={false} ref={(el) => { if (el?.complete && el.naturalWidth) setReady(true); }} onLoad={() => setReady(true)} onError={() => setFailed(true)} />}</div>
        )}
        <div className="wm">{wm}</div>
        {hidden && !done ? <div className="alb-cover"><b>{tr("Paused for your privacy")}</b><span className="t-sm">{tr("Come back to this window. The timer keeps running.")}</span></div> : null}
        <div className="vt"><span className="badge glass">{done ? tr("Done") : `${Math.min(n + 1, count)} / ${count} · ${Math.ceil(ms / 1000)}s`}</span>
          <Link href="/deals" className="icon-btn" aria-label={tr("Close")} style={{ color: "#fff", background: "rgba(255,255,255,.16)" }}><svg className="ico" aria-hidden="true"><use href="#i-x" /></svg></Link></div>
        <div className="vb"><div className="optrow"><span className="badge glass">{tr("Photos 10 seconds, videos once")}</span><span className="badge glass">{tr("Your name on everything")}</span></div></div>
      </div>
    </div>
  );
}
