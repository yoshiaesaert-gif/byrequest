"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* First party visit tracking for the staff dashboard: page views, clicks and a heartbeat for time on site. */
const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const put = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* private mode */ } };

export default function Tracker() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    let vid = get(localStorage, "brq_vid"); if (!vid) { vid = crypto.randomUUID(); put(localStorage, "brq_vid", vid); }
    const send = (k: "page" | "click" | "ping", l?: string) => {
      const body = JSON.stringify({ v: vid, s: get(sessionStorage, "brq_sid") ?? undefined, k, p: location.pathname + location.search, l, r: first.current ? document.referrer : undefined, lang: navigator.language });
      fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).then((r) => r.ok && r.status === 200 ? r.json() : null).then((j) => { if (j?.s) put(sessionStorage, "brq_sid", j.s); }).catch(() => {});
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
  }, [path]);
  return null;
}
