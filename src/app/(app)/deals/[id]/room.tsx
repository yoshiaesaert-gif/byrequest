"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, releaseNow, object, rate } from "../../actions";
import { toast } from "@/components/chrome";
import { myKeys, seal, open } from "@/components/e2e";
import { when } from "@/components/ui";

type Msg = { id: string; kind: "e2e" | "system"; senderId: string | null; nonce: string | null; body: string; at: string };
type Props = {
  me: { id: string; handle: string; role: "buyer" | "creator" };
  other: { id: string; handle: string; publicKey: string | null };
  deal: { id: string; status: string; dueAt: string; objectUntil: string | null; creatorCents: number; rated: boolean; category: string; amount: number };
  delivery: { review: string; onlyCreator: boolean } | null;
  canUpload: boolean; missing: string[]; payoutHeld: boolean;
  participants: { id: string; label: string; identity: string }[];
  dispute: { outcome: string } | null;
  msgs: Msg[];
};
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const eur = (c: number) => "€" + Math.round(c / 100);
const noop = () => () => {};
/* The chat is end to end encrypted, so ByRequest cannot scan it. This check runs only on the
   sender's device, before encryption, and only warns: nothing is sent to the server. */
const RISKY = [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/, /[\w.+-]+@[\w-]+\.[\w.]{2,}/, /\b(?:whats\s?app|telegram|signal|snap(?:chat)?|insta(?:gram)?|onlyfans|tiktok|paypal|tikkie|payconiq|revolut|iban|bitcoin|crypto)\b/i, /\b(?:meet|meeting|in person|irl|hotel|my place|your place|afspreken|ontmoeten|langskomen)\b/i];
const REASONS = ["Not what was agreed", "Face does not match the offer", "Unusable, for example black or silent", "Someone other than the creator"];

export default function Room(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
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
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [p.msgs.length]);

  const steps = ["Accepted", "Making it", "Review", buyer ? "In your vault" : "In the vault", "Paid out"];
  // The highlighted step is the one in progress now, never one that has not happened yet.
  const cur = s === "held" ? 1 : s === "reviewing" ? 2 : s === "disputed" ? 3 : s === "delivered" ? 4 : 5;
  const chat = p.msgs.some((m) => m.kind === "e2e");

  const [warned, setWarned] = useState(false);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !kp) return;
    if (!warned && RISKY.some((r) => r.test(t))) { setWarned(true); return; }
    setWarned(false);
    if (!p.other.publicKey) { toast(`${p.other.handle} has not opened ByRequest on a device yet. Try again soon.`, "err"); return; }
    const sealed = seal(t, p.other.publicKey, kp);
    setText("");
    start(async () => { const r = await sendMessage(p.deal.id, sealed.nonce, sealed.body); if (!r.ok) toast(r.error, "err"); router.refresh(); });
  };

  let next: { t: string; d: string; acts?: React.ReactNode };
  if (buyer) {
    if (s === "held") next = { t: `${p.other.handle} is making it`, d: `Expected by ${when(p.deal.dueAt)}. No delivery in time means a full refund.` };
    else if (s === "reviewing") next = { t: "Delivered, being reviewed", d: p.delivery?.review === "blocked_participants" ? "Waiting for verification and consent of everyone who appears. Then it reaches your vault." : "It passed the file check. A reviewer checks it before it reaches your vault." };
    else if (s === "delivered") next = { t: "In your vault, your turn", d: `Not what you agreed? Object before ${when(p.deal.objectUntil!)}. Otherwise the payment is released automatically.`, acts: <><button className="btn btn-secondary" onClick={() => setSheet("object")}>Report a problem</button><Link className="btn btn-secondary" href="/vault">Open vault</Link><button className="btn btn-brand" disabled={pending} onClick={() => start(async () => { const r = await releaseNow(p.deal.id); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); })}>Release payment</button></> };
    else if (s === "disputed") next = { t: "Under review", d: "A person compares the file with the terms of the accepted offer. The money stays held until then." };
    else if (s === "released") next = { t: "Deal completed", d: "It stays in your vault for the agreed period.", acts: <><Link className="btn btn-secondary" href="/vault">Open vault</Link>{!p.deal.rated ? <RateButtons dealId={p.deal.id} other={p.other.handle} /> : null}</> };
    else next = { t: "Refunded", d: "The full amount goes back to you through the payment partner." };
  } else {
    if (s === "held") next = p.canUpload
      ? { t: `Deliver by ${when(p.deal.dueAt)}`, d: "Upload here. We check length and format, remove location and device data, and review it before it reaches the buyer.", acts: <button className="btn btn-brand" onClick={() => setSheet("upload")}>Upload delivery</button> }
      : { t: "Finish your setup to upload", d: p.missing.join(" · "), acts: <Link className="btn btn-primary" href="/onboarding">Continue setup</Link> };
    else if (s === "reviewing") next = { t: p.delivery?.review === "blocked_participants" ? "Waiting for participants" : "Being reviewed", d: p.delivery?.review === "blocked_participants" ? "Everyone else who appears must verify and consent through their link first." : "A reviewer checks every delivery before it is made available." };
    else if (s === "delivered") next = { t: "In the buyer's vault", d: `The buyer can object until ${when(p.deal.objectUntil!)}. Then ${eur(p.deal.creatorCents)} is released to you.` };
    else if (s === "disputed") next = { t: "The buyer reported a problem", d: "A person reviews the file against the accepted offer. You are paid if it matches." };
    else if (s === "released") next = p.payoutHeld ? { t: "Action needed to enable payouts", d: `${eur(p.deal.creatorCents)} is waiting until your payout setup is approved.`, acts: <Link className="btn btn-primary" href="/onboarding">Open payout setup</Link> } : { t: "Paid", d: `${eur(p.deal.creatorCents)} was released to your payout account.` };
    else next = { t: "Refunded to the buyer", d: "This deal ended without payment." };
  }

  return (<div>
    <div className="stepper">{steps.map((l, i) => <div key={l} className={"stp " + (i < cur ? "done" : i === cur ? "cur" : "")}><i />{l}</div>)}</div>
    <div className={"next is-" + s}><div style={{ minWidth: 0 }}><b className="t-h3">{next.t}</b><p className="t-sm muted" style={{ marginTop: 4 }}>{next.d}</p></div>{next.acts ? <div className="acts">{next.acts}</div> : null}</div>
    <div className="card chatbox">
      <div className="msgs" ref={box}>
        {p.msgs.map((m) => {
          if (m.kind === "system") return <span key={m.id} className="sysmsg"><Ico n="check" c="sm" />{m.body}</span>;
          const mine = m.senderId === p.me.id;
          const t = plain[m.id];
          return <div key={m.id} className={"bub " + (mine ? "me" : "them") + (t ? "" : " locked")}>{t ?? (kp ? "Encrypted on another device" : "Decrypting…")}</div>;
        })}
        {!chat && s === "held" ? <p className="chat-empty">No messages yet. Agree on the details with {p.other.handle} here.</p> : null}
      </div>
      <p className="safety-note"><Ico n="lock" c="sm" /><b>End to end encrypted.</b>&nbsp;Only you and {p.other.handle} can read this chat. Meeting in person, paying outside ByRequest and sharing contact details are not allowed. <Link href={`/report?type=deal&ref=${p.deal.id}`}>Report this chat</Link></p>
      {warned ? <p className="chat-warn" role="alert"><Ico n="alert" c="sm" />This looks like contact details, a payment outside ByRequest or a meeting. That is not allowed and removes your protection: no review, no refund, no help. Send anyway only if it is something else.</p> : null}
      <form className="composer" onSubmit={send}><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={p.other.publicKey ? `Message ${p.other.handle}` : `The chat opens once ${p.other.handle} signs in on a device`} disabled={!p.other.publicKey} autoComplete="off" aria-label="Message" maxLength={2000} /><button className="btn btn-primary" aria-label="Send" disabled={pending || !p.other.publicKey}><Ico n="send" /></button></form>
    </div>
    {sheet === "object" ? <ObjectSheet dealId={p.deal.id} onClose={() => setSheet(null)} /> : null}
    {sheet === "upload" ? <UploadSheet p={p} onClose={() => setSheet(null)} /> : null}
  </div>);
}

function RateButtons({ dealId, other }: { dealId: string; other: string }) {
  const [pending, start] = useTransition();
  return <div className="optrow" aria-label={`Rate ${other}`}>{[1, 2, 3, 4, 5].map((n) => <button key={n} className="chip" disabled={pending} onClick={() => start(async () => { const r = await rate(dealId, n); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); })}>{"★".repeat(n)}</button>)}</div>;
}

function ObjectSheet({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label="Report a problem">
    <div className="sheet-h"><h3 className="t-h2">What does not match?</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Ico n="x" /></button></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{REASONS.map((r) => <button key={r} className={"choice" + (reason === r ? " is-on" : "")} onClick={() => setReason(r)}><span className="ci" style={{ background: "var(--sunk)", color: "var(--ink)" }}><Ico n="alert" /></span><b>{r}</b></button>)}</div>
    <div className="field"><label htmlFor="on">Add a short note, optional</label><input id="on" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
    <div className="verd"><div><b><Ico n="check" c="sm" />The delivery does not match</b><span>You get a full refund. The creator is not paid.</span></div><div><b><Ico n="alert" c="sm" />The delivery matches the offer</b><span>The creator is paid. Only reports made in bad faith, again and again, can lead to closing an account, and you can always appeal.</span></div></div>
    <button className="btn btn-primary btn-lg btn-block" disabled={pending} onClick={() => start(async () => { const r = await object(dealId, reason, note); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) onClose(); })}>{pending ? "Sending…" : "Send report"}</button>
    <p className="t-sm muted">A person reviews the file against the terms of the accepted offer within 24 hours. Your chat stays encrypted.</p>
  </div></div>);
}

function UploadSheet({ p, onClose }: { p: Props; onClose: () => void }) {
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
      if (r.ok) { toast("Delivered. It is being reviewed."); router.refresh(); setTimeout(onClose, 900); } else setErr(r.error);
    } catch { setErr("Upload failed. Check your connection."); }
    setBusy(false);
  };
  return (<div className="scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}><div className="sheet" role="dialog" aria-modal="true" aria-label="Upload delivery">
    <div className="sheet-h"><div><span className="eyebrow">Deliver to {p.other.handle}</span><h3 className="t-h2" style={{ marginTop: 4 }}>{p.deal.category === "photos" ? `${p.deal.amount} photos` : `${p.deal.amount} minutes`}</h3></div><button className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}><Ico n="x" /></button></div>
    <label className="drop"><input type="file" accept={accept} multiple={p.deal.category === "photos"} onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setLines(null); setErr(null); }} /><Ico n={p.deal.category === "photos" ? "image" : p.deal.category === "voice" ? "mic" : "video"} c="lg" /><b>{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Choose files"}</b><span className="t-sm muted">{files.map((f) => f.name).join(", ") || "Location and device data are removed automatically."}</span></label>
    <div className="field"><label>Who appears in this content?</label><div className="seg2">
      <button type="button" className={only === true ? "on" : ""} onClick={() => setOnly(true)}><b>Only me</b><span className="t-sm muted">Nobody else is visible or audible.</span></button>
      <button type="button" className={only === false ? "on" : ""} onClick={() => setOnly(false)}><b>Me and others</b><span className="t-sm muted">Each person verifies and consents first.</span></button></div></div>
    {only === false ? (<div className="field"><label>Select everyone else who appears</label>
      {p.participants.length ? <div className="optrow">{p.participants.map((x) => <button key={x.id} type="button" className={"chip" + (sel.includes(x.id) ? " is-on" : "")} onClick={() => setSel((s) => s.includes(x.id) ? s.filter((y) => y !== x.id) : [...s, x.id])}>{x.label}{x.identity === "approved" ? " · verified" : " · not verified yet"}</button>)}</div> : null}
      <Link href="/studio#participants" className="t-sm" style={{ fontWeight: 600 }}>Add a person and send them their private link</Link>
      <span className="t-sm muted">Your own statement is not enough. The delivery stays hidden until each person has verified and consented.</span></div>) : null}
    {lines ? <div className="upl">{lines.map((l) => <div key={l.text} className={"upc" + (l.ok ? "" : " bad")}><Ico n={l.ok ? "check" : "x"} c="sm" /><span>{l.text}</span></div>)}</div> : null}
    {err ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{err}{lines?.some((l) => !l.ok) ? " Fix the item in red and upload again. This protects the buyer, and you." : ""}</span></div> : null}
    <button className="btn btn-brand btn-lg btn-block" disabled={busy || !files.length || only === null || (only === false && !sel.length)} onClick={go}>{busy ? "Checking…" : "Check and send"}</button>
    <p className="t-xs muted">The file check reads only technical facts. A reviewer then checks the content before it is made available.</p>
  </div></div>);
}
