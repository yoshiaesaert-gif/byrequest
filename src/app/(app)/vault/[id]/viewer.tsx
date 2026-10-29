"use client";
import { useT } from "@/i18n/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* Private viewer: no download control, no context menu, blurred when the window loses focus,
   and the buyer's name floats over every frame. */
export default function Viewer({ items, start, title, by, handle, until }: { items: { id: string; mime: string }[]; start: number; title: string; by: string; handle: string; until: string | null }) {
  const t = useT();
  const [i, setI] = useState(start);
  const [now] = useState(() => Date.now());
  const router = useRouter();
  const it = items[i];
  useEffect(() => {
    const blur = () => document.body.classList.add("vblur"), unblur = () => document.body.classList.remove("vblur");
    const key = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setI((x) => Math.min(items.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); if (e.key === "Escape") router.push("/vault"); };
    window.addEventListener("blur", blur); window.addEventListener("focus", unblur); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("blur", blur); window.removeEventListener("focus", unblur); window.removeEventListener("keydown", key); unblur(); };
  }, [items.length, router]);
  const days = until ? Math.ceil((new Date(until).getTime() - now) / 86400_000) : null;
  const wm = Array.from({ length: 48 }, (_, k) => <span key={k}>{handle} · {it.id.slice(0, 4).toUpperCase()}</span>);
  return (
    <div className="scrim" style={{ position: "fixed" }} onClick={(e) => e.target === e.currentTarget && router.push("/vault")}>
      <div className="viewer media" role="dialog" aria-modal="true" aria-label={title} onContextMenu={(e) => e.preventDefault()} style={{ background: "#000" }}>
        {it.mime.startsWith("image/") ? <img key={it.id} className="vimg" src={`/api/media/${it.id}`} alt="" draggable={false} />
          : it.mime.startsWith("video/") ? <video key={it.id} className="vplayer" src={`/api/media/${it.id}`} controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture playsInline />
          : <audio key={it.id} src={`/api/media/${it.id}`} controls controlsList="nodownload" style={{ position: "absolute", left: 16, right: 16, top: "45%", zIndex: 2, width: "calc(100% - 32px)" }} />}
        <div className="wm">{wm}</div>
        <div className="vt"><span className="badge glass"><Ico n="clock" c="sm" />{days === null ? t("Forever") : days <= 1 ? t("Last day") : t("{n} days left", { n: days })}</span>
          <button className="icon-btn" onClick={() => router.push("/vault")} aria-label={t("Close")} style={{ color: "#fff", background: "rgba(255,255,255,.16)" }}><Ico n="x" /></button></div>
        <div className="vb"><div><b style={{ fontSize: "1.25rem", letterSpacing: "-.02em" }}>{title}</b><div className="t-sm" style={{ opacity: 0.8 }}>{t("from")} {by}{items.length > 1 ? ` · ${t("{n} of {total}", { n: i + 1, total: items.length })}` : ""}</div></div>
          <div className="optrow">{items.length > 1 ? <><button className="badge glass" onClick={() => setI(Math.max(0, i - 1))} aria-label={t("Previous")}><Ico n="left" c="sm" /></button><button className="badge glass" onClick={() => setI(Math.min(items.length - 1, i + 1))} aria-label={t("Next")}><Ico n="right" c="sm" /></button></> : null}
            <span className="badge glass"><Ico n="lock" c="sm" />{t("No download")}</span><span className="badge glass"><Ico n="shield" c="sm" />{t("Watermarked for you")}</span></div></div>
      </div>
    </div>
  );
}
