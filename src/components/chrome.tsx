"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setMode, markNoteRead } from "@/app/(app)/actions";
import { signOut } from "@/app/signin/actions";

/* ---------- toasts: any client component can call toast("…") ---------- */
/* After a new version goes live, an open tab can still call an action that no longer exists: reload quietly instead of showing the raw error. */
const STALE = /Server Action .* was not found|failed-to-find-server-action/i;
export function toast(msg: string, kind: "ok" | "err" = "ok") {
  if (STALE.test(msg)) { msg = "ByRequest was just updated. One moment…"; kind = "ok"; window.setTimeout(() => window.location.reload(), 1400); }
  window.dispatchEvent(new CustomEvent("brq:toast", { detail: { msg, kind } })); }

function useEsc(fn: () => void) { useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && fn(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [fn]); }

import { useT } from "@/i18n/client";
import LangSwitch from "./lang-switch";
import { openProblem } from "./problem";
import { openInstall } from "./install";

export function MenuButton({ handle, avatar, big, mode, isCreator, verified, compact, staff }: { handle: string; avatar: React.ReactNode; big: React.ReactNode; mode: "buy" | "sell"; isCreator: boolean; verified: boolean; compact?: boolean; staff?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  useEsc(() => setOpen(false));
  const buy = mode === "buy";
  const t = useT();
  return (
    <div ref={ref} style={{ position: compact ? "static" : "relative" }}>
      <button className={compact ? "icon-btn" : "avatar-btn"} onClick={() => setOpen((o) => !o)} aria-label={t("Account menu")} aria-expanded={open}>
        {compact ? null : <svg className="ico sm" aria-hidden="true"><use href="#i-menu" /></svg>}{avatar}
      </button>
      {open ? (
        <div className="menu" role="menu" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <div className="who">{big}<div><b>{handle}</b><div className="t-sm muted">{buy ? t("Buyer") : t("Creator")}{isCreator ? (verified ? ` · ${t("Verified creator")}` : ` · ${t("Setup not finished")}`) : ""}</div></div></div>
          {isCreator
            ? <a className="mi switch" href={`/mode?to=${buy ? "sell" : "buy"}`}><svg className="ico" aria-hidden="true"><use href="#i-swap" /></svg>{buy ? t("Switch to creator") : t("Switch to buyer")}</a>
            : <Link className="mi switch" href="/earn"><svg className="ico" aria-hidden="true"><use href="#i-money" /></svg>{t("Start creating, earn money")}</Link>}
          <hr />
          <Link className="mi mi-invite" href="/invite"><svg className="ico" aria-hidden="true"><use href="#i-gift" /></svg><span>{t("Invite friends")}<small>{t("A bonus every Monday")}</small></span></Link>
          <Link className="mi" href="/settings"><svg className="ico" aria-hidden="true"><use href="#i-user" /></svg>{t("Profile and privacy")}</Link>
          <Link className="mi" href="/inbox"><svg className="ico" aria-hidden="true"><use href="#i-inbox" /></svg>{t("Inbox")}</Link>
          {buy ? <Link className="mi" href="/vault"><svg className="ico" aria-hidden="true"><use href="#i-vault" /></svg>{t("Vault")}</Link> : <><Link className="mi" href="/earnings"><svg className="ico" aria-hidden="true"><use href="#i-wallet" /></svg>{t("Earnings")}</Link><Link className="mi" href="/studio"><svg className="ico" aria-hidden="true"><use href="#i-spark" /></svg>{t("Studio")}</Link></>}
          <Link className="mi" href="/safety"><svg className="ico" aria-hidden="true"><use href="#i-shield" /></svg>{t("Trust and safety")}</Link>
          <button className="mi" onClick={() => { setOpen(false); openInstall(); }}><svg className="ico" aria-hidden="true"><use href="#i-down" /></svg>{t("Get the app")}</button>
          <button className="mi" onClick={() => { setOpen(false); openProblem(); }}><svg className="ico" aria-hidden="true"><use href="#i-help" /></svg>{t("Help and support")}</button>
          {staff ? <Link className="mi mi-admin" href="/admin"><svg className="ico" aria-hidden="true"><use href="#i-lock" /></svg>{t("Admin")}<span className="mi-tag">{t("Staff")}</span></Link> : null}
          <hr />
          <LangSwitch />
          <button className="mi" onClick={() => { setOpen(false); hide(); }}><svg className="ico" aria-hidden="true"><use href="#i-eyeoff" /></svg>{t("Quick hide")} <span className="muted t-sm" style={{ marginLeft: "auto" }}>{t("Esc twice")}</span></button>
          <form action={signOut}><button className="mi"><svg className="ico" aria-hidden="true"><use href="#i-logout" /></svg>{t("Sign out")}</button></form>
        </div>
      ) : null}
    </div>
  );
}

/* Quick hide covers the whole screen with a neutral shopping list. */
function hide() { window.dispatchEvent(new Event("brq:hide")); }
export function HideButton() {
  const t = useT();
  return <button className="icon-btn" onClick={hide} aria-label={t("Quick hide")}><svg className="ico" aria-hidden="true"><use href="#i-eyeoff" /></svg></button>;
}

type Note = { id: string; title: string; body: string; href: string };

export function Live({ uid, discreet, neutralTab }: { uid: string; discreet: boolean; neutralTab: boolean }) {
  const tx = useT();
  const [t, setT] = useState<{ msg: string; kind: string } | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  const seen = useRef<string | null>(null);
  const lastEsc = useRef(0);

  useEffect(() => {
    const onToast = (e: Event) => { setT((e as CustomEvent).detail); window.clearTimeout((onToast as unknown as { h: number }).h); (onToast as unknown as { h: number }).h = window.setTimeout(() => setT(null), 2600); };
    const onHide = () => setHidden(true);
    const onKey = (e: KeyboardEvent) => { if (e.key !== "Escape") return; const now = Date.now(); if (now - lastEsc.current < 500) setHidden(true); lastEsc.current = now; };
    window.addEventListener("brq:toast", onToast); window.addEventListener("brq:hide", onHide); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("brq:toast", onToast); window.removeEventListener("brq:hide", onHide); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => { if (neutralTab) document.title = "Notes"; }, [neutralTab]);

  /* Hold to peek on touch: frosted covers clear while a finger rests on them. */
  useEffect(() => {
    const down = (e: PointerEvent) => { if (e.pointerType === "mouse") return; const m = (e.target as HTMLElement).closest(".media"); if (m) { const id = window.setTimeout(() => m.classList.add("revealed"), 220); (m as HTMLElement).dataset.pk = String(id); } };
    const up = () => document.querySelectorAll<HTMLElement>(".media").forEach((m) => { if (m.dataset.pk) { clearTimeout(+m.dataset.pk); delete m.dataset.pk; } m.classList.remove("revealed"); });
    document.addEventListener("pointerdown", down); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); };
  }, []);

  /* On touch screens the card you stop on clears by itself: once it is mostly in view and the page
     has been still for a moment, the frosted glass slides away; scrolling on frosts it again. */
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const seen = new Set<Element>();
    let idle = 0;
    const settle = () => { window.clearTimeout(idle); document.querySelectorAll(".media.in-view").forEach((m) => m.classList.remove("in-view"));
      idle = window.setTimeout(() => seen.forEach((m) => m.classList.add("in-view")), 380); };
    const io = new IntersectionObserver((es) => { for (const e of es) { if (e.intersectionRatio >= 0.7) seen.add(e.target); else { seen.delete(e.target); e.target.classList.remove("in-view"); } } settle(); }, { threshold: [0, 0.7, 1] });
    const watch = () => document.querySelectorAll(".media:has(.frost)").forEach((m) => io.observe(m));
    watch();
    const mo = new MutationObserver(watch); mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", settle, { passive: true });
    return () => { io.disconnect(); mo.disconnect(); window.removeEventListener("scroll", settle); window.clearTimeout(idle); };
  }, []);

  /* Polls for new notifications and shows an iOS style banner. Discreet mode hides the content. */
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { latest: Note | null };
        if (!alive || !j.latest) return;
        // Already looking at that chat or page: nothing to announce, it is on screen.
        const here = window.location.pathname, target = j.latest.href.split("#")[0];
        if (seen.current && seen.current !== j.latest.id && (here === target || here.startsWith(target + "/"))) { markNoteRead(j.latest.id).catch(() => {}); seen.current = j.latest.id; return; }
        if (seen.current && seen.current !== j.latest.id) { setNote(j.latest); router.refresh(); window.setTimeout(() => setNote(null), 5200); }
        seen.current = j.latest.id;
      } catch {}
    };
    tick(); const h = window.setInterval(tick, 8000);
    return () => { alive = false; window.clearInterval(h); };
  }, [router]);

  const body = (b: string) => { const m = b.match(/^You have (\d+) new messages\.$/); return m ? tx("You have {n} new messages.", { n: m[1] }) : tx(b); };
  return (<>
    <Link href={note?.href ?? "/inbox"} className={"notif" + (note ? " show" : "")} role="status" aria-live="polite" onClick={() => { if (note) markNoteRead(note.id).catch(() => {}); setNote(null); }} tabIndex={note ? 0 : -1}>
      <img src="/icon.png" alt="" className="notif-ic" />
      <span className="notif-t"><b>{discreet || !note ? "ByRequest" : tx(note.title)}</b><span>{discreet || !note ? tx("You have a new message") : body(note.body)}</span></span>
      <span className="notif-time">{tx("now")}</span>
    </Link>
    {t ? <div className="toast-glass" onClick={() => setT(null)}><div className={"toast" + (t.kind === "err" ? " err" : "")} role="status" aria-live="polite"><span className="toast-i"><svg className="ico" aria-hidden="true"><use href={t.kind === "err" ? "#i-alert" : "#i-check"} /></svg></span><span>{t.msg}</span></div></div> : null}
    {hidden ? (
      <div className="cover-list" onClick={() => setHidden(false)} role="button" tabIndex={0} aria-label={tx("Tap to return")}>
        <div><h2>{tx("Groceries")}</h2><ul>{["Oat milk", "Bananas", "Coffee beans", "Pasta", "Tomatoes", "Basil", "Greek yoghurt", "Dish soap"].map((x) => <li key={x}><span />{tx(x)}</li>)}</ul><p>{tx("Tap anywhere to return")}</p></div>
      </div>
    ) : null}
  </>);
}

