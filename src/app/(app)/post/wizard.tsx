"use client";
import { giftFee } from "@/domain/referral";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { postRequest } from "../actions";
import { toast } from "@/components/chrome";
import { CAT_LABEL, amountLabel, quote, suggestPrice, type VaultPeriod } from "@/domain/rules";

type Cat = "video" | "photos" | "voice" | "custom";
type Face = "not_needed" | "optional" | "required";
const STEPS = ["type", "details", "who", "access", "budget", "review"] as const;
const COVERS: Record<Cat, string[]> = { video: ["c01", "c03", "c05", "c11", "c13", "c04"], photos: ["c07", "c21", "c23", "c02", "c24", "c22"], voice: ["c17", "c16", "c15", "c18", "c19", "c20"], custom: ["c26", "c25", "c28", "c29", "c30", "c27"] };
const CATS: { k: Cat; ic: string; img: string; sub: string }[] = [
  { k: "video", ic: "video", img: "c05", sub: "Jerk off, shower, strip tease" }, { k: "photos", ic: "image", img: "c21", sub: "Underwear, gym, feet" },
  { k: "voice", ic: "mic", img: "c17", sub: "Moans, dirty talk, your name" }, { k: "custom", ic: "spark", img: "c28", sub: "Alpha Gods or your own idea" },
];
/* Length per type: video starts at 5 minutes and goes up to 10. */
const RANGE: Record<Cat, { min: number; max: number; def: number }> = { video: { min: 1, max: 10, def: 5 }, voice: { min: 1, max: 10, def: 2 }, photos: { min: 1, max: 30, def: 6 }, custom: { min: 1, max: 30, def: 5 } };
const SUGGEST: Record<Cat, string[]> = { video: ["Jerk off video, all the way", "Shower video, slow and steamy", "Slow strip tease, just for me"], photos: ["Underwear try on, 6 pics", "Locker room after the pump", "Socks off after training"], voice: ["Moan my name", "Dirty talk before I sleep", "Whisper what you would do to me"], custom: ["Alpha God: show me where I belong", "Alpha God: you're the boss", "Your own idea, be bold"] };
const CALL = ["My first name", "Master", "Sir", "Daddy", "Slut", "Boy", "Good girl"];
const AGES: [number, number][] = [[18, 25], [25, 35], [35, 45], [45, 99]];
const TINTS = ["ink", "violet", "ember", "ocean", "rose", "gold"] as const;
const TITLE_MIN = 10, DETAILS_MIN = 40;
const TIPS: Record<(typeof STEPS)[number], string[]> = {
  type: ["Pick the type that fits best. You can describe everything else in the next step."],
  details: ["Say what matters: mood, light, outfit, setting, pace and what is said.", "Leave some room for the creator. Their own touch often makes it better.", "No names of real people, no contact details. Those requests are not published.", "Keep the title neutral: everyone on the board can read it."],
  who: ["A wider age range brings more candidates.", "'Face optional' gives creators more freedom, and you more choice."],
  access: ["3 days or more to deliver brings the most candidates.", "The vault period is how long you can watch it. Longer costs a little more.", "Most candidates apply in the first 24 hours."],
  budget: ["Your budget is the amount creators see on the board.", "A service fee and VAT come on top. You see the total before you pay.", "Not approved, or nobody applies? You get everything back."],
  review: ["You pay now. The payment partner holds the money until delivery.", "A person checks your request before it goes live, usually within a few hours."],
};
const euros2 = (c: number) => "€" + (c / 100).toFixed(2);
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const DRAFT = "brq_post_draft";

type Draft = { category: Cat; amount: number; title: string; details: string; callMe: string; who: "Man" | "Woman" | "Anyone"; ages: number[]; face: Face; dueHours: number; minVault: VaultPeriod; openHours: number; price: number | null; neutral: boolean; tint: (typeof TINTS)[number] };

export default function Wizard({ initial, vatBp, ageOk, waiver, freeFee = false, balance = 0, to = null, circle = 0 }: { initial: { category: Cat; amount: number; title: string; details?: string; budget: number }; vatBp: number; ageOk: boolean; waiver: string; freeFee?: boolean; balance?: number; to?: string | null; circle?: number }) {
  const t = useT();
  const [circleFirst, setCircleFirst] = useState(true);
  const [waived, setWaived] = useState(false);
  const [useBal, setUseBal] = useState(balance > 0);
  const [i, setI] = useState(initial.title ? 1 : 0);
  const [w, setW] = useState<Draft>({
    category: initial.category, amount: initial.amount || RANGE[initial.category].def, title: initial.title, details: initial.details ?? "", callMe: "",
    who: "Anyone", ages: [0, 1], face: "not_needed", dueHours: 72, minVault: "30d", openHours: 24, price: initial.budget || null, neutral: false, tint: "violet",
  });
  const [pending, start] = useTransition();
  // The draft survives a reload (for example when a new version of the site goes live mid way).
  useEffect(() => { try { const d = sessionStorage.getItem(DRAFT); if (d && !initial.title) { const x = JSON.parse(d) as { w: Draft; i: number }; queueMicrotask(() => { setW(x.w); setI(x.i); }); } } catch {} }, [initial.title]);
  useEffect(() => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ w, i })); } catch {} }, [w, i]);

  const set = (p: Partial<Draft>) => setW((x) => ({ ...x, ...p }));
  const step = STEPS[i];
  const R = RANGE[w.category];
  const ageMin = AGES[Math.min(...w.ages)]?.[0] ?? 18, ageMax = AGES[Math.max(...w.ages)]?.[1] ?? 99;
  const ageLabel = w.ages.length === 0 || (ageMin === 18 && ageMax === 99) ? t("Any age 18+") : ageMax === 99 ? `${ageMin}+` : t("{a} to {b}", { a: ageMin, b: ageMax });
  const priceOf = (p: Partial<Draft>) => suggestPrice({ category: w.category, amount: w.amount, face: w.face, minVault: w.minVault, dueHours: w.dueHours, ...p } as Parameters<typeof suggestPrice>[0]);
  const suggested = priceOf({});
  const price = w.price ?? suggested;
  const base = quote(price * 100, vatBp);   // the budget is what creators see; service fee and VAT come on top
  const q = freeFee ? giftFee(base) : { ...base, giftCents: 0 };   // a free service fee from the invite programme
  const preview = COVERS[w.category][w.title.length % COVERS[w.category].length];
  const zone = price < suggested * 0.85 ? "low" : price > suggested * 1.2 ? "high" : "mid";
  const canNext = step === "details" ? w.title.trim().length >= TITLE_MIN && w.details.trim().length >= DETAILS_MIN : true;
  const left = (n: number, min: number) => Math.max(0, min - n);

  // Pick up to two neighbouring age bands; a band that is not next to the others starts a new choice.
  const toggleAge = (k: number) => setW((x) => {
    if (x.ages.includes(k)) return { ...x, ages: x.ages.filter((a) => a !== k) };
    const next = [...x.ages, k].sort();
    return { ...x, ages: next.length <= 2 && next[next.length - 1] - next[0] === next.length - 1 ? next : [k] };
  });
  const ups = [
    w.minVault !== "forever" ? { l: "Forever in your vault", p: { minVault: "forever" as VaultPeriod } } : null,
    w.dueHours > 24 ? { l: "Delivered within 24 hours", p: { dueHours: 24 } } : null,
    w.face === "not_needed" ? { l: "Face in the content, optional", p: { face: "optional" as Face } } : null,
  ].filter(Boolean).map((u) => ({ ...u!, extra: priceOf(u!.p) - suggested })).filter((u) => u.extra > 0).slice(0, 3);

  const opt = <K extends keyof Draft>(k: K, v: Draft[K], l: string) => <button key={String(v)} type="button" className={"chip" + (w[k] === v ? " is-on" : "")} onClick={() => set({ [k]: v } as Partial<Draft>)}>{t(l)}</button>;
  const submit = () => start(async () => {
    try {
      const r = await postRequest({ category: w.category, useCredit: useBal && balance > 0, amount: w.amount, title: w.title, details: w.details, callMe: w.callMe, who: w.who, ageMin, ageMax, face: w.face, minVault: w.minVault, dueHours: w.dueHours, budget: price, neutral: w.neutral, tint: w.tint, openHours: w.openHours, waiver: waived, to: to ?? "", circleFirst: circle > 0 && circleFirst });
      if (r && !r.ok) toast(t(r.error), "err"); else sessionStorage.removeItem(DRAFT);
    } catch (e) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) { sessionStorage.removeItem(DRAFT); throw e; }
      location.reload();   // a new release went live while posting: reload, the draft is kept
    }
  });

  const breakdown = (
    <div className="pbk">
      <dl><div><dt>{t("Your budget")}</dt><dd className="num">{euros2(q.dealCents)}</dd></div>
        <div><dt>{t("Service fee {rate}%", { rate: 10 })}</dt><dd className="num">{q.giftCents ? <><s className="muted">{euros2(base.feeCents)}</s> {euros2(q.feeCents)}</> : euros2(q.feeCents)}</dd></div>
        {q.giftCents ? <div className="gift-row"><dt><svg className="ico sm" aria-hidden="true"><use href="#i-gift" /></svg>{t("Free service fee, a gift from your invite")}</dt><dd className="num">−{euros2(q.giftCents)}</dd></div> : null}
        <div><dt>{t("VAT {rate}%", { rate: q.vatRate / 100 })}</dt><dd className="num">{euros2(q.vatCents)}</dd></div>
        {balance > 0 ? <div className="bal-row"><dt><label><input type="checkbox" checked={useBal} onChange={(e) => setUseBal(e.target.checked)} /> {t("Pay with your bonus balance")}</label></dt><dd className="num">{useBal ? "−" + euros2(Math.min(balance, q.total)) : euros2(balance)}</dd></div> : null}
        <div className="tot"><dt>{t("You pay")}</dt><dd className="num">{euros2(q.total - (useBal ? Math.min(balance, q.total) : 0))}</dd></div></dl>
      <p>{t("The service fee covers payment protection, the review of every request and delivery, and support.")}</p>
    </div>);
  const card = (
    <div className="rq wz-card" style={{ pointerEvents: "none" }}>
      <div className="media">{w.neutral ? <span className={"neutralbg g-" + w.tint} /> : <><img className="cimg" src={`/img/${preview}.webp`} alt="" /><span className="cscrim" /><span className="frost" /></>}
        <div className="ov"><div><div className="bn num">{w.amount}<small>{w.category === "photos" ? "PHOTOS" : w.category === "voice" ? "MIN VOICE" : w.category === "custom" ? "MIN CUSTOM" : "MIN VIDEO"}</small></div></div><div className="pr"><span className="lbl">{t("Budget")}</span><b className="num">€{price}</b></div></div></div>
      <div><div className="t">{w.title || t("Your request")}</div><div className="m">{t(CAT_LABEL[w.category])} · {t(w.who)} · {ageLabel}</div></div>
    </div>);

  return (
    <div className="wizard wrap wz2">
      <div className="wz-top"><Link href="/" className="icon-btn" aria-label={t("Close")}><Ico n="x" /></Link><div className="wz-prog"><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div><span className="t-sm muted">{t("Step {n} of {m}", { n: i + 1, m: STEPS.length })}</span></div>
      <div className="wz-grid">
        <div className="wz-body" key={step}>
          {to ? <div className="ic-for"><b>{t("Personal request for {name}", { name: to })}</b><span>{t("Only {name} sees it. Not on the board, nobody else.", { name: to })}</span></div> : null}
          {step === "type" && (<><h2>{t("What would you like?")}</h2><p className="lead">{t("Choose a type. You add the details next.")}</p>
            <div className="choices">{CATS.map((c) => <button key={c.k} className={"choice" + (w.category === c.k ? " is-on" : "")} onClick={() => { set({ category: c.k, amount: RANGE[c.k].def, price: null }); setI(1); }}><span className="ci media"><img className="cimg" src={`/img/${c.img}.webp`} alt="" /><span className="cscrim" /><Ico n={c.ic} /></span><div><b>{t(CAT_LABEL[c.k])}</b><span className="s">{t(c.sub)}</span></div></button>)}
              <button className="choice" disabled><span className="ci media"><img className="cimg" src="/img/c12.webp" alt="" /><span className="cscrim" /><Ico n="shirt" /></span><div><b>{t("Worn items")}</b><span className="s">{t("Coming soon")}</span></div></button></div></>)}

          {step === "details" && (<><h2>{t("Tell creators the details")}</h2><p className="lead">{t("The clearer you are, the better the candidates.")}</p>
            <div className="field"><label>{t(w.category === "photos" ? "Number of photos" : "Length in minutes")}</label><div className="stepperx">
              <button type="button" onClick={() => set({ amount: Math.max(R.min, w.amount - 1), price: null })} disabled={w.amount <= R.min} aria-label={t("Less")}><Ico n="minus" /></button><b className="num">{w.amount}<span className="unit"> {t(w.category === "photos" ? "photos" : "min")}</span></b>
              <button type="button" onClick={() => set({ amount: Math.min(R.max, w.amount + 1), price: null })} disabled={w.amount >= R.max} aria-label={t("More")}><Ico n="plus" /></button></div>
              <span className="t-sm muted">{t(w.category === "photos" ? "The exact number is checked automatically." : "The minimum length is checked automatically. A shorter file cannot be sent.")}</span></div>
            <div className="field"><label htmlFor="wt">{t("Title")}</label><input className="input" id="wt" maxLength={70} placeholder={t(SUGGEST[w.category][0])} value={w.title} onChange={(e) => set({ title: e.target.value })} />
              <span className={"wz-count" + (left(w.title.trim().length, TITLE_MIN) ? "" : " ok")}>{left(w.title.trim().length, TITLE_MIN) ? t("{n} more characters", { n: left(w.title.trim().length, TITLE_MIN) }) : <><Ico n="check" c="sm" />{t("Good title")}</>}</span></div>
            <div className="suggest">{SUGGEST[w.category].map((s) => <button key={s} type="button" className="chip" onClick={() => set({ title: t(s) })}>{t(s)}</button>)}</div>
            <div className="field"><label htmlFor="wd">{t("Describe what you want")}</label><textarea className="input" id="wd" rows={5} maxLength={800} value={w.details} onChange={(e) => set({ details: e.target.value })} placeholder={t("For example: dim light, just a towel, take your time and look into the camera. Say my name at the end.")} />
              <span className={"wz-count" + (left(w.details.trim().length, DETAILS_MIN) ? "" : " ok")}>{left(w.details.trim().length, DETAILS_MIN) ? t("{n} more characters", { n: left(w.details.trim().length, DETAILS_MIN) }) : <><Ico n="check" c="sm" />{t("Clear enough to apply")}</>}<em>{w.details.length}/800</em></span></div>
            <div className="field"><label htmlFor="wc">{t("How should the creator address you?")} <span className="muted">{t("optional")}</span></label>
              <input className="input" id="wc" maxLength={40} value={w.callMe} onChange={(e) => set({ callMe: e.target.value })} placeholder={t("A first name or a title")} autoComplete="off" />
              <div className="suggest">{CALL.map((c) => <button key={c} type="button" className={"chip" + (w.callMe === t(c) ? " is-on" : "")} onClick={() => { if (c === "My first name") { set({ callMe: "" }); document.getElementById("wc")?.focus(); } else set({ callMe: t(c) }); }}>{t(c)}</button>)}</div>
              <span className="t-sm muted">{t("Only the creator you choose sees it, inside the deal. On the board it just says you want to be addressed personally.")}</span></div></>)}

          {step === "who" && (<><h2>{t("Who are you looking for?")}</h2><p className="lead">{t("Creators decide themselves if they fit.")}</p>
            <div className="field"><label>{t("Creator")}</label><div className="optrow">{opt("who", "Man", "Man")}{opt("who", "Woman", "Woman")}{opt("who", "Anyone", "Anyone")}</div></div>
            <div className="field"><label>{t("Age range")}</label><div className="optrow">
              {AGES.map(([a, b], k) => <button key={k} type="button" className={"chip" + (w.ages.includes(k) ? " is-on" : "")} onClick={() => toggleAge(k)}>{b === 99 ? `${a}+` : t("{a} to {b}", { a, b })}</button>)}
              <button type="button" className={"chip" + (w.ages.length === 0 ? " is-on" : "")} onClick={() => set({ ages: [] })}>{t("Any age 18+")}</button></div>
              <span className="t-sm muted">{t("Pick up to two ranges next to each other.")}</span></div>
            <div className="field"><label>{t("Face in the content")}</label><div className="optrow">{opt("face", "not_needed", "Not needed")}{opt("face", "optional", "Optional")}{opt("face", "required", "Required")}</div><span className="t-sm muted">{t("Creators state up front if their face is shown.")}</span></div></>)}

          {step === "access" && (<><h2>{t("Delivery and access")}</h2><p className="lead">{t("How fast you need it, and the minimum time it stays in your vault.")}</p>
            <div className="field"><label>{t("Deliver within")}</label><div className="optrow">{opt("dueHours", 24, "24 hours")}{opt("dueHours", 48, "48 hours")}{opt("dueHours", 72, "3 days")}{opt("dueHours", 168, "1 week")}</div></div>
            <div className="field"><label>{t("Minimum time in your vault")}</label><div className="optrow">{opt("minVault", "7d", "7 days")}{opt("minVault", "30d", "30 days")}{opt("minVault", "1y", "1 year")}{opt("minVault", "forever", "Forever")}</div></div>
            <div className="field"><label>{t("Keep the request open for")}</label><div className="optrow">{opt("openHours", 24, "24 hours")}{opt("openHours", 72, "3 days")}{opt("openHours", 96, "4 days")}</div></div></>)}

          {step === "budget" && (<><h2>{t("What is it worth to you?")}</h2><p className="lead">{t("We suggest a price based on your choices. Adjust it as you like.")}</p>
            <div className="bd">
              <div className="bd-main">
                <div className="bd-amt"><button type="button" onClick={() => set({ price: Math.max(15, price - 5) })} aria-label={t("Lower")}><Ico n="minus" /></button>
                  <span className="num" aria-live="polite">€{price}</span>
                  <button type="button" onClick={() => set({ price: Math.min(2000, price + 5) })} aria-label={t("Higher")}><Ico n="plus" /></button></div>
                {breakdown}
                <div className="tape" aria-hidden="true">
                  <div className="tape-in" style={{ transform: `translateX(-${((Math.min(price, 300) - 10) / 5) * 14}px)` }}>
                    <span className="tape-band" style={{ left: ((suggested * 0.85 - 10) / 5) * 14, width: ((suggested * 0.35) / 5) * 14 }} />
                    {Array.from({ length: 59 }, (_, k) => { const v = 10 + k * 5; return <i key={v} className={v % 50 === 0 ? "big" : v % 10 === 0 ? "mid" : ""} style={{ left: k * 14 }}>{v % 50 === 0 ? <em>€{v}</em> : null}</i>; })}
                  </div>
                  <span className="tape-needle" />
                </div>
                <input className="tape-range" type="range" min={15} max={300} step={5} value={Math.min(price, 300)} onChange={(e) => set({ price: Number(e.target.value) })} aria-label={t("Price")} />
                <p className={"bd-say " + zone}>{zone === "low" ? t("Below what we suggest. Fewer creators may apply.") : zone === "high" ? t("Generous. This one will stand out on the board.") : t("A fair price for this request.")}
                  {price !== suggested ? <button type="button" className="bd-reset" onClick={() => set({ price: null })}>{t("Use suggestion: €{n}", { n: suggested })}</button> : null}</p>
              </div>
              {ups.length ? <div className="bd-ups"><b>{t("Want more?")}</b>{ups.map((u) => (
                <button key={u.l} type="button" onClick={() => set({ ...u.p, price: null })}><span className="num">+€{u.extra}</span>{t(u.l)}<Ico n="right" c="sm" /></button>))}</div> : null}
            </div></>)}

          {step === "review" && (<><h2>{t("Ready to post?")}</h2><p className="lead">{t("You pay now. The payment partner holds the money until delivery. Not approved, or nobody applies? You get everything back.")}</p>
            <div className="card wz-sum"><div className="list">
              {[["Type", `${t(CAT_LABEL[w.category])} · ${amountLabel(w.category, w.amount, t)}`, 1], ["Title", w.title, 1], ["Description", w.details, 1], ...(w.callMe.trim() ? [["Call me", w.callMe.trim(), 1]] : []), ["Looking for", `${t(w.who)}, ${ageLabel}`, 2], ["Face", t(w.face === "not_needed" ? "Not needed" : w.face === "optional" ? "Optional" : "Required"), 2], ["Deliver within", w.dueHours < 72 ? t("{n} hours", { n: w.dueHours }) : t("{n} days", { n: w.dueHours / 24 }), 3], ["Vault at least", t({ "7d": "7 days", "30d": "30 days", "1y": "1 year", forever: "Forever" }[w.minVault]), 3]].map(([k, v, s]) => (
                <div key={k as string} className="lrow"><span className="muted">{t(k as string)}</span><b className={k === "Description" ? "wz-desc" : ""}>{v}</b><button type="button" className="wz-edit" onClick={() => setI(s as number)}>{t("Edit")}</button></div>))}</div></div>
            {circle > 0 && !to ? <label className="ic-first"><input type="checkbox" checked={circleFirst} onChange={(e) => setCircleFirst(e.target.checked)} /><span><b>{t("First to your Inner Circle")}</b><span className="t-sm muted">{t(circle === 1 ? "Your 1 favourite creator sees it 3 hours before everyone else." : "Your {n} favourite creators see it 3 hours before everyone else.", { n: circle })}</span></span></label> : null}
            <div className="field"><label>{t("Your card on the board")}</label>
              <div className="cardpick">
                <button type="button" className={!w.neutral ? "on" : ""} onClick={() => set({ neutral: false })}><span className="cp-prev media"><img className="cimg" src={`/img/${preview}.webp`} alt="" /><span className="cscrim" /><span className="frost" /></span><b>{t("Mood photo")}</b><span className="t-sm muted">{t("We pick one that keeps the board varied. Covered by frosted glass.")}</span></button>
                <button type="button" className={w.neutral ? "on" : ""} onClick={() => set({ neutral: true })}><span className="cp-prev media"><span className={"neutralbg g-" + w.tint} /></span><b>{t("A colour")}</b><span className="t-sm muted">{t("No photo, just your colour. The most discreet option.")}</span>
                  {w.neutral ? <span className="tints" onClick={(e) => e.stopPropagation()}>{TINTS.map((c) => <i key={c} role="button" tabIndex={0} aria-label={c} className={"tint g-" + c + (w.tint === c ? " on" : "")} onClick={() => set({ tint: c })} onKeyDown={(e) => e.key === "Enter" && set({ tint: c })} />)}</span> : null}</button>
              </div></div>
            <div className="card wz-pay">
              {breakdown}
              {ageOk ? <label className="check waiver"><input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} /><span>{t(waiver)}</span></label>
                : <><p className="t-sm">{t("Confirm your age once before you pay. It takes a minute with our verification partner. ByRequest only keeps the result, never your ID.")}</p>
                  <a className="btn btn-secondary" href={`/verify-age?next=${encodeURIComponent("/post")}`}>{t("Confirm my age")}</a></>}
            </div>
            <p className="t-sm muted">{t("By posting you confirm the request follows the rules: adults only, no other people without their consent, nothing illegal.")}</p></>)}
        </div>

        <aside className="wz-aside">
          <span className="wz-cap">{t("Live preview")}</span>
          {card}
          <div className="wz-price"><span>{t("Budget")} <b className="num">€{price}</b></span><span className="wz-pay-l">{t("You pay")} <b className="num">{euros2(q.total - (useBal ? Math.min(balance, q.total) : 0))}</b></span></div>
          <div className="wz-tips"><b><Ico n="spark" c="sm" />{t("Tips")}</b><ul>{TIPS[step].map((x) => <li key={x}>{t(x)}</li>)}</ul></div>
        </aside>
      </div>
      <div className="wz-foot">
        <button className="btn btn-secondary" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>{t("Back")}</button>
        {step === "review" ? <button className="btn btn-brand btn-lg" onClick={submit} disabled={pending || !ageOk || !waived}>{pending ? t("Securing payment…") : t("Pay {amount} and post", { amount: euros2(q.total - (useBal ? Math.min(balance, q.total) : 0)) })}</button>
          : <button className="btn btn-primary btn-lg" onClick={() => setI(i + 1)} disabled={!canNext}>{t("Continue")}</button>}
      </div>
    </div>
  );
}
