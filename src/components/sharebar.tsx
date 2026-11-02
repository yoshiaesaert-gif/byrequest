"use client";
import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

/* A slim bar at the top of every page: how far your invite link got and what it would already have paid.
   Tapping it opens the invite page. It hides in chats and on the invite page itself, and can be closed for a day. */
type D = { on: boolean; goal: number; people: number; cents: number; unlocked: boolean; joined: number; paidCents: number };
const HIDE = /^\/(for-you|invite|deals\/[^/]+|inbox\/[^/]+|requests\/[^/]+\/(talk|offers\/[^/]+)|admin|onboarding)/;
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
  const pct = d?.on ? Math.min(100, Math.round((d.people / d.goal) * 100)) : 0;
  const prog = d?.on ? <span className="ipg"><b className="num">{d.unlocked ? "€" + Math.round(d.cents / 100) : `${Math.min(d.people, d.goal)}/${d.goal}`}</b><span className="ipg-t"><i style={{ width: `${d.unlocked ? 100 : pct}%` }} /></span></span> : null;
  return <Link href="/invite" className={compact ? "icon-btn invite-ic" + (prog ? " has-p" : "") : "invite-pill" + (prog ? " has-p" : "")} aria-label={label}>
    <svg className={"ico" + (compact ? "" : " sm")} aria-hidden="true"><use href="#i-gift" /></svg>{prog}</Link>;
}

export default function ShareBar() {
  const t = useT();
  const path = usePathname() ?? "";
  const d = useShare();
  const [off, setOff] = useState(() => { if (typeof window === "undefined") return true; try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 86400_000; } catch { return false; } });
  if (!d?.on || off || HIDE.test(path)) return null;
  const pct = Math.min(100, Math.round((d.people / d.goal) * 100));
  const left = Math.max(0, d.goal - d.people);
  const missed = d.joined * d.cents;
  const msg = d.unlocked ? t("{amount} for every new account through your link. Share it now", { amount: eur(d.cents) })
    : missed > 0 ? t("With {goal} people reached you would already have {amount} from your {n} new accounts", { goal: d.goal, amount: eur(missed), n: d.joined })
    : t("Reach {left} more people and earn {amount} per new account", { left, amount: eur(d.cents) });
  return (<div className={"sbar" + (d.unlocked ? " open" : "")}>
    <Link href="/invite" className="sbar-in">
      <span className="sbar-k">{d.unlocked ? "🔓" : "🎯"} <b className="num">{Math.min(d.people, d.goal)}/{d.goal}</b></span>
      <span className="sbar-track" aria-hidden="true"><i style={{ "--w": `${pct}%`, width: "var(--w)" } as React.CSSProperties} /></span>
      <span className="sbar-t">{msg}</span>
      <span className="sbar-go" aria-hidden="true">→</span>
    </Link>
    <button type="button" className="sbar-x" aria-label={t("Hide for today")} onClick={() => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* fine */ } setOff(true); }}>×</button>
  </div>);
}
