"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/i18n/client";
import { myKeys, seal, open } from "./e2e";
import { Ticks } from "./ui";
import { toast } from "./chrome";

/* One chat for everything: the chat of a deal, the questions around an application and the back office.
   New messages, read ticks and "typing…" arrive within a couple of seconds without reloading the page.
   On a phone the chat opens full screen with the message bar fixed at the bottom. */
export type PaneMsg = { id: string; kind: "e2e" | "system"; mine: boolean; text: string | null; nonce: string | null; body: string; at: string; read: boolean };
export type PaneState = { v: string; status: string | null; typing: boolean; otherKey: string | null; closed: boolean; msgs: PaneMsg[] };
type Pending = { id: string; text: string; at: string; sid?: string };
type Props = {
  endpoint: string;                                        // GET ?v=… for the state, POST for send and typing
  meId: string;
  name: string;                                            // the other side
  avatar?: React.ReactNode;
  initial: PaneState;
  e2e: boolean;                                            // sealed in this browser; false when the server opens the messages
  variant: "deal" | "inline";
  intro?: string;
  lock?: string;                                           // small line under the name
  extras?: React.ReactNode;                                // report and block links
  closedNode?: React.ReactNode;                            // replaces the message bar
  empty?: string;
  fromInbox?: boolean;                                     // open full screen on a phone
  guards?: RegExp[];                                       // warn before sending contact details
  onStatus?: () => void;
  send?: (text: string) => Promise<{ ok: boolean; error?: string }>;
  onTyping?: () => void;
  hideWhenEmpty?: boolean;
  placeholder?: string;
  onClose?: () => void;                                    // chat opened in a sheet
  actions?: React.ReactNode;                               // chips above the message bar, for example the preview album
  disabledReason?: string;
};
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const EMOJI = ["😊", "😂", "😍", "🥰", "😘", "😉", "😏", "🔥", "💦", "🍑", "😈", "🙈", "🤭", "😅", "🙏", "👍", "👌", "👏", "💪", "✨", "❤️", "💜", "🖤", "💋", "🎉", "🌙", "☕", "🍷", "🙌", "😴", "🤍", "💭"];
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,12}$/u;
const noop = () => () => {};

export default function ChatPane(p: Props) {
  const t = useT();
  const locale = useLocale();
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [st, setSt] = useState<PaneState>(p.initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [warned, setWarned] = useState(false);
  const [full, setFull] = useState(!!p.fromInbox);
  const [more, setMore] = useState(0);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const pane = useRef<HTMLElement>(null);
  const near = useRef(true);
  const seen = useRef(p.initial.msgs.length);
  const vRef = useRef(p.initial.v);
  const lastTyping = useRef(0);
  const kp = useMemo(() => (client && p.e2e ? myKeys(p.meId) : null), [client, p.e2e, p.meId]);

  useEffect(() => { vRef.current = st.v; }, [st.v]);
  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${p.endpoint}${p.endpoint.includes("?") ? "&" : "?"}v=${encodeURIComponent(vRef.current)}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json() as PaneState | { same: true };
      if ("same" in j) return;
      setSt(j);
    } catch { /* offline: try again on the next tick */ }
  }, [p.endpoint]);

  // Every 2.5 seconds while the tab is open and visible; straight away when you come back to it.
  useEffect(() => {
    let live = true, h = 0;
    const tick = async () => { if (document.visibilityState === "visible") await poll(); if (live) h = window.setTimeout(tick, 2500); };
    h = window.setTimeout(tick, vRef.current ? 1200 : 0);
    const back = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", back); window.addEventListener("focus", back);
    return () => { live = false; clearTimeout(h); document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, [poll]);

  const first = useRef(p.initial.status);
  useEffect(() => { if (st.status !== first.current) { first.current = st.status; p.onStatus?.(); } }, [st.status, p]);
  const plain = (m: PaneMsg) => m.text ?? (kp && st.otherKey && m.nonce ? open(m.body, m.nonce, st.otherKey, kp) : null);
  const items = useMemo(() => [...st.msgs.map((m) => ({ ...m, pending: false })),
    ...pending.filter((m) => !(m.sid && st.msgs.some((x) => x.id === m.sid))).map((m) => ({ id: m.id, kind: "e2e" as const, mine: true, text: m.text, nonce: null, body: "", at: m.at, read: false, pending: true }))], [st.msgs, pending]);

  // Stay at the bottom when you are there; otherwise offer a button instead of jumping.
  useLayoutEffect(() => { const s = scroller.current; if (s) s.scrollTop = s.scrollHeight; }, []);
  useEffect(() => {
    const s = scroller.current; if (!s) return;
    const mineLast = items[items.length - 1]?.mine;
    if (near.current || mineLast) { s.scrollTo({ top: s.scrollHeight, behavior: "smooth" }); window.setTimeout(() => setMore(0), 0); seen.current = items.length; }
    else if (items.length > seen.current) window.setTimeout(() => setMore(items.length - seen.current), 0);
  }, [items.length, st.typing, items]);
  const onScroll = () => { const s = scroller.current; if (!s) return; near.current = s.scrollHeight - s.scrollTop - s.clientHeight < 90; if (near.current && more) { seen.current = items.length; setMore(0); } };
  const down = () => { const s = scroller.current; s?.scrollTo({ top: s.scrollHeight, behavior: "smooth" }); };

  // Phone: full screen above the keyboard, and the page behind it does not scroll.
  useEffect(() => {
    if (!full) return;
    document.documentElement.classList.add("cx-lock");
    const vv = window.visualViewport, el = pane.current;
    const fit = () => { if (!el || !vv || !window.matchMedia("(max-width: 760px)").matches) return; el.style.height = vv.height + "px"; el.style.transform = `translateY(${vv.offsetTop}px)`; };
    fit(); vv?.addEventListener("resize", fit); vv?.addEventListener("scroll", fit);
    return () => { document.documentElement.classList.remove("cx-lock"); vv?.removeEventListener("resize", fit); vv?.removeEventListener("scroll", fit); if (el) { el.style.height = ""; el.style.transform = ""; } };
  }, [full]);
  useEffect(() => { const f = field.current; if (f) { f.style.height = "auto"; f.style.height = Math.min(f.scrollHeight, 130) + "px"; } }, [text]);

  const typed = (v: string) => {
    setText(v); setWarned(false);
    if (v && Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      if (p.onTyping) p.onTyping(); else fetch(p.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing: true }), keepalive: true }).catch(() => {});
    }
  };
  const go = async () => {
    const v = text.trim();
    if (!v || busy) return;
    if (p.e2e && !kp) { window.dispatchEvent(new Event("brq:unlock")); return; }
    if (p.guards && !warned && p.guards.some((r) => r.test(v))) { setWarned(true); return; }
    if (p.e2e && !st.otherKey) { toast(t("{name} has not opened ByRequest on a device yet. Try again soon.", { name: p.name }), "err"); return; }
    setWarned(false); setText(""); setEmoji(false); lastTyping.current = 0;
    const tmp: Pending = { id: "tmp" + Date.now(), text: v, at: new Date().toISOString() };
    setPending((x) => [...x, tmp]); setBusy(true);
    try {
      let r: { ok: boolean; error?: string; id?: string };
      if (p.send) r = await p.send(v);
      else {
        const body = p.e2e && kp && st.otherKey ? seal(v, st.otherKey, kp) : { text: v };
        r = await (await fetch(p.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
      }
      if (!r.ok) { toast(t(r.error ?? "That did not work. Try again."), "err"); setPending((x) => x.filter((m) => m.id !== tmp.id)); setText(v); }
      else { setPending((x) => x.map((m) => (m.id === tmp.id ? { ...m, sid: r.id } : m))); vRef.current = ""; await poll(); if (!r.id) setPending((x) => x.filter((m) => m.id !== tmp.id)); }
    } catch { toast(t("Upload failed. Check your connection."), "err"); setPending((x) => x.filter((m) => m.id !== tmp.id)); setText(v); }
    setBusy(false);
    if (!window.matchMedia("(pointer:coarse)").matches) field.current?.focus();
  };
  const addEmoji = (em: string) => {
    const f = field.current, a = f?.selectionStart ?? text.length, b = f?.selectionEnd ?? text.length;
    setText(text.slice(0, a) + em + text.slice(b));
    requestAnimationFrame(() => { f?.focus(); f?.setSelectionRange(a + em.length, a + em.length); });
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const day = (iso: string) => new Date(iso).toDateString();
  const dayLabel = (iso: string) => { const d = new Date(iso), today = new Date(), y = new Date(today); y.setDate(y.getDate() - 1); return day(iso) === today.toDateString() ? t("Today") : day(iso) === y.toDateString() ? t("Yesterday") : d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) }); };

  const rows: React.ReactNode[] = [];
  items.forEach((m, i) => {
    if (client && (i === 0 || day(items[i - 1].at) !== day(m.at))) rows.push(<div key={"d" + m.id} className="cx-day"><span>{dayLabel(m.at)}</span></div>);
    if (m.kind === "system") { rows.push(<p key={m.id} className="cx-sys">{t(m.text ?? m.body)}</p>); return; }
    const prev = items[i - 1], next = items[i + 1];
    const first = !prev || prev.kind === "system" || prev.mine !== m.mine || day(prev.at) !== day(m.at) || new Date(m.at).getTime() - new Date(prev.at).getTime() > 5 * 60_000;
    const last = !next || next.kind === "system" || next.mine !== m.mine || day(next.at) !== day(m.at) || new Date(next.at).getTime() - new Date(m.at).getTime() > 5 * 60_000;
    const body = m.pending ? m.text : plain(m);
    const big = !!body && EMOJI_ONLY.test(body) && !/\d/.test(body);
    rows.push(<div key={m.id} className={"cx-row " + (m.mine ? "me" : "them") + (first ? " first" : "") + (last ? " last" : "")}>
      <div className={"cx-b" + (big ? " big" : "") + (body ? "" : " locked") + (m.pending ? " sending" : "")}>
        {body ?? (kp ? t("Encrypted on another device") : client ? <button type="button" className="cx-unlock" onClick={() => window.dispatchEvent(new Event("brq:unlock"))}>{t("Locked on this device. Tap to open")}</button> : "…")}
      </div>
      {last && client ? <div className="cx-meta"><time dateTime={m.at}>{time(m.at)}</time>{m.mine ? (m.pending ? <svg className="ico tick" aria-hidden="true"><use href="#i-clock" /></svg> : <Ticks read={m.read} t={t} />) : null}</div> : null}
    </div>);
  });

  if (p.hideWhenEmpty && !items.length) return null;
  const last = [...items].reverse().find((m) => m.kind === "e2e");
  const peek = last ? (last.pending ? last.text : plain(last)) : null;
  const sub = st.typing ? <span className="cx-typing-l">{t("typing…")}</span> : p.lock ? <span><Ico n="lock" c="sm" />{p.lock}</span> : null;
  const disabled = !!p.disabledReason || (p.e2e && !st.otherKey);

  return (<section ref={pane} className={"card cx " + p.variant + (full ? " is-full" : "")} aria-label={t("Chat with {name}", { name: p.name })}>
    {p.variant === "deal" ? <button type="button" className="cx-peek" onClick={() => setFull(true)}>
      <span className="cx-av">{p.avatar}</span>
      <span className="cx-pt"><b>{t("Chat with {name}", { name: p.name })}</b><span>{st.typing ? t("typing…") : peek ?? t("Say hello")}</span></span>
      <span className="cx-go">{t("Open chat")}<Ico n="right" c="sm" /></span>
    </button> : null}
    <div className="cx-inner">
      <header className="cx-top">
        {p.variant === "deal" ? <button type="button" className="cx-back" onClick={() => setFull(false)} aria-label={t("Back")}><Ico n="left" /></button> : p.onClose ? <button type="button" className="cx-back" onClick={p.onClose} aria-label={t("Back")}><Ico n="left" /></button> : null}
        <span className="cx-av">{p.avatar}</span>
        <span className="cx-who"><b>{p.name}</b>{sub}</span>
        {p.extras ? <span className="cx-ex">{p.extras}</span> : null}
      </header>
      <div className="cx-scroll" ref={scroller} onScroll={onScroll} aria-live="polite">
        {p.intro ? <p className="cx-intro">{p.intro}</p> : null}
        {rows}
        {!items.length && p.empty ? <p className="cx-empty">{p.empty}</p> : null}
        {st.typing ? <div className="cx-row them first last"><div className="cx-b cx-dots" aria-label={t("typing…")}><i /><i /><i /></div></div> : null}
      </div>
      {more ? <button type="button" className="cx-more" onClick={down}><Ico n="down" c="sm" />{t("New messages")}</button> : null}
      {warned ? <p className="cx-warn" role="alert"><Ico n="alert" c="sm" />{t("This looks like contact details, a payment outside ByRequest or a meeting. That is not allowed and removes your protection: no review, no refund, no help. Send anyway only if it is something else.")}</p> : null}
      {p.actions ? <div className="cx-act">{p.actions}</div> : null}
      {st.closed || p.closedNode ? (p.closedNode ?? <div className="cx-closed">{t("This chat is closed")}</div>)
        : <form className="cx-bar" onSubmit={(e) => { e.preventDefault(); go(); }}>
          {emoji ? <div className="cx-emoji" role="listbox" aria-label={t("Emoji")}>{EMOJI.map((em) => <button key={em} type="button" onClick={() => addEmoji(em)} aria-label={em}>{em}</button>)}</div> : null}
          <button type="button" className={"cx-emo" + (emoji ? " on" : "")} onClick={() => setEmoji((x) => !x)} aria-label={t("Emoji")} aria-expanded={emoji} disabled={disabled}>😊</button>
          <textarea ref={field} rows={1} className="cx-in" value={text} onChange={(e) => typed(e.target.value)} enterKeyHint="send"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer:coarse)").matches) { e.preventDefault(); go(); } }}
            placeholder={p.placeholder ?? p.disabledReason ?? (p.e2e && !st.otherKey ? t("The chat opens once {name} signs in on a device", { name: p.name }) : t("Message {name}", { name: p.name }))}
            disabled={disabled} autoComplete="off" aria-label={t("Message")} maxLength={2000} />
          <button className="cx-send" aria-label={t("Send")} disabled={!text.trim() || disabled}><Ico n="send" /></button>
        </form>}
    </div>
  </section>);
}
