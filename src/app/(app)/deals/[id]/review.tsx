"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rate, rateBuyer, tip as sendTip } from "../../actions";
import { toast } from "@/components/chrome";
import { useT } from "@/i18n/client";
import { tipSplit, TIP_CHOICES, TIP_MIN_CENTS, TIP_MAX_CENTS } from "@/domain/referral";

const eur = (c: number) => "€" + (c / 100).toFixed(c % 100 ? 2 : 0).replace(".", ",");

function Stars({ value, onChange, size = "lg", label }: { value: number; onChange: (n: number) => void; size?: "lg" | "sm"; label: string }) {
  return <div className={"stars-in " + size} role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => (
    <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`} className={n <= value ? "on" : ""} onClick={() => onChange(n)}>★</button>))}</div>;
}
function YesNo({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean) => void; label: string }) {
  const t = useT();
  return <div className="rv-q"><span>{label}</span><div className="seg">{[true, false].map((v) => <button key={String(v)} type="button" className={value === v ? "on" : ""} onClick={() => onChange(v)}>{v ? t("Yes") : t("No")}</button>)}</div></div>;
}

/* Tip picker, shared by the review card and the stand alone tip card. */
function TipPicker({ value, onChange, vatBp, name }: { value: number; onChange: (c: number) => void; vatBp: number; name: string }) {
  const t = useT();
  const [custom, setCustom] = useState("");
  const share = value ? tipSplit(value, vatBp).creatorCents : 0;
  return (<div className="tipx">
    <div className="tip-chips">{[0, ...TIP_CHOICES].map((c) => <button key={c} type="button" className={"chip" + (value === c && !custom ? " is-on" : "")} onClick={() => { setCustom(""); onChange(c); }}>{c ? eur(c) : t("No tip")}</button>)}
      <label className={"chip tip-own" + (custom ? " is-on" : "")}>€<input inputMode="numeric" placeholder={t("Other")} value={custom} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setCustom(v); onChange(v ? Number(v) * 100 : 0); }} aria-label={t("Other amount")} /></label></div>
    {value ? <p className="t-sm tip-note">{value < TIP_MIN_CENTS || value > TIP_MAX_CENTS ? t("Pick a tip between €2 and €200.") : t("You pay {amount}. {name} gets {share}, paid out with the deal.", { amount: eur(value), name, share: eur(share) })}</p> : null}
  </div>);
}

export function BuyerReview({ dealId, name, vatBp, canTip }: { dealId: string; name: string; vatBp: number; canTip: boolean }) {
  const t = useT();
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [quality, setQuality] = useState(0), [communication, setComm] = useState(0);
  const [asAgreed, setAgreed] = useState<boolean | null>(null), [onTime, setOnTime] = useState<boolean | null>(null), [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const [tipC, setTip] = useState(0);
  const [pending, start] = useTransition();
  const ready = stars > 0 && quality > 0 && communication > 0 && asAgreed !== null && onTime !== null && (!tipC || (tipC >= TIP_MIN_CENTS && tipC <= TIP_MAX_CENTS));
  const go = () => start(async () => {
    const r = await rate(dealId, { stars, quality, communication, asAgreed: !!asAgreed, onTime: !!onTime, overDelivered: over, text }, canTip ? tipC : 0);
    if (r.ok) { toast(t(r.msg!)); router.refresh(); } else toast(t(r.error), "err");
  });
  return (<section className="card review" id="rate">
    <div className="rv-h"><span className="eyebrow">{t("Your review")}</span><b className="t-h2">{t("How was it with {name}?", { name })}</b></div>
    <Stars value={stars} onChange={setStars} label={t("Overall")} />
    {stars ? (<>
      <div className="rv-qs">
        <div className="rv-q"><span>{t("Quality of the content")}</span><Stars size="sm" value={quality} onChange={setQuality} label={t("Quality of the content")} /></div>
        <div className="rv-q"><span>{t("Communication")}</span><Stars size="sm" value={communication} onChange={setComm} label={t("Communication")} /></div>
        <YesNo label={t("Was it what you agreed?")} value={asAgreed} onChange={setAgreed} />
        <YesNo label={t("Delivered on time?")} value={onTime} onChange={setOnTime} />
        <label className="rv-over"><input type="checkbox" checked={over} onChange={(e) => { setOver(e.target.checked); if (e.target.checked && !tipC && canTip) setTip(TIP_CHOICES[1]); }} /><span><b>{t("{name} went the extra mile", { name })}</b><small>{t("More than you asked for. It shows on their profile.")}</small></span></label>
      </div>
      <div className="field"><label htmlFor="rvtext">{t("A few words, optional")}</label><textarea id="rvtext" className="input" rows={2} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("What made it good? Shown on their profile with your username.")} /></div>
      {canTip ? <div className={"tip-box" + (over || stars === 5 ? " warm" : "")}><b>{t("Leave a tip?")}</b><p className="t-sm muted">{t("Optional, like after a great ride. It goes to {name} as a thank you.", { name })}</p><TipPicker value={tipC} onChange={setTip} vatBp={vatBp} name={name} /></div> : null}
      <button type="button" className="btn btn-brand btn-lg btn-block" disabled={!ready || pending} onClick={go}>{pending ? t("Sending…") : tipC && canTip ? t("Send review and {amount} tip", { amount: eur(tipC) }) : t("Send review")}</button>
      {!ready ? <p className="t-xs muted">{t("Answer the questions above to send.")}</p> : null}
    </>) : <p className="t-sm muted">{t("Tap the stars. It takes ten seconds and helps everyone choose.")}</p>}
  </section>);
}

/* After the review: a tip can still be given while the window is open. */
export function TipCard({ dealId, name, vatBp }: { dealId: string; name: string; vatBp: number }) {
  const t = useT();
  const router = useRouter();
  const [tipC, setTip] = useState(TIP_CHOICES[1]);
  const [pending, start] = useTransition();
  return (<section className="card review tip-only" id="tip">
    <div className="rv-h"><span className="eyebrow">{t("Tip")}</span><b className="t-h3">{t("Want to thank {name}?", { name })}</b><p className="t-sm muted">{t("Optional, like after a great ride. It goes to {name} as a thank you.", { name })}</p></div>
    <TipPicker value={tipC} onChange={setTip} vatBp={vatBp} name={name} />
    <button type="button" className="btn btn-brand btn-block" disabled={pending || !tipC || tipC < TIP_MIN_CENTS || tipC > TIP_MAX_CENTS} onClick={() => start(async () => { const r = await sendTip(dealId, tipC); if (r.ok) { toast(t(r.msg!)); router.refresh(); } else toast(t(r.error), "err"); })}>{pending ? t("Sending…") : t("Tip {amount}", { amount: eur(tipC || 0) })}</button>
  </section>);
}

export function CreatorReview({ dealId, name }: { dealId: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [clear, setClear] = useState<boolean | null>(null), [respectful, setResp] = useState<boolean | null>(null), [again, setAgain] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const ready = stars > 0 && clear !== null && respectful !== null && again !== null;
  return (<section className="card review" id="rate">
    <div className="rv-h"><span className="eyebrow">{t("Your review")}</span><b className="t-h2">{t("How was {name} as a buyer?", { name })}</b><p className="t-sm muted">{t("Only stars show, never your words. It helps other creators pick good requests.")}</p></div>
    <Stars value={stars} onChange={setStars} label={t("Overall")} />
    {stars ? (<>
      <div className="rv-qs">
        <YesNo label={t("Was the request clear?")} value={clear} onChange={setClear} />
        <YesNo label={t("Respectful in the chat?")} value={respectful} onChange={setResp} />
        <YesNo label={t("Would you work for them again?")} value={again} onChange={setAgain} />
      </div>
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!ready || pending} onClick={() => start(async () => { const r = await rateBuyer(dealId, { stars, clear: !!clear, respectful: !!respectful, again: !!again }); if (r.ok) { toast(t(r.msg!)); router.refresh(); } else toast(t(r.error), "err"); })}>{pending ? t("Sending…") : t("Send review")}</button>
    </>) : <p className="t-sm muted">{t("Tap the stars. It takes ten seconds.")}</p>}
  </section>);
}

/* Shown once both sides are done: what was given, so nothing is a mystery. */
export function ReviewDone({ stars, tipCents, name, buyer }: { stars: number | null; tipCents: number; name: string; buyer: boolean }) {
  const t = useT();
  if (!stars && !tipCents) return null;
  return <div className="rv-done">{stars ? <span><b className="star">{"★".repeat(stars)}</b> {buyer ? t("Your review for {name}", { name }) : t("Review from your buyer")}</span> : null}
    {tipCents ? <span className="rv-tip">{buyer ? t("You tipped {amount}", { amount: eur(tipCents) }) : t("Tip received: {amount}", { amount: eur(tipCents) })}</span> : null}</div>;
}
