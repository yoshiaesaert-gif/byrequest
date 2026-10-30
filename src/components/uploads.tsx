"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";

/* One upload engine for the whole app: every file gets its own request, so files go up in parallel, each with its
   own preview, progress, cancel and retry. Plain routes, not server actions, so a new release never breaks a running upload. */
export type Up<R = unknown> = { key: string; file: File; url: string; pct: number; state: "up" | "proc" | "done" | "err"; error?: string; result?: R };
type Opts<R> = {
  endpoint: string; field?: string; extra?: () => Record<string, string>; parse: (j: Record<string, unknown>) => R; onDone?: (r: R, u: Up<R>) => void;
  target?: string;                        // enables resumable pieces for big files: "album" or "delivery:<id>"
  shrink?: { side: number; quality: number; over: number };   // photos bigger than `over` bytes are resized on the device first
  dropDone?: boolean;                     // remove a tile shortly after it finished (the page shows the stored item instead)
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

/* Uploads live outside the page in a small shared store, so they keep going when you move to another page inside
   ByRequest. A page asks for its own channel ("album", "delivery:<id>") and sees that channel's uploads again when it comes back. */
type Chan = { list: Up<unknown>[]; subs: Set<() => void>; opts: Opts<unknown>; href: string; xhrs: Map<string, XMLHttpRequest>; dead: Set<string> };
const chans = new Map<string, Chan>();
const anySubs = new Set<() => void>();
const NONE: Up<unknown>[] = [];
function emit(c: Chan) { c.subs.forEach((f) => f()); anySubs.forEach((f) => f()); }
function chanOf(id: string, opts: Opts<unknown>, href: string) {
  let c = chans.get(id);
  if (!c) { c = { list: [], subs: new Set(), opts, href, xhrs: new Map(), dead: new Set() }; chans.set(id, c); }
  return c;
}
const patchIn = (c: Chan, key: string, p: Partial<Up<unknown>>) => { c.list = c.list.map((u) => (u.key === key ? { ...u, ...p } : u)); emit(c); };

async function run(c: Chan, u0: Up<unknown>) {
  const key = u0.key, track = (x: XMLHttpRequest) => c.xhrs.set(key, x), patch = (p: Partial<Up<unknown>>) => patchIn(c, key, p);
  try {
    const o = c.opts;
    const file = o.shrink ? await shrinkImage(u0.file, o.shrink) : u0.file;
    let j: Record<string, unknown>, status: number;
    if (o.target && file.size > BIG) {
      // Big file: 8 MB pieces; after a dropped connection ask how far we got and continue from there.
      const init = await send("POST", "/api/uploads", JSON.stringify({ name: file.name, type: file.type, size: file.size, target: o.target, extra: o.extra?.() ?? {} }), () => {}, track);
      if (!init.json.ok) throw new Error(String(init.json.error ?? "Upload failed. Try again."));
      const id = String(init.json.id); let off = 0, tries = 0;
      while (off < file.size) {
        if (c.dead.has(key)) throw new Error("abort");
        try {
          const r = await send("PUT", `/api/uploads/${id}?offset=${off}`, file.slice(off, off + PIECE), (l) => patch({ pct: Math.min(99, Math.round(((off + l) / file.size) * 100)) }), track);
          if (!r.json.ok) throw new Error(String(r.json.error ?? "Upload failed. Try again."));
          off = Number(r.json.received); tries = 0;
        } catch (e) {
          if ((e as Error).message === "abort" || ++tries > 10) throw e;
          await wait(Math.min(15000, 1000 * 2 ** (tries - 1)));
          const g = await send("GET", `/api/uploads/${id}`, null, () => {}, track).catch(() => null);
          if (g?.json.ok) off = Number(g.json.received);
        }
      }
      patch({ pct: 100, state: "proc" });
      ({ status, json: j } = await send("POST", `/api/uploads/${id}`, null, () => {}, track));
    } else {
      const f = new FormData(); f.append(o.field ?? "file", file);
      for (const [k, v] of Object.entries(o.extra?.() ?? {})) f.set(k, v);
      ({ status, json: j } = await send("POST", o.endpoint, f, (l) => { const pct = Math.round((l / file.size) * 100); patch(pct >= 100 ? { pct: 100, state: "proc" } : { pct }); }, track));
    }
    c.xhrs.delete(key);
    if (status < 300 && j.ok) {
      const r = c.opts.parse(j); patch({ pct: 100, state: "done", result: r }); c.opts.onDone?.(r, u0);
      if (c.opts.dropDone) window.setTimeout(() => dropIn(c, key), 450);
    } else patch({ state: "err", error: String(j.error ?? "Upload failed. Try again.") });
  } catch (e) {
    c.xhrs.delete(key);
    if ((e as Error).message !== "abort") patch({ state: "err", error: (e as Error).message === "network" ? "No connection. Try again." : (e as Error).message });
  }
}
function dropIn(c: Chan, key: string) { c.dead.add(key); c.xhrs.get(key)?.abort(); c.xhrs.delete(key); const u = c.list.find((x) => x.key === key); if (u) URL.revokeObjectURL(u.url); c.list = c.list.filter((x) => x.key !== key); emit(c); }
function addIn(c: Chan, files: File[]) {
  const ups = files.map((file) => ({ key: Math.random().toString(36).slice(2), file, url: URL.createObjectURL(file), pct: 0, state: "up" as const }));
  c.list = [...c.list, ...ups]; emit(c); ups.forEach((u) => void run(c, u));
}
function retryIn(c: Chan, key: string) { const u = c.list.find((x) => x.key === key); if (!u) return; c.dead.delete(key); const n = { ...u, pct: 0, state: "up" as const, error: undefined }; c.list = c.list.map((x) => (x.key === key ? n : x)); emit(c); void run(c, n); }
function setOpts(c: Chan, opts: Opts<unknown>, href?: string) { c.opts = opts; if (href) c.href = href; }
const busyIn = (l: Up<unknown>[]) => l.some((u) => u.state === "up" || u.state === "proc");
if (typeof window !== "undefined") window.addEventListener("beforeunload", (e) => { if ([...chans.values()].some((c) => busyIn(c.list))) { e.preventDefault(); e.returnValue = ""; } });

export function useUploads<R>(opts: Opts<R> & { channel: string; href?: string }) {
  const c = chanOf(opts.channel, opts as Opts<unknown>, opts.href ?? "/");
  useEffect(() => { setOpts(c, opts as Opts<unknown>, opts.href); });
  const list = useSyncExternalStore((f) => { c.subs.add(f); return () => { c.subs.delete(f); }; }, () => c.list, () => NONE) as Up<R>[];
  const add = useCallback((files: File[]) => addIn(c, files), [c]);
  const remove = useCallback((key: string) => dropIn(c, key), [c]);
  const retry = useCallback((key: string) => retryIn(c, key), [c]);
  return { list, add, remove, retry, busy: busyIn(list) };
}

/* A small pill while files upload in the background on another page; a tap brings you back. */
export function UploadDock() {
  const t = useT();
  const path = usePathname();
  const snap = useSyncExternalStore((f) => { anySubs.add(f); return () => { anySubs.delete(f); }; }, () => [...chans.values()].map((c) => c.list.map((u) => `${u.state}${u.pct}`).join()).join("|"), () => "");
  const active = [...chans.values()].filter((c) => busyIn(c.list) && !path.startsWith(c.href));
  if (!snap || !active.length) return null;
  const ups = active.flatMap((c) => c.list.filter((u) => u.state === "up" || u.state === "proc"));
  const pct = Math.round(ups.reduce((a, u) => a + u.pct, 0) / Math.max(1, ups.length));
  return (<Link href={active[0].href} className="up-dock"><span className="up-dock-r" style={{ ["--p" as string]: pct }} /><span><b>{t(ups.length === 1 ? "Uploading 1 file" : "Uploading {n} files", { n: ups.length })}</b><small>{pct}% · {t("keeps going while you browse")}</small></span></Link>);
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
