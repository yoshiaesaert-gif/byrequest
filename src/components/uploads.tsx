"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";

/* One upload engine for the whole app: every file gets its own request, so files go up in parallel, each with its
   own preview, progress, cancel and retry. Plain routes, not server actions, so a new release never breaks a running upload. */
export type Up<R = unknown> = { key: string; file: File; url: string; pct: number; state: "up" | "done" | "err"; error?: string; result?: R };

export function useUploads<R>(opts: { endpoint: string; field?: string; extra?: () => Record<string, string>; parse: (j: Record<string, unknown>) => R; onDone?: (r: R, u: Up<R>) => void }) {
  const [list, setList] = useState<Up<R>[]>([]);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const o = useRef(opts);
  useEffect(() => { o.current = opts; });
  const patch = (key: string, p: Partial<Up<R>>) => setList((l) => l.map((u) => (u.key === key ? { ...u, ...p } : u)));
  const start = useCallback((u: Up<R>) => {
    const f = new FormData(); f.append(o.current.field ?? "file", u.file);
    for (const [k, v] of Object.entries(o.current.extra?.() ?? {})) f.set(k, v);
    const x = new XMLHttpRequest(); xhrs.current.set(u.key, x);
    x.open("POST", o.current.endpoint);
    x.upload.onprogress = (e) => { if (e.lengthComputable) patch(u.key, { pct: Math.min(99, Math.round((e.loaded / e.total) * 100)) }); };
    x.onload = () => {
      xhrs.current.delete(u.key);
      let j: Record<string, unknown> = {}; try { j = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status < 300 && j.ok) { const r = o.current.parse(j); patch(u.key, { pct: 100, state: "done", result: r }); o.current.onDone?.(r, u); }
      else patch(u.key, { state: "err", error: String(j.error ?? "Upload failed. Try again.") });
    };
    x.onerror = () => { xhrs.current.delete(u.key); patch(u.key, { state: "err", error: "No connection. Try again." }); };
    x.send(f);
  }, []);
  const add = useCallback((files: File[]) => {
    const ups = files.map((file) => ({ key: Math.random().toString(36).slice(2), file, url: URL.createObjectURL(file), pct: 0, state: "up" as const }));
    setList((l) => [...l, ...ups]); ups.forEach(start);
  }, [start]);
  const remove = useCallback((key: string) => { xhrs.current.get(key)?.abort(); xhrs.current.delete(key); setList((l) => { const u = l.find((x) => x.key === key); if (u) URL.revokeObjectURL(u.url); return l.filter((x) => x.key !== key); }); }, []);
  const retry = useCallback((key: string) => setList((l) => l.map((u) => { if (u.key !== key) return u; const n = { ...u, pct: 0, state: "up" as const, error: undefined }; start(n); return n; })), [start]);
  useEffect(() => () => { xhrs.current.forEach((x) => x.abort()); }, []);
  return { list, add, remove, retry, busy: list.some((u) => u.state === "up") };
}

/* A tile while it uploads: the local preview straight away, a progress ring, and cancel or retry. */
export function UpTile<R>({ u, onRemove, onRetry }: { u: Up<R>; onRemove: () => void; onRetry: () => void }) {
  const t = useT();
  const kind = u.file.type.split("/")[0];
  return (<div className={"up-t" + (u.state === "err" ? " is-err" : u.state === "done" ? " is-done" : "")}>
    {kind === "image" ? <img src={u.url} alt="" /> : kind === "video" ? <video src={u.url} muted playsInline preload="metadata" /> : <span className="up-aud"><svg className="ico" aria-hidden="true"><use href="#i-mic" /></svg></span>}
    <span className="up-shade" />
    {u.state === "up" ? <span className="up-ring" style={{ ["--p" as string]: u.pct }}><b>{u.pct}%</b></span> : null}
    {u.state === "done" ? <span className="up-ok"><svg className="ico sm" aria-hidden="true"><use href="#i-check" /></svg></span> : null}
    {u.state === "err" ? <span className="up-er"><b>{t(u.error ?? "Upload failed. Try again.")}</b><button type="button" onClick={onRetry}>{t("Try again")}</button></span> : null}
    <span className="up-name">{u.file.name}<em>{(u.file.size / 1048576).toFixed(u.file.size > 10485760 ? 0 : 1)} MB</em></span>
    <button type="button" className="up-x" onClick={onRemove} aria-label={t("Remove")}><svg className="ico sm" aria-hidden="true"><use href="#i-x" /></svg></button>
  </div>);
}

/* Full screen view of photos and videos, with arrows, swipe and Esc. */
export function Lightbox({ items, index, onClose }: { items: { src: string; video: boolean }[]; index: number; onClose: () => void }) {
  const t = useT();
  const [i, setI] = useState(index);
  const x0 = useRef<number | null>(null);
  const go = useCallback((d: number) => setI((n) => (n + d + items.length) % items.length), [items.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; };
  }, [go, onClose]);
  const it = items[i];
  if (!it) return null;
  return createPortal(<div className="lb" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}
    onTouchStart={(e) => { x0.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0.current = null; }}>
    {it.video ? <video key={it.src} src={it.src} controls autoPlay playsInline className="lb-m" /> : <img key={it.src} src={it.src} alt="" className="lb-m" />}
    <button className="lb-x" onClick={onClose} aria-label={t("Close")}><svg className="ico" aria-hidden="true"><use href="#i-x" /></svg></button>
    {items.length > 1 ? <><button className="lb-a l" onClick={() => go(-1)} aria-label={t("Previous")}><svg className="ico" aria-hidden="true"><use href="#i-left" /></svg></button><button className="lb-a r" onClick={() => go(1)} aria-label={t("Next")}><svg className="ico" aria-hidden="true"><use href="#i-right" /></svg></button><span className="lb-n">{i + 1} / {items.length}</span></> : null}
  </div>, document.body);
}
