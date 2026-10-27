"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { postRequest } from "../actions";
import { toast } from "@/components/chrome";
import { CAT_LABEL, euros, CREATOR_SHARE, amountLabel } from "@/domain/rules";

type Cat = "video" | "photos" | "voice" | "custom";
const STEPS = ["type", "details", "who", "access", "budget", "cover", "review"] as const;
const COVERS: Record<Cat, string[]> = { video: ["c01", "c03", "c05", "c11", "c13", "c04"], photos: ["c07", "c21", "c23", "c02", "c24", "c22"], voice: ["c17", "c16", "c15", "c18", "c19", "c20"], custom: ["c26", "c25", "c28", "c29", "c30", "c27"] };
const CATS: { k: Cat; ic: string; img: string; sub: string }[] = [
  { k: "video", ic: "video", img: "c05", sub: "Shower, workout, routine" }, { k: "photos", ic: "image", img: "c21", sub: "A set, in full resolution" },
  { k: "voice", ic: "mic", img: "c17", sub: "Good night, good morning, your name" }, { k: "custom", ic: "spark", img: "c28", sub: "Your own idea" },
];
const SUGGEST: Record<Cat, string[]> = { video: ["Shower video, calm and natural", "After the gym", "Morning routine"], photos: ["Post workout photo set", "Fit check", "Fresh sneakers"], voice: ["Good night voice note", "Good morning message", "Say my name"], custom: ["Your own idea, surprise me", "Birthday clip", "Ring light shoot"] };
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const DEF_BAND: Record<Cat, [number, number]> = { video: [60, 110], photos: [25, 45], voice: [15, 40], custom: [45, 120] };

export default function Wizard({ initial, bands }: { initial: { category: Cat; amount: number; title: string; budget: number }; bands: Record<string, [number, number]> }) {
  const [i, setI] = useState(initial.title ? 1 : 0);
  const [w, setW] = useState({
    category: initial.category, amount: initial.amount, title: initial.title, details: "",
    who: "Man" as "Man" | "Woman" | "Anyone", ageMin: 18, ageMax: 30, face: "not_needed" as "not_needed" | "optional" | "required",
    dueHours: 48, minVault: "30d" as "7d" | "30d" | "1y" | "forever", budget: initial.budget || 0, cover: "", openHours: 24, shift: 0,
  });
  const [pending, start] = useTransition();
  const set = (p: Partial<typeof w>) => setW((x) => ({ ...x, ...p }));
  const band = bands[w.category] ?? DEF_BAND[w.category];
  const budget = w.budget || Math.round((band[0] + band[1]) / 2 / 5) * 5;
  const step = STEPS[i];
  const unit = w.category === "photos" ? "photos" : "min";
  const covers = COVERS[w.category];
  const opts = [0, 1, 2].map((k) => covers[(w.shift + k) % covers.length]).concat("neutral");
  const cover = w.cover && opts.includes(w.cover) ? w.cover : opts[0];
  const canNext = step === "details" ? w.title.trim().length >= 4 : true;
  const verdict = budget < band[0] ? "Below most similar deals. Expect fewer offers." : budget > band[1] ? "Above most similar deals. Expect fast offers." : "In line with similar deals.";

  const opt = (k: keyof typeof w, v: string | number, l: string) => <button key={String(v)} type="button" className={"chip" + (w[k] === v ? " is-on" : "")} onClick={() => set({ [k]: v } as Partial<typeof w>)}>{l}</button>;
  const submit = () => start(async () => {
    const r = await postRequest({ category: w.category, amount: w.amount, title: w.title, details: w.details, who: w.who, ageMin: w.ageMin, ageMax: w.ageMax, face: w.face, minVault: w.minVault, dueHours: w.dueHours, budget, cover, openHours: w.openHours });
    if (r && !r.ok) toast(r.error, "err");
  });

  return (
    <div className="wizard wrap" style={{ maxWidth: 760 }}>
      <div className="wz-top"><Link href="/" className="icon-btn" aria-label="Close"><Ico n="x" /></Link><div className="wz-prog"><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div><span className="t-sm muted">{i + 1} of {STEPS.length}</span></div>
      <div className="wz-body">
        {step === "type" && (<><h2>What would you like?</h2><p className="lead">Choose a type. You add the details next.</p>
          <div className="choices">{CATS.map((c) => <button key={c.k} className={"choice" + (w.category === c.k ? " is-on" : "")} onClick={() => { set({ category: c.k, amount: c.k === "photos" ? 6 : c.k === "voice" ? 2 : 10, cover: "", shift: 0 }); setI(1); }}><span className="ci media"><img className="cimg" src={`/img/${c.img}.webp`} alt="" /><span className="cscrim" /><Ico n={c.ic} /></span><div><b>{CAT_LABEL[c.k]}</b><span className="s">{c.sub}</span></div></button>)}
            <button className="choice" disabled><span className="ci media"><img className="cimg" src="/img/c12.webp" alt="" /><span className="cscrim" /><Ico n="shirt" /></span><div><b>Worn items</b><span className="s">Coming soon</span></div></button></div></>)}

        {step === "details" && (<><h2>Tell creators the details</h2><p className="lead">Keep the title short and neutral. Everyone can see it.</p>
          <div className="field"><label>{w.category === "photos" ? "Number of photos" : "Length in minutes"}</label><div className="stepperx">
            <button type="button" onClick={() => set({ amount: Math.max(1, w.amount - 1) })} aria-label="Less"><Ico n="minus" /></button><b className="num">{w.amount}<span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--muted)" }}> {unit}</span></b>
            <button type="button" onClick={() => set({ amount: Math.min(60, w.amount + 1) })} aria-label="More"><Ico n="plus" /></button></div>
            <span className="t-sm muted">{w.category === "photos" ? "The exact number is checked automatically." : "The minimum length is checked automatically. A shorter file cannot be sent."}</span></div>
          <div className="field"><label htmlFor="wt">Title</label><input className="input" id="wt" maxLength={70} placeholder={SUGGEST[w.category][0]} value={w.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="suggest">{SUGGEST[w.category].map((s) => <button key={s} type="button" className="chip" onClick={() => set({ title: s })}>{s}</button>)}</div>
          <div className="field"><label htmlFor="wd">More details, optional</label><textarea className="input" id="wd" rows={3} maxLength={600} style={{ height: "auto", padding: 14 }} value={w.details} onChange={(e) => set({ details: e.target.value })} placeholder="Mood, light, what to wear. Keep it within the rules." /></div></>)}

        {step === "who" && (<><h2>Who are you looking for?</h2><p className="lead">Creators decide themselves if they fit.</p>
          <div className="field"><label>Creator</label><div className="optrow">{opt("who", "Man", "Man")}{opt("who", "Woman", "Woman")}{opt("who", "Anyone", "Anyone")}</div></div>
          <div className="field"><label>Age range</label><div className="optrow">{[[18, 25], [20, 30], [25, 35], [30, 45], [18, 99]].map(([a, b]) => <button key={a + "-" + b} type="button" className={"chip" + (w.ageMin === a && w.ageMax === b ? " is-on" : "")} onClick={() => set({ ageMin: a, ageMax: b })}>{b === 99 ? "Any age 18+" : `${a} to ${b}`}</button>)}</div><span className="t-sm muted">Shown on your card instead of any location.</span></div>
          <div className="field"><label>Face in the content</label><div className="optrow">{opt("face", "not_needed", "Not needed")}{opt("face", "optional", "Optional")}{opt("face", "required", "Required")}</div><span className="t-sm muted">Creators state up front if their face is shown. You see it on every offer.</span></div></>)}

        {step === "access" && (<><h2>Delivery and access</h2><p className="lead">How fast you need it, and the minimum time it stays in your vault.</p>
          <div className="field"><label>Deliver within</label><div className="optrow">{opt("dueHours", 24, "24 hours")}{opt("dueHours", 48, "48 hours")}{opt("dueHours", 72, "3 days")}{opt("dueHours", 168, "1 week")}</div></div>
          <div className="field"><label>Minimum time in your vault</label><div className="optrow">{opt("minVault", "7d", "7 days")}{opt("minVault", "30d", "30 days")}{opt("minVault", "1y", "1 year")}{opt("minVault", "forever", "Forever")}</div><span className="t-sm muted">Creators with a shorter access period cannot make an offer.</span></div>
          <div className="field"><label>Keep the request open for</label><div className="optrow">{opt("openHours", 6, "6 hours")}{opt("openHours", 24, "24 hours")}{opt("openHours", 72, "3 days")}</div></div></>)}

        {step === "budget" && (<><h2>Set your budget</h2><p className="lead">This is the deal value creators see. A 10% service fee is added at checkout.</p>
          <div className="card pricebox"><div className="stepperx"><button type="button" onClick={() => set({ budget: Math.max(10, budget - 5) })} aria-label="Lower"><Ico n="minus" /></button><span className="big num">{euros(budget * 100)}</span><button type="button" onClick={() => set({ budget: Math.min(2000, budget + 5) })} aria-label="Higher"><Ico n="plus" /></button></div>
            <div className="guide"><div className="bar"><span className="band" style={{ left: `${(band[0] / 300) * 100}%`, width: `${((band[1] - band[0]) / 300) * 100}%` }} /><input type="range" className="range" min={10} max={300} step={5} value={Math.min(budget, 300)} onChange={(e) => set({ budget: Number(e.target.value) })} aria-label="Budget" /></div>
              <div className="lbl"><span>€10</span><span>Similar deals: {euros(band[0] * 100)} to {euros(band[1] * 100)}</span><span>€300</span></div></div><b>{verdict}</b></div>
          <div className="breakdown card" style={{ padding: "16px 20px" }}><div><span className="muted">Your budget</span><span className="num">{euros(budget * 100)}</span></div><div><span className="muted">Service fee 10%</span><span className="num">€{(budget * 0.1).toFixed(2)}</span></div><div className="tot"><span>Secured when you accept an offer</span><span className="num">€{(budget * 1.1).toFixed(2)}</span></div></div></>)}

        {step === "cover" && (<><h2>Choose your cover</h2><p className="lead">This is how your request looks on the board. Pick a mood photo, or stay fully neutral.</p>
          <div className="covpick">{opts.map((o) => (
            <button key={o} type="button" className={"cov" + (cover === o ? " is-on" : "")} onClick={() => set({ cover: o })} aria-pressed={cover === o}>
              <div className="rq" style={{ pointerEvents: "none" }}><div className="media">{o === "neutral" ? <span className="neutralbg" /> : <><img className="cimg" src={`/img/${o}.webp`} alt="" /><span className="cscrim" /></>}
                <div className="ov"><div><div className="bn num">{w.amount}<small>{w.category === "photos" ? "PHOTOS" : w.category === "voice" ? "MIN VOICE" : w.category === "custom" ? "MIN CUSTOM" : "MIN VIDEO"}</small></div></div><div className="pr"><span className="lbl">Earn</span><b className="num">{euros(Math.round(budget * 100 * CREATOR_SHARE))}</b></div></div></div></div>
              <span className="covl">{o === "neutral" ? "Neutral cover" : "Mood photo"}</span></button>))}</div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => set({ shift: w.shift + 3, cover: "" })}><Ico n="swap" c="sm" />Show other photos</button></>)}

        {step === "review" && (<><h2>Ready to post?</h2><p className="lead">Nothing is charged now. You only pay when you accept an offer.</p>
          <div className="card" style={{ padding: "4px 20px" }}><div className="list">
            {[["Type", `${CAT_LABEL[w.category]} · ${amountLabel(w.category, w.amount)}`], ["Title", w.title], ["Looking for", `${w.who}, ${w.ageMax === 99 ? "any age 18+" : `${w.ageMin} to ${w.ageMax}`}`], ["Face", w.face === "not_needed" ? "Not needed" : w.face === "optional" ? "Optional" : "Required"], ["Deliver within", w.dueHours < 72 ? `${w.dueHours} hours` : `${w.dueHours / 24} days`], ["Vault at least", { "7d": "7 days", "30d": "30 days", "1y": "1 year", forever: "Forever" }[w.minVault]], ["Budget", `${euros(budget * 100)} plus €${(budget * 0.1).toFixed(2)} fee`], ["Cover", cover === "neutral" ? "Neutral" : "Mood photo"]].map(([k, v]) => (
              <div key={k} className="lrow" style={{ gridTemplateColumns: "140px minmax(0,1fr)" }}><span className="muted">{k}</span><b>{v}</b></div>))}</div></div>
          <p className="t-sm muted">By posting you confirm the request follows the rules: adults only, no other people without their consent, nothing illegal.</p></>)}
      </div>
      <div className="wz-foot">
        <button className="btn btn-secondary" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
        {step === "review" ? <button className="btn btn-brand btn-lg" onClick={submit} disabled={pending}>{pending ? "Posting…" : "Post request"}</button>
          : <button className="btn btn-primary" onClick={() => setI(i + 1)} disabled={!canNext}>Continue</button>}
      </div>
    </div>
  );
}
