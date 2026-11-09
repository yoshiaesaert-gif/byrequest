"use client";
import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

/* A slim bar at the top of every page: how far your invite link got and what it would already have paid.
   Tapping it opens the invite page. It hides in chats and on the invite page itself, and can be closed for a day. */
type D = { on: boolean; cents: number; free: number; max: number; verified: number; pending: number; unlocked: boolean; left: number; slots: number; level: number; next: number; ready: number; paidCents: number; code: string | null };
const KEY = "brq_sharebar";
const eur = (c: number) => "€" + Math.round(c / 100);

/* One fetch for the bar and the header button together, refreshed every minute. */
let cache: { at: number; p: Promise<D | null> } | null = null;
const get = () => { if (!cache || Date.now() - cache.at > 55_000) cache = { at: Date.now(), p: fetch("/api/share-progress").then((r) => (r.ok ? r.json() : null)).catch(() => null) }; return cache.p; };
function useShare() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => get().then((j) => live && j && setD(j));
    load(); const id = window.setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => { live = false; clearInterval(id); };
  }, []);
  return d;
}

/* The invite button in the top bar shows the progress itself: always in view, also on the feed. */
export function InviteButton({ compact, label }: { compact?: boolean; label: string }) {
  const d = useShare();
  const pct = d?.on ? Math.min(100, Math.round((d.verified / (d.unlocked ? d.max : d.free)) * 100)) : 0;
  const prog = d?.on ? <span className="ipg"><b className="num">{d.unlocked ? "€" + Math.round(d.cents / 100) : `${d.verified}/${d.free}`}</b><span className="ipg-t"><i style={{ width: `${pct}%` }} /></span></span> : null;
  return <Link href="/invite" className={compact ? "icon-btn invite-ic" + (prog ? " has-p" : "") : "invite-pill" + (prog ? " has-p" : "")} aria-label={label}>
    <svg className={"ico" + (compact ? "" : " sm")} aria-hidden="true"><use href="#i-gift" /></svg>{prog}</Link>;
}

/* Only on the home page and your own profile pages: a game you can see moving, with the money you are missing. */
export default function ShareBar({ handle }: { handle: string }) {
  const t = useT();
  const path = usePathname() ?? "";
  const d = useShare();
  const [off, setOff] = useState(() => { if (typeof window === "undefined") return true; try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 86400_000; } catch { return false; } });
  const show = path === "/" || path === "/settings" || path === "/studio" || path === `/c/${handle}`;
  if (!d?.on || off || !show) return null;
  const steps = [5, 10, 15, 20, 25, 30].filter((x) => x <= d.max);
  const goal = d.max, have = d.verified;
  const pct = Math.min(100, Math.round((Math.min(have, goal) / goal) * 100));
  const total = (d.max - d.free) * d.cents;
  const link = typeof window === "undefined" || !d.code ? "" : `${location.origin}/r/${d.code}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(t("Join me on ByRequest. Use my code {code} when you sign up.", { code: d.code ?? "" }) + " " + link + "?c=wa")}`;
  return (<section className={"sbar" + (d.unlocked ? " open" : "")} aria-label={t("Share bonus")}>
    <div className="sbar-in">
      <div className="sbar-money">
        {d.paidCents > 0 ? <><b>{eur(d.paidCents)}</b><small>{t("earned so far")}</small></>
          : <><b>{eur(total)}</b><small>{d.unlocked ? t("to earn now") : t("waiting for you")}</small></>}
      </div>
      <div className="sbar-game">
        <div className="sbar-top"><span className="sbar-lvl">{t("Level {n}", { n: d.level })}</span>
          <span className="sbar-t">{d.unlocked ? t("Unlocked! Every new verified member pays {amount}. {n} paid places left", { amount: eur(d.cents), n: d.slots })
            : t("{left} verified members to go. From number {start} on, each one pays {amount}", { left: d.left, start: d.free + 1, amount: eur(d.cents) })}</span></div>
        <div className="sbar-track" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={have}>
          <i style={{ "--w": `${pct}%`, width: "var(--w)" } as React.CSSProperties} />
          {steps.map((x) => <span key={x} className={"sbar-dot" + (have >= x ? " on" : "") + (x > d.free ? " paid" : "")} style={{ left: `${(x / goal) * 100}%` }}><em>{x > d.free ? "€" : x}</em></span>)}
        </div>
        <div className="sbar-sub"><b className="num">{have}</b> {t("verified members")}{d.pending ? <> · {t("{n} still need their ID check", { n: d.pending })}</> : null}</div>
      </div>
      <div className="sbar-cta">
        <a className="sbar-wa" href={wa} target="_blank" rel="noopener noreferrer">{t("Share on WhatsApp")}</a>
        <Link className="sbar-more" href="/invite">{t("All ways to share")} →</Link>
      </div>
    </div>
    <button type="button" className="sbar-x" aria-label={t("Hide for today")} onClick={() => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* fine */ } setOff(true); }}>×</button>
  </section>);
}
