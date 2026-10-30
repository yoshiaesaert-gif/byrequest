"use client";
import { useEffect } from "react";

/* After a new release an open tab can still call code that no longer exists. That is not a real error:
   reload once, quietly. Anything else gets the ByRequest error screen with a way forward. */
const STALE = /Server Action|older or newer deployment|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i;

export default function Oops({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  const stale = STALE.test(error?.message ?? "");
  useEffect(() => {
    if (!stale) return;
    let last = 0; try { last = Number(sessionStorage.getItem("brq_reload") ?? 0); } catch { /* private mode */ }
    if (Date.now() - last < 30_000) return;
    try { sessionStorage.setItem("brq_reload", String(Date.now())); } catch { /* private mode */ }
    window.location.reload();
  }, [stale]);
  /* Plain links on purpose: after an error a full page load is the clean way back. */
  /* eslint-disable @next/next/no-html-link-for-pages */
  return (<div className="oops">
    <a href="/" className="oops-logo"><img src="/logo.png" alt="byrequest" /></a>
    <div className="oops-card">
      <span className="oops-ic" aria-hidden="true">{stale ? "↻" : "!"}</span>
      <h1>{stale ? "ByRequest was just updated" : "Something went wrong on our side"}</h1>
      <p>{stale ? "We are loading the newest version for you. One moment." : "Your work is safe. Try again, and if it keeps happening, tell us in the help chat so we can fix it fast."}</p>
      <div className="oops-btns">
        <button className="btn btn-primary" onClick={() => (reset && !stale ? reset() : window.location.reload())}>{stale ? "Reload now" : "Try again"}</button>
        <a className="btn btn-secondary" href="/">Go to home</a>
      </div>
      {error?.digest ? <small>Reference {error.digest}</small> : null}
    </div>
  </div>);
  /* eslint-enable @next/next/no-html-link-for-pages */
}
