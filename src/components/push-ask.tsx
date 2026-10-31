"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { toast } from "./chrome";

/* Asks once, inside the site, whether we may send notifications to this device, and keeps the device registered
   after a yes. iPhone allows it only in the home screen app; Android and computers in the browser too. */
const KEY = "brq_push_ask";
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function register(): Promise<boolean> {
  const { key } = await fetch("/api/push", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ key: null }));
  if (!key) return false;
  const reg = await navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON(), app: standalone() }) });
  return r.ok;
}

export default function PushAsk() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "granted") { void register().catch(() => {}); return; }   // keep this device registered
    if (Notification.permission !== "default") return;
    let alive = true;
    let s: { no?: number } = {}; try { s = JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { /* private mode */ }
    if (s.no && Date.now() - s.no < 14 * 86400_000) return;
    // Only ask once the server can actually send (the keys are set).
    const id = window.setTimeout(() => { fetch("/api/push", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (alive && j?.key) setShow(true); }).catch(() => {}); }, standalone() ? 3000 : 20000);
    return () => { alive = false; clearTimeout(id); };
  }, []);
  if (!show) return null;
  const later = () => { try { localStorage.setItem(KEY, JSON.stringify({ no: Date.now() })); } catch { /* private mode */ } setShow(false); };
  const on = async () => {
    setShow(false);
    try {
      const p = await Notification.requestPermission();
      if (p !== "granted") { later(); return; }
      toast((await register()) ? t("Notifications are on for this device") : t("That did not work. Try again later."), "ok");
    } catch { toast(t("That did not work. Try again later."), "err"); }
  };
  return (<div className="ia-card pa-card" role="dialog" aria-label={t("Turn on notifications")}>
    <span className="pa-ic" aria-hidden="true"><svg className="ico" aria-hidden="true"><use href="#i-inbox" /></svg></span>
    <div><b>{t("Know it the moment someone answers")}</b><span>{t("A short notice on this device, without details on your lock screen.")}</span></div>
    <div className="ia-btns"><button className="btn btn-ghost btn-sm" onClick={later}>{t("Not now")}</button><button className="btn btn-primary btn-sm" onClick={on}>{t("Turn on")}</button></div>
  </div>);
}
