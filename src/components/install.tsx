"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

/* "Get the app": one tap where the browser allows it (Android, Chrome and Edge on a computer), and a short visual guide
   on iPhone and iPad, where Apple only allows Share, then Add to Home Screen. Asked once at a good moment, then quiet. */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "brq_install";
const get = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as { n?: number; no?: number; done?: boolean }; } catch { return {}; } };
const put = (v: object) => { try { localStorage.setItem(KEY, JSON.stringify({ ...get(), ...v })); } catch { /* private mode */ } };
export const openInstall = () => window.dispatchEvent(new Event("brq:install"));

export default function InstallApp() {
  const t = useT();
  const [deferred, setDeferred] = useState<Prompt | null>(null);
  const [card, setCard] = useState(false);
  const [guide, setGuide] = useState(false);
  const [env, setEnv] = useState({ standalone: false, ios: false, iosChrome: false });

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => null);
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const s = get(); put({ n: (s.n ?? 0) + 1 });
    const id = window.setTimeout(() => {
      setEnv({ standalone, ios, iosChrome: ios && /crios/i.test(ua) });
      // From the second visit on, not right after a "not now", never once installed.
      if (!standalone && !s.done && (s.n ?? 0) >= 1 && (!s.no || Date.now() - s.no > 21 * 86400_000)) setCard(true);
    }, 2500);
    const bip = (e: Event) => { e.preventDefault(); setDeferred(e as Prompt); };
    const done = () => { put({ done: true }); setCard(false); setGuide(false); };
    const open = () => setGuide(true);
    window.addEventListener("beforeinstallprompt", bip); window.addEventListener("appinstalled", done); window.addEventListener("brq:install", open);
    return () => { clearTimeout(id); window.removeEventListener("beforeinstallprompt", bip); window.removeEventListener("appinstalled", done); window.removeEventListener("brq:install", open); };
  }, []);

  const install = async () => {
    if (deferred) { await deferred.prompt(); const r = await deferred.userChoice; if (r.outcome === "accepted") put({ done: true }); setDeferred(null); setCard(false); return; }
    setCard(false); setGuide(true);
  };
  const later = () => { put({ no: Date.now() }); setCard(false); };

  return (<>
    {card && !env.standalone ? (<div className="ia-card" role="dialog" aria-label={t("Get the ByRequest app")}>
      <img src="/app-192.png" alt="" width={44} height={44} />
      <div><b>{t("Get the ByRequest app")}</b><span>{t("On your home screen, opens in one tap, with a notice the moment someone answers.")}</span></div>
      <div className="ia-btns"><button className="btn btn-ghost btn-sm" onClick={later}>{t("Not now")}</button><button className="btn btn-primary btn-sm" onClick={install}>{deferred ? t("Install") : t("Show me how")}</button></div>
    </div>) : null}
    {guide ? (<div className="ia-back" onClick={(e) => e.target === e.currentTarget && setGuide(false)}>
      <div className={"ia-sheet" + (env.ios && !env.standalone && !env.iosChrome ? " ios" : "")} role="dialog" aria-modal="true" aria-label={t("Get the ByRequest app")}>
        <img className="ia-logo" src="/app-192.png" alt="" width={64} height={64} />
        <h2>{env.standalone ? t("You are using the app") : t("Add ByRequest to your home screen")}</h2>
        {env.standalone ? <p>{t("ByRequest is installed on this device. Open it from your home screen anytime.")}</p>
          : deferred ? (<><p>{t("One tap and ByRequest is on your home screen, like any other app.")}</p><button className="btn btn-primary btn-lg btn-block" onClick={install}>{t("Install")}</button></>)
          : env.ios ? (<ol className="ia-steps">
            <li><span className="ia-n">1</span><span>{t("Tap the Share button")} <svg className="ia-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11v9h12v-9" /></svg> {env.iosChrome ? t("at the top right") : t("at the bottom of Safari")}</span></li>
            <li><span className="ia-n">2</span><span>{t("Scroll down and tap Add to Home Screen")}</span></li>
            <li><span className="ia-n">3</span><span>{t("Tap Add. Done!")}</span></li>
          </ol>) : (<p>{t("Open the browser menu and choose Install ByRequest or Add to Home screen.")}</p>)}
        <button className="btn btn-secondary btn-block" onClick={() => setGuide(false)}>{t("Close")}</button>
      </div>
      {env.ios && !env.standalone && !env.iosChrome ? <span className="ia-arrow" aria-hidden="true">↓</span> : null}
    </div>) : null}
  </>);
}
