"use client";
import { BlockButton, UnblockButton } from "@/components/block-button";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, object } from "../../actions";
import { BuyerReview, CreatorReview, TipCard, ReviewDone } from "./review";
import { toast } from "@/components/chrome";
import { myKeys, seal, open } from "@/components/e2e";
import { when } from "@/components/ui";
import { useLocale, useT } from "@/i18n/client";

type Msg = { id: string; kind: "e2e" | "system"; senderId: string | null; nonce: string | null; body: string; at: string };
type Props = {
  me: { id: string; handle: string; role: "buyer" | "creator" };
  other: { id: string; handle: string; publicKey: string | null; readAt: string | null };
  deal: { id: string; status: string; dueAt: string; objectUntil: string | null; creatorCents: number; rated: boolean; ratedBuyer: boolean; category: string; amount: number; stars: number | null; tipCents: number; tipCreatorCents: number; vatRate: number; tipOpen: boolean };
  delivery: { review: string; onlyCreator: boolean } | null;
  canUpload: boolean; missing: string[]; payoutHeld: boolean;
  participants: { id: string; label: string; identity: string }[];
  dispute: { outcome: string } | null;
  msgs: Msg[];
  blocked: "me" | "them" | null;   // the chat stops after a block; the deal itself keeps its protection
};
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const eur = (c: number) => "€" + Math.round(c / 100);
const noop = () => () => {};
/* The chat is end to end encrypted, so ByRequest cannot scan it. This check runs only on the
   sender's device, before encryption, and only warns: nothing is sent to the server. */
const RISKY = [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/, /[\w.+-]+@[\w-]+\.[\w.]{2,}/, /\b(?:whats\s?app|telegram|signal|snap(?:chat)?|insta(?:gram)?|onlyfans|tiktok|paypal|tikkie|payconiq|revolut|iban|bitcoin|crypto)\b/i, /\b(?:meet|meeting|in person|irl|hotel|my place|your place|afspreken|ontmoeten|langskomen)\b/i];
const EMOJI = ["😊", "😂", "😍", "🥰", "😘", "😉", "😏", "🔥", "💦", "🍑", "😈", "🙈", "🤭", "😅", "🙏", "👍", "👌", "👏", "💪", "✨", "❤️", "💜", "🖤", "💋", "🎉", "🌙", "☕", "📸", "🎬", "🎧", "⏰", "✅"];
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s){1,12}$/u;
const REASONS = ["Not what was agreed", "Face does not match the offer", "Unusable, for example black or silent", "Someone other than the creator"];

export default function Room(p: Props) {
  const router = useRouter();
  const tr = useT();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [pendingMsgs, setPendingMsgs] = useState<{ id: string; text: string; at: string }[]>([]);
  const [emoji, setEmoji] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const locale = useLocale();
  const [sheet, setSheet] = useState<null | "object" | "upload">(null);
  const box = useRef<HTMLDivElement>(null);
  // Keys exist only in the browser: the server renders "Decrypting…", the client decrypts after hydration.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const kp = useMemo(() => (client ? myKeys(p.me.id) : null), [client, p.me.id]);
  const plain = useMemo(() => {
    const out: Record<string, string | null> = {};
    if (kp && p.other.publicKey) for (const m of p.msgs) if (m.kind === "e2e" && m.nonce) out[m.id] = open(m.body, m.nonce, p.other.publicKey, kp);
    return out;
  }, [kp, p.msgs, p.other.publicKey]);
  const buyer = p.me.role === "buyer";
  const s = p.deal.status;

  useEffect(() => { const h = setInterval(() => router.refresh(), 6000); return () => clearInterval(h); }, [router]);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }); }, [p.msgs.length, pendingMsgs.length]);
  // A sent message stays visible with a clock until the server copy arrives.
  // Sending runs in a transition that ends once the refreshed thread is on screen.
  const [pendingOut, setPendingOut] = useState(p.msgs.length);
  if (!pending && pendingMsgs.length && p.msgs.length > pendingOut) { setPendingMsgs([]); setPendingOut(p.msgs.length); }
  useEffect(() => { const f = field.current; if (f) { f.style.height = "auto"; f.style.height = Math.min(f.scrollHeight, 140) + "px"; } }, [text]);

  const steps = ["Accepted", "Making it", "Review", buyer ? "In your vault" : "In the vault", "Paid out"].map((x) => tr(x));
  // The highlighted step is the one in progress now, never one that has not happened yet.
  const cur = s === "held" ? 1 : s === "reviewing" ? 2 : s === "disputed" ? 3 : s === "delivered" ? 4 : 5;
  const chat = p.msgs.some((m) => m.kind === "e2e");

  const [warned, setWarned] = useState(false);
  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!kp) { window.dispatchEvent(new Event("brq:unlock")); return; }
    if (!t) return;
    if (!warned && RISKY.some((r) => r.test(t))) { setWarned(true); return; }
    setWarned(false);
    if (!p.other.publicKey) { toast(tr("{name} has not opened ByRequest on a device yet. Try again soon.", { name: p.other.handle }), "err"); return; }
    const sealed = seal(t, p.other.publicKey, kp);
    setText(""); setEmoji(false);
    const tmp = { id: "tmp" + Date.now(), text: t, at: new Date().toISOString() };
    setPendingMsgs((x) => [...x, tmp]); setPendingOut(p.msgs.length);
    start(async () => { const r = await sendMessage(p.deal.id, sealed.nonce, sealed.body); if (!r.ok) { toast(tr(r.error), "err"); setPendingMsgs((x) => x.filter((m) => m.id !== tmp.id)); } router.refresh(); });
  };
  const addEmoji = (em: string) => {
    const f = field.current, a = f?.selectionStart ?? text.length, b = f?.selectionEnd ?? text.length;
    setText(text.slice(0, a) + em + text.slice(b));
    requestAnimationFrame(() => { f?.focus(); f?.setSelectionRange(a + em.length, a + em.length); });
  };

  // Both sides are asked for a review once the content is in the vault; a tip stays possible for 14 days.
  const reviewable = (s === "delivered" || s === "released") && !p.blocked;
  const canTip = buyer && reviewable && !p.deal.tipCents && p.deal.tipOpen;
  let next: { t: string; d: string; acts?: React.ReactNode };
  if (buyer) {
    if (s === "held") next = { t: tr("{name} is making it", { name: p.other.handle }), d: tr("Expected by {time}. No delivery in time means a full refund.", { time: when(p.deal.dueAt, locale) }) };
    else if (s === "reviewing") next = { t: tr("Delivered, being reviewed"), d: p.delivery?.review === "blocked_participants" ? tr("Waiting for verification and consent of everyone who appears. Then it reaches your vault.") : tr("It passed the file check. A reviewer checks it before it reaches your vault.") };
    else if (s === "delivered") next = { t: tr("In your vault, your turn"), d: tr("Not what you agreed? Report it before {time}: we check it independently first. Otherwise the payment goes to the creator automatically, 60 minutes after you first open it.", { time: when(p.deal.objectUntil!, locale) }), acts: <><button className="btn btn-secondary" onClick={() => setSheet("object")}>{tr("Report a problem")}</button><Link className="btn btn-secondary" href="/vault">{tr("Open vault")}</Link></> };
    else if (s === "disputed") next = { t: tr("Under review"), d: tr("A person compares the file with the terms of the accepted offer. The money stays held until then.") };
    else if (s === "released") next = { t: tr("Deal completed"), d: tr("It stays in your vault for the agreed period."), acts: <><Link className="btn btn-secondary" href="/vault">{tr("Open vault")}</Link></> };
    else next = { t: tr("Refunded"), d: tr("The full amount goes back to you through the payment partner.") };
  } else {
    if (s === "held") next = p.canUpload
      ? { t: tr("Deliver by {time}", { time: when(p.deal.dueAt, locale) }), d: tr("Upload here. We check length and format, remove location and device data, and review it before it reaches the buyer."), acts: <button className="btn btn-brand" onClick={() => setSheet("upload")}>{tr("Upload delivery")}</button> }
      : { t: tr("Finish your setup to upload"), d: p.missing.map((m) => tr(m)).join(" · "), acts: <Link className="btn btn-primary" href="/onboarding">{tr("Continue setup")}</Link> };
    else if (s === "reviewing") next = { t: p.delivery?.review === "blocked_participants" ? tr("Waiting for participants") : tr("Being reviewed"), d: p.delivery?.review === "blocked_participants" ? tr("Everyone else who appears must verify and consent through their link first.") : tr("A reviewer checks every delivery before it is made available.") };
    else if (s === "delivered") next = { t: tr("In the buyer's vault"), d: tr("The buyer can object until {time}. Then {amount} is released to you.", { time: when(p.deal.objectUntil!, locale), amount: eur(p.deal.creatorCents) }) };
    else if (s === "disputed") next = { t: tr("The buyer reported a problem"), d: tr("A person reviews the file against the accepted offer. You are paid if it matches.") };
    else if (s === "released") next = p.payoutHeld ? { t: tr("Action needed to enable payouts"), d: tr("{amount} is waiting until your payout setup is approved.", { amount: eur(p.deal.creatorCents) }), acts: <Link className="btn btn-primary" href="/onboarding">{tr("Open payout setup")}</Link> } : { t: tr("Paid"), d: tr("{amount} was released to your payout account.", { amount: eur(p.deal.creatorCents) }) };
    else next = { t: tr("Refunded to the buyer"), d: tr("This deal ended without payment.") };
  }

  return (<div>
    <div className="stepper">{steps.map((l, i) => <div key={l} className={"stp " + (i < cur ? "done" : i === cur ? "cur" : "")}><i /><span>{l}</span></div>)}</div>
    <p className="stp-now">{tr("Step {n} of {total}", { n: Math.min(cur + 1, steps.length), total: steps.length })} · <b>{steps[Math.min(cur, steps.length - 1)]}</b></p>
    <div className={"next is-" + s}><div style={{ minWidth: 0 }}><b className="t-h3">{next.t}</b><p className="t-sm muted" style={{ marginTop: 4 }}>{next.d}</p></div>{next.acts ? <div className="acts">{next.acts}</div> : null}</div>
    {reviewable ? (buyer
      ? (!p.deal.rated ? <BuyerReview dealId={p.deal.id} name={p.other.handle} vatBp={p.deal.vatRate} canTip={canTip} /> : canTip ? <TipCard dealId={p.deal.id} name={p.other.handle} vatBp={p.deal.vatRate} /> : null)
      : (!p.deal.ratedBuyer ? <CreatorReview dealId={p.deal.id} name={p.other.handle} /> : null)) : null}
    <ReviewDone stars={p.deal.stars} tipCents={buyer ? p.deal.tipCents : p.deal.tipCreatorCents} name={p.other.handle} buyer={buyer} />
    <div className="card chatbox">
      <div className="chat-bar"><span className="chat-lock"><Ico n="lock" c="sm" />{tr("End to end encrypted")}</span><span className="chat-acts"><Link href={`/report?type=deal&ref=${p.deal.id}`}>{tr("Report")}</Link>{p.blocked !== "me" ? <BlockButton handle={p.other.handle} /> : null}</span></div>
      <div className="msgs" ref={box} aria-live="polite">
        <p className="chat-e2e">{tr("Only you and {name} can read this chat. Paying outside ByRequest, sharing contact details and meeting in person are not allowed.", { name: p.other.handle })}</p>
        {thread(p, plain, pendingMsgs, kp, client, locale, tr)}
        {!chat && !pendingMsgs.length && s === "held" ? <p className="chat-empty">{tr("No messages yet. Agree on the details with {name} here.", { name: p.other.handle })}</p> : null}
      </div>
      {warned ? <p className="chat-warn" role="alert"><Ico n="alert" c="sm" />{tr("This looks like contact details, a payment outside ByRequest or a meeting. That is not allowed and removes your protection: no review, no refund, no help. Send anyway only if it is something else.")}</p> : null}
      {p.blocked ? <div className="chat-closed" role="status"><Ico n="block" c="sm" /><div><b>{tr("This chat is closed")}</b><span>{p.blocked === "me" ? tr("You blocked {name}. The deal stays protected: delivery, review and refund work as usual.", { name: p.other.handle }) : tr("New messages are not possible. The deal stays protected: delivery, review and refund work as usual.")}</span></div>{p.blocked === "me" ? <UnblockButton handle={p.other.handle} /> : null}</div>
      : <>      <form className="composer" onSubmit={send}>
          {emoji ? <div className="emoji-pop" role="listbox" aria-label={tr("Emoji")}>{EMOJI.map((em) => <button key={em} type="button" onClick={() => addEmoji(em)} aria-label={em}>{em}</button>)}</div> : null}
          <button type="button" className={"emoji-btn" + (emoji ? " on" : "")} onClick={() => setEmoji((x) => !x)} aria-label={tr("Emoji")} aria-expanded={emoji} disabled={!p.other.publicKey}>😊</button>
          <textarea ref={field} rows={1} className="input" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer:coarse)").matches) { e.preventDefault(); send(); } }}
            placeholder={p.other.publicKey ? tr("Message {name}", { name: p.other.handle }) : tr("The chat opens once {name} signs in on a device", { name: p.other.handle })} disabled={!p.other.publicKey} autoComplete="off" aria-label={tr("Message")} maxLength={2000} />
          <button className="btn btn-primary" aria-label={tr("Send")} disabled={!text.trim() || !p.other.publicKey}><Ico n="send" /></button>
        </form></>}
    </div>
    {sheet === "object" ? <ObjectSheet dealId={p.deal.id} onClose={() => setSheet(null)} /> : null}
    {sheet === "upload" ? <UploadSheet p={p} onClose={() => setSheet(null)} /> : null}
  </div>);
}

/* The conversation: a divider per day, bubbles of one sender grouped, the time in every bubble and,
   for your own messages, a clock while sending, one tick when sent and two when the other has read it. */
function thread(p: Props, plain: Record<string, string | null>, pend: { id: string; text: string; at: string }[], kp: unknown, client: boolean, locale: string, tr: (s: string, v?: Record<string, string | number>) => string) {
  const items = [...p.msgs.map((m) => ({ ...m, pending: false, text: m.kind === "e2e" ? plain[m.id] : null })),
    ...pend.map((m) => ({ id: m.id, kind: "e2e" as const, senderId: p.me.id, nonce: null, body: "", at: m.at, pending: true, text: m.text }))];
  const day = (d: Date) => d.toDateString();
  const today = new Date(), yest = new Date(Date.now() - 86400_000);
  const dayLabel = (d: Date) => day(d) === day(today) ? tr("Today") : day(d) === day(yest) ? tr("Yesterday")
    : d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const readAt = p.other.readAt ? new Date(p.other.readAt).getTime() : 0;
  const out: React.ReactNode[] = [];
  let lastDay = "";
  items.forEach((m, i) => {
    const at = new Date(m.at);
    if (client && day(at) !== lastDay) { lastDay = day(at); out.push(<div key={"d" + m.id} className="daydiv"><span>{dayLabel(at)}</span></div>); }
    if (m.kind === "system") { out.push(<span key={m.id} className="sysmsg"><Ico n="check" c="sm" />{sys(m.body, tr)}{client ? <time>{time(at)}</time> : null}</span>); return; }
    const mine = m.senderId === p.me.id;
    const next = items[i + 1];
    const last = !next || next.kind === "system" || next.senderId !== m.senderId || new Date(next.at).getTime() - at.getTime() > 5 * 60_000 || day(new Date(next.at)) !== day(at);
    const big = !!m.text && EMOJI_ONLY.test(m.text) && !/\d/.test(m.text);
    const tick = !mine ? null : m.pending ? <Ico n="clock" c="tick" /> : readAt >= at.getTime()
      ? <span className="tick read" aria-label={tr("Read")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12.5l4.5 4.5L17 7M9.5 16l1 1 10.5-10.5" /></svg></span>
      : <span className="tick" aria-label={tr("Sent")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19.5 7" /></svg></span>;
    out.push(<div key={m.id} className={"bub " + (mine ? "me" : "them") + (m.text ? "" : " locked") + (last ? " tail" : " grp") + (big ? " big" : "") + (m.pending ? " sending" : "")}>
      <span className="bub-t">{m.text ?? (kp ? tr("Encrypted on another device") : client ? <button type="button" className="bub-open" onClick={() => window.dispatchEvent(new Event("brq:unlock"))}>{tr("Locked on this device. Tap to open")}</button> : tr("Decrypting…"))}</span>
      {client ? <span className="bub-m"><time dateTime={m.at}>{time(at)}</time>{tick}</span> : null}
    </div>);
  });
  return out;
}

/* System lines are stored in English; amounts become a variable so the line translates as a whole. */
function sys(body: string, tr: (s: string, v?: Record<string, string | number>) => string) {
  const amount = body.match(/€\d+(?:\.\d{2})?/)?.[0];
  return amount ? tr(body.replace(amount, "{amount}"), { amount }) : tr(body);
}

function ObjectSheet({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const tr = useT();
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label={tr("Report a problem")}>
    <div className="sheet-h"><h3 className="t-h2">{tr("What does not match?")}</h3><button className="icon-btn" onClick={onClose} aria-label={tr("Close")}><Ico n="x" /></button></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{REASONS.map((r) => <button key={r} className={"choice" + (reason === r ? " is-on" : "")} onClick={() => setReason(r)}><span className="ci" style={{ background: "var(--sunk)", color: "var(--ink)" }}><Ico n="alert" /></span><b>{tr(r)}</b></button>)}</div>
    <div className="field"><label htmlFor="on">{tr("Add a short note, optional")}</label><input id="on" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
    <div className="verd"><div><b><Ico n="check" c="sm" />{tr("The delivery does not match")}</b><span>{tr("You get a full refund. The creator is not paid.")}</span></div><div><b><Ico n="alert" c="sm" />{tr("The delivery matches the offer")}</b><span>{tr("The creator is paid. Only reports made in bad faith, again and again, can lead to closing an account, and you can always appeal.")}</span></div></div>
    <button className="btn btn-primary btn-lg btn-block" disabled={pending} onClick={() => start(async () => { const r = await object(dealId, reason, note); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) onClose(); })}>{pending ? tr("Sending…") : tr("Send report")}</button>
    <p className="t-sm muted">{tr("A person reviews the file against the terms of the accepted offer within 24 hours. Your chat stays encrypted.")}</p>
  </div></div>);
}

function UploadSheet({ p, onClose }: { p: Props; onClose: () => void }) {
  const tr = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [only, setOnly] = useState<boolean | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [lines, setLines] = useState<{ ok: boolean; text: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const accept = p.deal.category === "photos" ? "image/*" : p.deal.category === "voice" ? "audio/*" : "video/*";
  const go = async () => {
    setBusy(true); setErr(null); setLines(null);
    const f = new FormData(); files.forEach((x) => f.append("files", x)); f.set("onlyCreator", only ? "yes" : "no"); sel.forEach((s) => f.append("participant", s));
    try {
      const r = await (await fetch(`/api/deliveries/${p.deal.id}`, { method: "POST", body: f })).json();
      setLines(r.lines ?? null);
      if (r.ok) { toast(tr("Delivered. It is being reviewed.")); router.refresh(); setTimeout(onClose, 900); } else setErr(r.error);
    } catch { setErr(tr("Upload failed. Check your connection.")); }
    setBusy(false);
  };
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label={tr("Upload delivery")}>
    <div className="sheet-h"><div><span className="eyebrow">{tr("Deliver to {name}", { name: p.other.handle })}</span><h3 className="t-h2" style={{ marginTop: 4 }}>{p.deal.category === "photos" ? tr("{n} photos", { n: p.deal.amount }) : tr("{n} minutes", { n: p.deal.amount })}</h3></div><button className="icon-btn" onClick={onClose} aria-label={tr("Close")} disabled={busy}><Ico n="x" /></button></div>
    <label className="drop"><input type="file" accept={accept} multiple={p.deal.category === "photos"} onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setLines(null); setErr(null); }} /><Ico n={p.deal.category === "photos" ? "image" : p.deal.category === "voice" ? "mic" : "video"} c="lg" /><b>{files.length ? tr(files.length > 1 ? "{n} files selected" : "{n} file selected", { n: files.length }) : tr("Choose files")}</b><span className="t-sm muted">{files.map((f) => f.name).join(", ") || tr("Location and device data are removed automatically.")}</span></label>
    <div className="field"><label>{tr("Who appears in this content?")}</label><div className="seg2">
      <button type="button" className={only === true ? "on" : ""} onClick={() => setOnly(true)}><b>{tr("Only me")}</b><span className="t-sm muted">{tr("Nobody else is visible or audible.")}</span></button>
      <button type="button" className={only === false ? "on" : ""} onClick={() => setOnly(false)}><b>{tr("Me and others")}</b><span className="t-sm muted">{tr("Each person verifies and consents first.")}</span></button></div></div>
    {only === false ? (<div className="field"><label>{tr("Select everyone else who appears")}</label>
      {p.participants.length ? <div className="optrow">{p.participants.map((x) => <button key={x.id} type="button" className={"chip" + (sel.includes(x.id) ? " is-on" : "")} onClick={() => setSel((s) => s.includes(x.id) ? s.filter((y) => y !== x.id) : [...s, x.id])}>{x.label}{x.identity === "approved" ? ` · ${tr("verified")}` : ` · ${tr("not verified yet")}`}</button>)}</div> : null}
      <Link href="/studio#participants" className="t-sm" style={{ fontWeight: 600 }}>{tr("Add a person and send them their private link")}</Link>
      <span className="t-sm muted">{tr("Your own statement is not enough. The delivery stays hidden until each person has verified and consented.")}</span></div>) : null}
    {lines ? <div className="upl">{lines.map((l) => <div key={l.text} className={"upc" + (l.ok ? "" : " bad")}><Ico n={l.ok ? "check" : "x"} c="sm" /><span>{l.text}</span></div>)}</div> : null}
    {err ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{tr(err)}{lines?.some((l) => !l.ok) ? " " + tr("Fix the item in red and upload again. This protects the buyer, and you.") : ""}</span></div> : null}
    <button className="btn btn-brand btn-lg btn-block" disabled={busy || !files.length || only === null || (only === false && !sel.length)} onClick={go}>{busy ? tr("Checking…") : tr("Check and send")}</button>
    <p className="t-xs muted">{tr("The file check reads only technical facts. A reviewer then checks the content before it is made available.")}</p>
  </div></div>);
}
