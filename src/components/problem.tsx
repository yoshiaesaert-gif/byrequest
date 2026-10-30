"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

const KEY = "brq_errs";
type Err = { at: string; msg: string };
const read = (): Err[] => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
export function noteError(msg: string) { try { const l = read(); l.push({ at: new Date().toISOString(), msg: String(msg).slice(0, 300) }); sessionStorage.setItem(KEY, JSON.stringify(l.slice(-8))); } catch { /* private mode */ } }

/* Opens the problem sheet from anywhere (menu, footer, an error message). */
export const openProblem = () => window.dispatchEvent(new Event("brq:problem"));

export function ProblemLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return <button type="button" className={className} onClick={openProblem}>{children}</button>;
}

type Turn = { role: "user" | "assistant"; content: string; filed?: boolean; fresh?: boolean };
const LINK = /(\/(?:help|report|settings|safety|inbox|avatar|legal\/[a-z_0-9]+)[\w#/-]*)/g;
const CHAT = "brq_help";
const Text = ({ s }: { s: string }) => <>{s.split(LINK).map((p, i) => i % 2 ? <Link key={i} href={p.replace(/[.,)]+$/, "")}>{p}</Link> : p)}</>;
/* New answers appear as if typed, so the reply feels alive; older ones show at once. */
function Typed({ s, fresh, tick }: { s: string; fresh?: boolean; tick: () => void }) {
  const [n, setN] = useState(fresh ? 0 : s.length);
  useEffect(() => { if (!fresh) return; const id = window.setInterval(() => setN((k) => { const m = Math.min(s.length, k + 3); if (m >= s.length) window.clearInterval(id); return m; }), 16); return () => window.clearInterval(id); }, [fresh, s]);
  useEffect(() => { tick(); }, [n, tick]);
  return <Text s={s.slice(0, n)} />;
}

/* The help assistant, always one tap away at the bottom right. It answers, and anything technical goes to the team with the page, the device and the last browser errors attached. */
export default function ProblemSheet({ role }: { role: "creator" | "buyer" }) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => { try { return JSON.parse(sessionStorage.getItem(CHAT) ?? "[]"); } catch { return []; } });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [retry, setRetry] = useState("");
  const [gear, setGear] = useState(false);
  const [report, setReport] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => { setOpen(true); window.setTimeout(() => field.current?.focus(), 80); };
    const e1 = (e: ErrorEvent) => noteError(e.message);
    const e2 = (e: PromiseRejectionEvent) => noteError(e.reason instanceof Error ? e.reason.message : String(e.reason));
    const e3 = (e: Event) => { const d = (e as CustomEvent<{ msg: string; kind: string }>).detail; if (d?.kind === "err") noteError(d.msg); };
    window.addEventListener("brq:problem", on); window.addEventListener("error", e1); window.addEventListener("unhandledrejection", e2); window.addEventListener("brq:toast", e3);
    return () => { window.removeEventListener("brq:problem", on); window.removeEventListener("error", e1); window.removeEventListener("unhandledrejection", e2); window.removeEventListener("brq:toast", e3); };
  }, []);
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open]);
  useEffect(() => { const l = list.current; if (l) l.scrollTop = l.scrollHeight; try { sessionStorage.setItem(CHAT, JSON.stringify(turns.slice(-20).map(({ fresh, ...m }) => m))); } catch { /* private mode */ } }, [turns, busy, open]);

  const toEnd = useCallback(() => { const l = list.current; if (l) l.scrollTop = l.scrollHeight; }, []);
  const send = async (raw: string, again = false) => {
    const msg = raw.trim(); if (!msg || busy) return;
    const next: Turn[] = again ? turns : [...turns, { role: "user", content: msg }];
    const direct = report;
    setTurns(next); setText(""); setBusy(true); setErr(""); setRetry(""); setReport(false);
    const n = navigator as Navigator & { connection?: { effectiveType?: string } };
    try {
      const r = await fetch("/api/problem", { signal: AbortSignal.timeout(40000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, escalate: direct || undefined, turns: next.map(({ role, content }) => ({ role, content })), page: location.pathname + location.search, context: { ua: navigator.userAgent, viewport: `${innerWidth}x${innerHeight}`, lang: navigator.language, net: n.connection?.effectiveType ?? null, online: navigator.onLine, errors: read(), from: path } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(t(j.error ?? "That did not work. Please try again.")); setRetry(msg); return; }
      const add: Turn[] = [];
      if (j.reply) add.push({ role: "assistant", content: j.reply, fresh: true });
      else if (j.soft) { setRetry(msg); add.push({ role: "assistant", content: t("I hit a snag on my side. Give it one more go."), fresh: true }); }
      else if (j.empty) add.push({ role: "assistant", content: t("I am not sure about that one. Could you ask it a little differently?"), fresh: true });
      if (j.filed) add.push({ role: "assistant", content: t("I passed this to the team. They see it right away and answer in your ByRequest messages if they need more."), filed: true, fresh: true });
      setTurns([...next, ...add]);
    } catch { setErr(t("That did not work. Please try again.")); setRetry(msg); } finally { setBusy(false); }
  };

  const chips = [t("My photo upload does not work"), t("Something does not save"), t("I have a question about a deal")];
  return (<>
    {!open ? <button className="hb-launch" onClick={() => setOpen(true)} aria-label={t("Help")}><svg className="ico" aria-hidden="true"><use href="#i-inbox" /></svg><span>{t("Help")}</span></button> : null}
    {open ? (<div className="hb" role="dialog" aria-label={t("Help assistant")}>
      <header><span className="hb-logo"><img src="/apple-icon.png" alt="" width={36} height={36} /><i /></span><div><b>{t("ByRequest help")}<span className={"hb-mode " + role}>{role === "creator" ? t("Creator") : t("Buyer")}</span></b><small>{t("AI assistant, 24/7")}</small></div><div className="hb-gear"><button onClick={() => setGear((g) => !g)} aria-label={t("Settings")} aria-expanded={gear}><svg className="ico" aria-hidden="true"><use href="#i-gear" /></svg></button>{gear ? <div className="hb-gm" role="menu"><Link role="menuitem" href="/help" onClick={() => { setGear(false); setOpen(false); }}><b>{t("Help centre and FAQ")}</b><span>{t("Browse every question and answer")}</span></Link><button role="menuitem" onClick={() => { setGear(false); setReport(true); window.setTimeout(() => field.current?.focus(), 50); }}><b>{t("Report a malfunction")}</b><span>{t("Goes straight to the team")}</span></button><button role="menuitem" onClick={() => { setGear(false); setTurns([]); setErr(""); setRetry(""); setReport(false); try { sessionStorage.removeItem(CHAT); } catch { /* private mode */ } }}><b>{t("Clear chat history")}</b><span>{t("Starts a fresh conversation")}</span></button></div> : null}</div><button onClick={() => setOpen(false)} aria-label={t("Close")}><svg className="ico" aria-hidden="true"><use href="#i-x" /></svg></button></header>
      <div className="hb-list" ref={list}>
        <div className="hb-r them"><img className="hb-av" src="/apple-icon.png" alt="" width={28} height={28} /><p className="hb-b them">{role === "creator" ? t("Hi! You are in creator mode. Ask me about earning, your profile, offers or payouts, or tell me what is not working.") : t("Hi! You are in buyer mode. Ask me about posting requests, choosing creators, paying or your vault, or tell me what is not working.")}</p></div>
        {!turns.length ? <div className="hb-chips">{chips.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div> : null}
        {turns.map((m, i) => {
          const last = i === turns.length - 1 || turns[i + 1].role !== m.role;
          return m.role === "user"
            ? <div key={i} className="hb-r me"><p className="hb-b me"><Text s={m.content} /></p></div>
            : <div key={i} className="hb-r them">{last ? <img className="hb-av" src="/apple-icon.png" alt="" width={28} height={28} /> : <span className="hb-av" />}<p className={"hb-b them" + (m.filed ? " filed" : "")}>{m.filed ? <svg className="ico sm" aria-hidden="true"><use href="#i-check" /></svg> : null}<span><Typed s={m.content} fresh={m.fresh} tick={toEnd} /></span></p></div>;
        })}
        {busy ? <div className="hb-r them"><img className="hb-av" src="/apple-icon.png" alt="" width={28} height={28} /><p className="hb-b them hb-dots"><i /><i /><i /></p></div> : null}
        {err ? <p className="hb-err" role="alert">{err}</p> : null}
        {retry && !busy ? <div className="hb-chips"><button onClick={() => send(retry, true)}>{t("Try again")}</button></div> : null}
      </div>
      {report ? <div className="hb-rep"><svg className="ico sm" aria-hidden="true"><use href="#i-alert" /></svg><span>{t("Describe what is not working. Your next message goes straight to the team.")}</span><button onClick={() => setReport(false)}>{t("Cancel")}</button></div> : null}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <textarea ref={field} value={text} rows={1} maxLength={1000} placeholder={report ? t("What is not working?") : t("Write your question or problem")} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <button className="hb-send" disabled={busy || !text.trim()} aria-label={t("Send")}><svg className="ico" aria-hidden="true"><use href="#i-up" /></svg></button>
      </form>
    </div>) : null}
  </>);
}
