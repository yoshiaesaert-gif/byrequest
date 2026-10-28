"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";

/* "How it works": a slim ribbon on the home page that opens a four step tutorial over a glass wall.
   Two tours: one for people who ask (buyers), one for people who earn (creators). */
const BUY = [
  { k: "want", title: "Say what you want", text: "Type, length, who you have in mind and what it is worth to you. You pay when you post, and nobody ever sees your name or email." },
  { k: "offers", title: "Creators make you an offer", text: "Creators who fit offer to make it: face or not, how long it stays in your vault, when they deliver. You see their stars and how many deals they did." },
  { k: "choose", title: "You choose, the money waits", text: "From the moment you post, our payment partner holds your money. You choose one creator. Not approved, or nobody applies? You get it all back." },
  { k: "vault", title: "Enjoy it in your private vault", text: "Checked before you see it, with your name as a watermark. Not what you agreed? You have 24 hours to object and a person decides." },
] as const;
const EARN = [
  { k: "ask", title: "A buyer posts a request", text: "What, how long, which budget. The amount is on it from the start, so you know what you earn before you lift a finger." },
  { k: "anon", title: "You see the request, not the person", text: "You don't know who the buyer is. Not even whether it's a man or a woman, and that doesn't matter: it's about the job, not the person. You stay anonymous too." },
  { k: "offer", title: "Make an offer in one tap", text: "Face or not, how long it stays in their vault, when you deliver. The buyer picks one creator and pays right away. The money is secured before you start." },
  { k: "cash", title: "Deliver and get paid", text: "Upload in the app. After the check and the 24 hour objection window, the money lands straight in your account. No profile to keep up, no followers, no DMs. Easy extra money." },
] as const;
type K = (typeof BUY)[number]["k"] | (typeof EARN)[number]["k"];

function Ico({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}
const ICONS: Record<K, string> = {
  want: "M4 20h4l10.5-10.5a2.1 2.1 0 00-4-4L4 16v4zM13.5 6.5l4 4",
  offers: "M8 11a3 3 0 100-6 3 3 0 000 6zM16.5 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 19c.8-2.8 2.7-4.3 5-4.3s4.2 1.5 5 4.3M14 14.8c2.4-.6 5.1.6 6 4.2",
  choose: "M7 11V8a5 5 0 0110 0v3M5.5 11h13v9h-13zM12 14.5v2.5",
  vault: "M4 5h16v14H4zM10 9.5v5l4.5-2.5z",
  ask: "M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 16.5h5",
  anon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5",
  offer: "M4 12.5l5 5L20 6.5",
  cash: "M3.5 7h17v10h-17zM12 14.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zM6.5 10v4M17.5 10v4",
};

function Stage({ k }: { k: K }) {
  const t = useT();
  if (k === "want") return (<div className="hw-mock hw-req">
    <span className="hw-kick">{t("Video")} · 10 min</span>
    <b className="hw-title">{t("long shower, no rush")}</b>
    <div className="hw-row"><span className="hw-pill">{t("Woman")}, {t("{a} to {b}", { a: 25, b: 40 })}</span><span className="hw-pill">{t("Face optional")}</span></div>
    <div className="hw-earn"><span style={{ color: "#4434E6" }}>{t("Your budget")}</span><b className="num">€120</b></div>
    <div className="hw-free">{t("Held until delivery")}</div>
  </div>);
  if (k === "offers") return (<div className="hw-mock hw-offers">
    {[["ava", "ava.r", "4.9", 58, "Face shown"], ["lina", "lina.m", "4.8", 22, "No face"], ["jens", "jens", "4.7", 12, "No face"]].map(([img, h, st, n, f], i) => (
      <div key={h as string} className="hw-of" style={{ animationDelay: `${0.15 + i * 0.22}s` }}><img src={`/av/${img}.webp`} alt="" /><div><b>{h}</b><span><span className="star">★</span> {st} · {t("{n} deals", { n: n as number })} · {t(f as string)}</span></div><em>{t("24h")}</em></div>))}
  </div>);
  if (k === "choose") return (<div className="hw-mock hw-cash">
    <div className="hw-lockbig"><Ico d={ICONS.choose} /></div>
    <div className="hw-plus num" style={{ fontSize: "3.6rem" }}>€120</div>
    <div className="hw-held">{t("Held by the payment partner")}</div>
    <div className="hw-track">{[t("You accept"), t("It is made"), t("It matches"), t("Released")].map((x, i) => <span key={x} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>{x}</span>)}</div>
  </div>);
  if (k === "vault") return (<div className="hw-mock hw-vault">
    <div className="hw-tile"><span className="hw-wm">nightowl · nightowl · nightowl</span><span className="hw-playb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9-5.5z" /></svg></span><span className="hw-badge">10:00</span></div>
    <div className="hw-no hw-yes"><span>{t("Checked")}</span><span>{t("Your name as watermark")}</span><span>{t("24h to object")}</span></div>
  </div>);
  if (k === "ask") return (<div className="hw-mock hw-req">
    <span className="hw-kick">{t("Video")} · 10 min</span>
    <b className="hw-title">{t("long shower, no rush")}</b>
    <div className="hw-row"><span className="hw-pill">{t("Face optional")}</span><span className="hw-pill">{t("Within 48 hours")}</span></div>
    <div className="hw-earn"><span>{t("You earn")}</span><b className="num">€96</b></div>
  </div>);
  if (k === "anon") return (<div className="hw-mock hw-anon">
    <div className="hw-who"><span className="hw-q">?</span><span className="hw-ring" /></div>
    <div className="hw-tags"><s>{t("Man")}</s><s>{t("Woman")}</s><em>{t("Doesn't matter")}</em></div>
    <div className="hw-buyer"><span className="star">★</span> 4.8 · {t("{n} deals", { n: 7 })}</div>
  </div>);
  if (k === "offer") return (<div className="hw-mock hw-offer">
    {[t("No face"), t("Vault 30 days"), t("Deliver within 24 hours")].map((x, i) => <div key={x} className="hw-opt" style={{ animationDelay: `${0.15 + i * 0.18}s` }}><i />{x}</div>)}
    <div className="hw-send">{t("Send offer")}</div>
    <div className="hw-lock"><Ico d="M7 11V8a5 5 0 0110 0v3M5.5 11h13v9h-13z" />{t("€120 secured before you start")}</div>
  </div>);
  return (<div className="hw-mock hw-cash">
    <div className="hw-plus num">+€96</div>
    <div className="hw-track">{[t("Upload"), t("Check"), t("24h"), t("Paid")].map((x, i) => <span key={x} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>{x}</span>)}</div>
    <div className="hw-no"><span>{t("No profile")}</span><span>{t("No followers")}</span><span>{t("No hassle")}</span></div>
  </div>);
}

export default function HowItWorks({ hidden = false, variant = "earn", autoOpen = false }: { hidden?: boolean; variant?: "buy" | "earn"; autoOpen?: boolean }) {
  const STEPS: readonly { k: K; title: string; text: string }[] = variant === "buy" ? BUY : EARN;
  const cookie = variant === "buy" ? "brq_hwb" : "brq_hw";
  const t = useT();
  const [open, setOpen] = useState(autoOpen);
  const [gone, setGone] = useState(hidden);
  const [i, setI] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, close, STEPS.length]);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (<>
    {!gone ? <div className="hw-wrap"><button type="button" className="hw-ribbon" onClick={() => { setI(0); setOpen(true); }}>
      <span className="hw-rb-txt"><span className="hw-rb-kick">{t("How it works")}</span><b>{variant === "buy" ? t("Ask. Choose. Enjoy.") : t("One request. One price. Done.")}</b></span>
      <span className="hw-flow" aria-hidden="true">{STEPS.map((x) => <span key={x.k} className="hw-node"><Ico d={ICONS[x.k]} /></span>)}<span className="hw-fill" /><span className="hw-dot" /></span>
      <span className="hw-play"><span className="hw-play-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9-5.5z" /></svg></span>{t("See it in 30 seconds")}</span>
    </button>
      <button type="button" className="hw-hide" aria-label={t("I know how it works, hide this")} title={t("I know how it works, hide this")}
        onClick={() => { document.cookie = `${cookie}=hide; path=/; max-age=31536000; samesite=lax`; setGone(true); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg></button>
    </div> : null}
    {open ? createPortal(
      <div className="hw-glass" role="dialog" aria-modal="true" aria-label={t("How it works")} onClick={close}>
        <div className="hw-modal" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="hw-x" onClick={close} aria-label={t("Close")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <div className="hw-stage" key={s.k} style={{ "--tut": `url(/img/tut_${variant === "buy" ? "b" : ""}${i + 1}.webp)` } as CSSProperties}><Stage k={s.k} /></div>
          <div className="hw-copy">
            <span className="hw-step num">{String(i + 1).padStart(2, "0")} <small>/ {String(STEPS.length).padStart(2, "0")}</small></span>
            <h2 key={s.title}>{t(s.title)}</h2>
            <p key={s.text}>{t(s.text)}</p>
            <div className="hw-dots">{STEPS.map((x, n) => <button key={x.k} type="button" className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={t("Step {n}", { n: n + 1 })} />)}</div>
            <div className="hw-nav">
              {i > 0 ? <button type="button" className="btn btn-secondary" onClick={() => setI(i - 1)}>{t("Back")}</button> : <span />}
              {last
                ? variant === "buy" ? <Link href="/post" className="btn btn-brand" onClick={close}>{t("Post your first request")}</Link> : <Link href="/onboarding" className="btn btn-brand" onClick={close}>{t("Start earning")}</Link>
                : <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>{t("Next")}</button>}
            </div>
            {last ? variant === "buy" ? <Link href="/earn" className="hw-alt" onClick={close}>{t("Rather earn yourself?")} →</Link> : <Link href="/post" className="hw-alt" onClick={close}>{t("Or post a request yourself")} →</Link> : null}
          </div>
        </div>
      </div>, document.body) : null}
  </>);
}
