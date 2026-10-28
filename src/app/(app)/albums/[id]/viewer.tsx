"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

export default function Viewer({ id, count, seconds, handle }: { id: string; count: number; seconds: number; handle: string }) {
  const tr = useT();
  const [t, setT] = useState(seconds);
  const router = useRouter();
  useEffect(() => {
    const h = setInterval(() => setT((x) => { if (x <= 1) { clearInterval(h); router.refresh(); return 0; } return x - 1; }), 1000);
    const blur = () => document.body.classList.add("vblur");
    const unblur = () => document.body.classList.remove("vblur");
    window.addEventListener("blur", blur); window.addEventListener("focus", unblur);
    return () => { clearInterval(h); window.removeEventListener("blur", blur); window.removeEventListener("focus", unblur); unblur(); };
  }, [router]);
  const wm = Array.from({ length: 40 }, (_, i) => <span key={i}>{handle} · view once</span>);
  return (
    <div className="scrim" style={{ position: "fixed" }}>
      <div className="viewer media" role="dialog" aria-modal="true" aria-label={tr("Preview album")} onContextMenu={(e) => e.preventDefault()}>
        <span className="neutralbg" style={{ background: "#15171B" }} />
        <div className={"al-grid" + (count === 1 ? " one" : "")}>{Array.from({ length: count }, (_, i) => (
          <div key={i} className="al-ph" style={{ overflow: "hidden" }}><img src={`/api/album/${id}/${i}`} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }} /></div>))}</div>
        <div className="wm">{wm}</div>
        <div className="vt"><span className="badge glass"><svg className="ico sm" aria-hidden="true"><use href="#i-clock" /></svg>0:{String(t).padStart(2, "0")}</span>
          <button className="icon-btn" onClick={() => router.push("/deals")} aria-label={tr("Close")} style={{ color: "#fff", background: "rgba(255,255,255,.16)" }}><svg className="ico" aria-hidden="true"><use href="#i-x" /></svg></button></div>
        <div className="vb"><div><b style={{ fontSize: "1.25rem", letterSpacing: "-.02em" }}>{tr("Preview album")}</b><div className="t-sm" style={{ opacity: 0.8 }}>{tr("View once · gone when the timer ends")}</div></div>
          <div className="optrow"><span className="badge glass">{tr("Your name as watermark")}</span><span className="badge glass">{tr("No download")}</span></div></div>
      </div>
    </div>
  );
}
