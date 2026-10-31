"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { consent } from "./consent-banner";

/* First party visit statistics for the staff dashboard: page views, clicks and a heartbeat for time on site. This always runs and
   stores nothing on the device: the server recognises the visit by an anonymous daily id. Only with "Accept all" a
   returning visitor id is kept in the browser (and, later, session recording). */
const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const put = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* private mode */ } };

export default function Tracker() {
  const path = usePathname();
  const first = useRef(true);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setAll(consent() === "all"), 0);
    const on = (e: Event) => setAll((e as CustomEvent).detail === "all");
    window.addEventListener("brq:consent", on);
    return () => { clearTimeout(id); window.removeEventListener("brq:consent", on); };
  }, []);
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    let vid: string | undefined;
    if (all) { vid = get(localStorage, "brq_vid") ?? undefined; if (!vid) { vid = crypto.randomUUID(); put(localStorage, "brq_vid", vid); } }
    const send = (k: "page" | "click" | "ping", l?: string) => {
      const body = JSON.stringify({ v: vid, s: all ? get(sessionStorage, "brq_sid") ?? undefined : undefined, k, p: location.pathname + location.search, l, r: first.current ? document.referrer : undefined, lang: navigator.language, app: matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || undefined });
      fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).then((r) => r.ok && r.status === 200 ? r.json() : null).then((j) => { if (all && j?.s) put(sessionStorage, "brq_sid", j.s); }).catch(() => {});
    };
    send("page"); first.current = false;
    const click = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("a,button,[role=button],summary") as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 60);
      const href = el.getAttribute("href");
      send("click", href && !href.startsWith("#") ? `${label} → ${href}`.slice(0, 80) : label);
    };
    const tick = window.setInterval(() => { if (document.visibilityState === "visible") send("ping"); }, 20000);
    document.addEventListener("click", click, true);
    return () => { document.removeEventListener("click", click, true); clearInterval(tick); };
  }, [path, all]);
  return null;
}
