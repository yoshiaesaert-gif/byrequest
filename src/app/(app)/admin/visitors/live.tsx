"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* "On the site now": a click opens the list of the people active in the last 5 minutes, one row each. */
type P = { id: string; visitor_id: string; user_id: string | null; handle: string | null; is_creator: boolean | null; device: string | null; browser: string | null; os: string | null; city: string | null; country: string | null;
  ref_code: string | null; referrer: string | null; started_at: string; last_at: string; pages: number; clicks: number; page: string | null; label: string | null; visits_today: number };
const ago = (iso: string, now: number) => { const s = Math.max(0, Math.round((now - +new Date(iso)) / 1000)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export default function LiveNow({ people }: { people: P[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const t0 = window.setTimeout(() => setNow(Date.now()), 0);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => router.refresh(), 15000);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => { clearTimeout(t0); clearInterval(tick); clearInterval(refresh); window.removeEventListener("keydown", k); };
  }, [open, router]);
  const signed = people.filter((p) => p.user_id).length;
  return (<>
    <button className="dz-live" onClick={() => setOpen(true)}><i />{people.length} on the site now</button>
    {open ? <div className="ask-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="lv" role="dialog" aria-modal="true" aria-label="On the site now">
        <div className="lv-h"><div><b>On the site now</b><span>{people.length} {people.length === 1 ? "person" : "people"} · {signed} signed in · {people.length - signed} not signed in · active in the last 5 minutes, refreshes by itself</span></div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><svg className="ico" aria-hidden="true"><use href="#i-x" /></svg></button></div>
        <div className="lv-t">
          <div className="lv-r lv-head"><span>Person</span><span>Now on</span><span>Device and place</span><span>On site</span><span className="r">Last action</span></div>
          {people.map((p) => (<div key={p.id} className="lv-r">
            <span className="lv-who">{p.user_id ? <Link href={`/admin/users/${p.user_id}`}>{p.handle}</Link> : <Link href={`/admin/visitors?v=${p.id}`}>Visitor {p.visitor_id.slice(-5)}</Link>}
              <small>{p.user_id ? (p.is_creator ? "Creator" : "Buyer") : "Not signed in"}{p.ref_code ? ` · invite ${p.ref_code}` : p.referrer ? ` · from ${p.referrer}` : ""}{p.visits_today > 1 ? ` · ${p.visits_today} visits today` : ""}</small></span>
            <span className="lv-pg">{p.label ?? "?"}<small><code>{p.page ?? ""}</code></small></span>
            <span className="lv-dev">{[cap(p.device), p.browser && p.os ? `${p.browser} on ${p.os}` : p.browser].filter(Boolean).join(" · ")}<small>{[p.city, p.country].filter(Boolean).join(", ") || "Location unknown"}</small></span>
            <span>{now ? ago(p.started_at, now) : ""}<small>{p.pages} pages · {p.clicks} clicks</small></span>
            <span className="r lv-ago"><i />{now ? `${ago(p.last_at, now)} ago` : ""}</span>
          </div>))}
          {!people.length ? <p className="lv-empty">Nobody right now.</p> : null}
        </div>
        <p className="lv-note">Each row is one person. Someone signed in counts once, also on two devices. A visitor who is not signed in is recognised by their browser and network, so the same person on a phone and a laptop shows twice until they sign in.</p>
      </div>
    </div> : null}
  </>);
}
