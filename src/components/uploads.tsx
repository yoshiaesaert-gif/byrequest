"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";

/* One upload engine for the whole app: every file gets its own request, so files go up in parallel, each with its
   own preview, progress, cancel and retry. Plain routes, not server actions, so a new release never breaks a running upload. */
export type Up<R = unknown> = { key: string; file: File; url: string; pct: number; state: "up" | "proc" | "done" | "err"; error?: string; result?: R };
type Opts<R> = {
  endpoint: string; field?: string; extra?: () => Record<string, string>; parse: (j: Record<string, unknown>) => R; onDone?: (r: R, u: Up<R>) => void;
  target?: string;                        // enables resumable pieces for big files: "album" or "delivery:<id>"
  shrink?: { side: number; quality: number; over: number };   // photos bigger than `over` bytes are resized on the device first
};
const PIECE = 8 * 1024 * 1024, BIG = 20 * 1024 * 1024;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Resize a photo on the device before it is sent, like Instagram does: far less data, same look. Falls back to the original. */
async function shrinkImage(f: File, o: NonNullable<Opts<unknown>["shrink"]>) {
  if (!f.type.startsWith("image/") || f.size <= o.over || f.type === "image/gif") return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, o.side / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", o.quality));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch { return f; }
}

function send(method: string, url: string, body: XMLHttpRequestBodyInit | null, onProg: (loaded: number) => void, track: (x: XMLHttpRequest) => void) {
  return new Promise<{ status: number; json: Record<string, unknown> }>((res, rej) => {
    const x = new XMLHttpRequest(); track(x);
    x.open(method, url);
    x.upload.onprogress = (e) => onProg(e.loaded);
    x.onload = () => { let j: Record<string, unknown> = {}; try { j = JSON.parse(x.responseText); } catch { /* not json */ } res({ status: x.status, json: j }); };
    x.onerror = () => rej(new Error("network")); x.onabort = () => rej(new Error("abort"));
    if (body && typeof body === "string") x.setRequestHeader("Content-Type", "application/json");
    x.send(body);
  });
}

export function useUploads<R>(opts: Opts<R>) {
  const [list, setList] = useState<Up<R>[]>([]);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const dead = useRef(new Set<string>());
  const o = useRef(opts);
  useEffect(() => { o.current = opts; });
  const patch = (key: string, p: Partial<Up<R>>) => setList((l) => l.map((u) => (u.key === key ? { ...u, ...p } : u)));
  const start = useCallback(async (u0: Up<R>) => {
    const key = u0.key, track = (x: XMLHttpRequest) => xhrs.current.set(key, x);
    try {
      const file = o.current.shrink ? await shrinkImage(u0.file, o.current.shrink) : u0.file;
      let j: Record<string, unknown>, status: number;
      if (o.current.target && file.size > BIG) {
        // Big file: 8 MB pieces; after a dropped connection ask how far we got and continue from there.
        const init = await send("POST", "/api/uploads", JSON.stringify({ name: file.name, type: file.type, size: file.size, target: o.current.target, extra: o.current.extra?.() ?? {} }), () => {}, track);
        if (!init.json.ok) throw new Error(String(init.json.error ?? "Upload failed. Try again."));
        const id = String(init.json.id); let off = 0, tries = 0;
        while (off < file.size) {
          if (dead.current.has(key)) throw new Error("abort");
          try {
            const r = await send("PUT", `/api/uploads/${id}?offset=${off}`, file.slice(off, off + PIECE), (l) => patch(key, { pct: Math.min(99, Math.round(((off + l) / file.size) * 100)) }), track);
            if (!r.json.ok) throw new Error(String(r.json.error ?? "Upload failed. Try again."));
            off = Number(r.json.received); tries = 0;
          } catch (e) {
            if ((e as Error).message === "abort" || ++tries > 10) throw e;
            await wait(Math.min(15000, 1000 * 2 ** (tries - 1)));
            const g = await send("GET", `/api/uploads/${id}`, null, () => {}, track).catch(() => null);
            if (g?.json.ok) off = Number(g.json.received);
          }
        }
        patch(key, { pct: 100, state: "proc" });
        ({ status, json: j } = await send("POST", `/api/uploads/${id}`, null, () => {}, track));
      } else {
        const f = new FormData(); f.append(o.current.field ?? "file", file);
        for (const [k, v] of Object.entries(o.current.extra?.() ?? {})) f.set(k, v);
        ({ status, json: j } = await send("POST", o.current.endpoint, f, (l) => { const pct = Math.round((l / file.size) * 100); patch(key, pct >= 100 ? { pct: 100, state: "proc" } : { pct }); }, track));
      }
      xhrs.current.delete(key);
      if (status < 300 && j.ok) { const r = o.current.parse(j); patch(key, { pct: 100, state: "done", result: r }); o.current.onDone?.(r, u0); }
      else patch(key, { state: "err", error: String(j.error ?? "Upload failed. Try again.") });
    } catch (e) {
      xhrs.current.delete(key);
      if ((e as Error).message !== "abort") patch(key, { state: "err", error: (e as Error).message === "network" ? "No connection. Try again." : (e as Error).message });
    }
  }, []);
  const add = useCallback((files: File[]) => {
    const ups = files.map((file) => ({ key: Math.random().toString(36).slice(2), file, url: URL.createObjectURL(file), pct: 0, state: "up" as const }));
    setList((l) => [...l, ...ups]); ups.forEach((u) => void start(u));
  }, [start]);
  const remove = useCallback((key: string) => { dead.current.add(key); xhrs.current.get(key)?.abort(); xhrs.current.delete(key); setList((l) => { const u = l.find((x) => x.key === key); if (u) URL.revokeObjectURL(u.url); return l.filter((x) => x.key !== key); }); }, []);
  const retry = useCallback((key: string) => setList((l) => l.map((u) => { if (u.key !== key) return u; const n = { ...u, pct: 0, state: "up" as const, error: undefined }; void start(n); return n; })), [start]);
  useEffect(() => { const x = xhrs.current; return () => { x.forEach((r) => r.abort()); }; }, []);
  return { list, add, remove, retry, busy: list.some((u) => u.state === "up" || u.state === "proc") };
}

/* A tile while it uploads: the local preview straight away, a progress ring, and cancel or retry. */
export function UpTile<R>({ u, onRemove, onRetry }: { u: Up<R>; onRemove: () => void; onRetry: () => void }) {
  const t = useT();
  const kind = u.file.type.split("/")[0];
  return (<div className={"up-t" + (u.state === "err" ? " is-err" : u.state === "done" ? " is-done" : "")}>
    {kind === "image" ? <img src={u.url} alt="" /> : kind === "video" ? <video src={u.url} muted playsInline preload="metadata" /> : <span className="up-aud"><svg className="ico" aria-hidden="true"><use href="#i-mic" /></svg></span>}
    <span className="up-shade" />
    {u.state === "up" ? <span className="up-ring" style={{ ["--p" as string]: u.pct }}><b>{u.pct}%</b></span> : null}
    {u.state === "proc" ? <span className="up-proc"><i /><b>{t("Processing…")}</b></span> : null}
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
