"use client";
import { LOOKS } from "@/domain/looks";
import { useT } from "@/i18n/client";
import { useActionState, useState } from "react";
import { BUYER_COUNTRIES } from "@/config/compliance";
import { PasskeySignIn } from "@/components/passkey";
import { sendCode, checkCode, createAccount, appealClosed, handleFree, type AuthState } from "./actions";



export default function SignInForm({ intent, refCode }: { intent?: "buy" | "earn"; refCode?: string }) {
  const t = useT();
  const [s1, send, p1] = useActionState<AuthState, FormData>(sendCode, { step: "email" });
  const [s2, check, p2] = useActionState<AuthState, FormData>(checkCode, s1);
  const [s3, create, p3] = useActionState<AuthState, FormData>(createAccount, { step: "profile" });
  const [s4, appeal, p4] = useActionState<AuthState, FormData>(appealClosed, { step: "blocked" });
  if (s2.step === "blocked") return (
    <form action={appeal} className="authstack">
      <div><h2 className="t-h1">{t("This account is closed")}</h2><p className="muted" style={{ marginTop: 8 }}>{s2.reason}</p></div>
      {s4.sent ? <p>{t("Your appeal was received. A person who did not take the first decision reviews it and replies by email.")}</p> : (<>
        <div className="field"><label htmlFor="ap">{t("Do you disagree? Tell us why")}</label><textarea id="ap" name="msg" className="input" rows={4} style={{ height: "auto", padding: 14 }} required minLength={10} /></div>
        {s4.error ? <p className="formerr" role="alert">{t(s4.error)}</p> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={p4}>{p4 ? t("Sending…") : t("Send appeal")}</button></>)}
      <p className="t-xs muted">{t("You can also go to an out of court dispute settlement body certified under the Digital Services Act, or to court.")}</p>
    </form>
  );
  const step = s2.step === "profile" ? "profile" : s1.step === "code" ? "code" : "email";

  if (step === "profile") return <Join create={create} pending={p3} error={s3.error} refCode={refCode} />;   // the role is always an explicit first choice

  if (step === "code") return (
    <form action={check} className="authstack">
      <input type="hidden" name="email" value={s1.email} />
      {s1.devCode
        ? <div><h2 className="t-h1">{t("Confirm your email")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("Your code for {email} is filled in below. Press continue to set up your account.", { email: s1.email ?? "" })}</p></div>
        : <div><h2 className="t-h1">{t("Check your inbox")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("We sent a six digit code to")} {s1.email}. {t("The subject line stays neutral. Check your spam folder if it does not arrive within a minute.")}</p></div>}
      <div className="field"><label htmlFor="code">{t("Code")}</label><input className="input codeinput" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} defaultValue={s1.devCode ?? ""} onPaste={(e) => { const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (d) { e.preventDefault(); e.currentTarget.value = d; } }} autoFocus required /></div>
      {s2.error ? <p className="formerr" role="alert">{t(s2.error)}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p2}>{p2 ? t("Checking…") : t("Continue")}</button>
    </form>
  );

  return (
    <form action={send} className="authstack">
      <div><h2 className="t-h1">{intent === "earn" ? t("Start earning") : intent === "buy" ? t("Post your first request") : t("Welcome to ByRequest")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("Sign in or join with your email. No password: you get a six digit code. Nobody on ByRequest ever sees your email.")}</p></div>
      <div className="field"><label htmlFor="email">{t("Email")}</label><input className="input" id="email" name="email" type="email" autoComplete="email webauthn" placeholder={t("you@example.com")} required /></div>
      {s1.error ? <p className="formerr" role="alert">{t(s1.error)}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p1}>{p1 ? t("Sending…") : t("Continue with email")}</button>
      <PasskeySignIn />
    </form>
  );
}

/* Sign up after the email code, in four short steps. Nothing is saved until the last step. */
const STEPS = ["role", "you", "about", "agree"] as const;
const ERR_STEP: [RegExp, (typeof STEPS)[number]][] = [[/username|letters, numbers/i, "you"], [/adults|birth|country/i, "about"], [/18 or older|consent|terms/i, "agree"], [/choose what/i, "role"]];

function Join({ create, pending, error, intent, refCode }: { create: (f: FormData) => void; pending: boolean; error?: string; intent?: "buy" | "earn"; refCode?: string }) {
  const t = useT();
  const [step, setStep] = useState<(typeof STEPS)[number]>(intent ? "you" : "role");
  const [f, setF] = useState({ intent: (intent ?? "") as "" | "buy" | "earn", handle: "", look: "kai", birthYear: "", country: "BE", adult: false, sensitive: false, marketing: false, ref: refCode ?? "" });
  const [showRef, setShowRef] = useState(!!refCode);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [seen, setSeen] = useState<string | undefined>();
  if (error && error !== seen) { setSeen(error); setErr(error); setStep(ERR_STEP.find(([re]) => re.test(error))?.[1] ?? "agree"); }
  const i = STEPS.indexOf(step);
  const go = (n: number) => { setErr(null); setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, n))]); };
  const year = Number(f.birthYear), age = new Date().getFullYear() - year;

  const next = async () => {
    if (step === "you") {
      setChecking(true); const r = await handleFree(f.handle.trim().toLowerCase()); setChecking(false);
      if (!r.ok) return setErr(r.error ?? "That username is taken.");
    }
    if (step === "about" && (!/^\d{4}$/.test(f.birthYear) || age < 18 || age > 110)) return setErr(age < 18 && /^\d{4}$/.test(f.birthYear) ? "ByRequest is for adults only." : "Enter your year of birth.");
    go(i + 1);
  };
  const submit = () => {
    if (!f.adult || !f.sensitive) return setErr(!f.adult ? "You must confirm you are 18 or older and accept the terms." : "We need your explicit consent to handle requests and chats about intimate content.");
    const d = new FormData();
    d.set("intent", f.intent); d.set("handle", f.handle.trim().toLowerCase()); d.set("look", f.look); d.set("birthYear", f.birthYear); d.set("country", f.country);
    if (f.adult) d.set("adult", "on"); if (f.sensitive) d.set("sensitive", "on"); if (f.marketing) d.set("marketing", "on");
    if (f.ref.trim()) d.set("ref", f.ref.trim());
    create(d);
  };

  return (<div className="join">
    <img className="join-logo" src="/logo.png" alt="byrequest" />
    <div className="join-top">
      {i > 0 ? <button type="button" className="join-back" onClick={() => go(i - 1)}>← {t("Back")}</button> : <span />}
      <span className="join-count">{t("Step {n} of {m}", { n: i + 1, m: STEPS.length })}</span>
    </div>
    <div className="join-bar"><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>

    {step === "role" ? (<div className="join-step" key="role">
      <h2 className="t-h1">{t("How do you want to use ByRequest?")}</h2>
      <p className="muted">{t("You can always do both later. This only decides where you start.")}</p>
      <div className="roles">
        <button type="button" className={"role-c media" + (f.intent === "buy" ? " on" : "")} onClick={() => { setF({ ...f, intent: "buy" }); go(1); }}>
          <img className="cimg" src="/img/c05.webp" alt="" /><span className="role-shade" />
          <span className="role-chip">{t("Video")} · 10 min · <b>€80</b></span>
          <span className="role-tx"><b>{t("I want content made for me")}</b><span>{t("Describe what you want and set your budget. Verified creators apply, you choose who makes it.")}</span></span></button>
        <button type="button" className={"role-c media" + (f.intent === "earn" ? " on" : "")} onClick={() => { setF({ ...f, intent: "earn" }); go(1); }}>
          <img className="cimg" src="/img/c21.webp" alt="" /><span className="role-shade" />
          <span className="role-chip earn">{t("You earn")} <b>€64</b></span>
          <span className="role-tx"><b>{t("I am a content creator")}</b><span>{t("Pick the requests you like, make them and get paid. No followers needed.")}</span></span></button>
      </div>
    </div>) : null}

    {step === "you" ? (<div className="join-step" key="you">
      <h2 className="t-h1">{t("This is how others see you")}</h2>
      <p className="muted">{t("Only your username and avatar are ever shown. Never your name or email.")}</p>
      <div className="join-preview"><img src={`/av/${f.look}.webp`} alt="" /><div><b>{f.handle.trim().toLowerCase() || t("yourname")}</b><span>{f.intent === "earn" ? t("Verified creator") : t("New buyer")}</span></div></div>
      <div className="field"><label htmlFor="handle">{t("Username")}</label><input className="input" id="handle" value={f.handle} onChange={(e) => { setErr(null); setF({ ...f, handle: e.target.value }); }} placeholder={t("for example nightowl")} autoComplete="off" autoFocus maxLength={20} />
        <span className="t-sm muted">{t("3 to 20 letters, numbers, dots or underscores. Pick something that is not your real name.")}</span></div>
      <div className="field"><label>{t("Pick a look")}</label><div className="looks">{LOOKS.map((l) => (
        <button type="button" key={l} className={"look" + (l === f.look ? " on" : "")} onClick={() => setF({ ...f, look: l })} aria-pressed={l === f.look} aria-label={`Look ${l}`}><img src={`/av/${l}.webp`} alt="" /></button>))}</div>
        <span className="t-sm muted">{t("You can fine tune it later, or use a blurred photo.")}</span></div>
    </div>) : null}

    {step === "about" ? (<div className="join-step" key="about">
      <h2 className="t-h1">{t("A few details about you")}</h2>
      <p className="muted">{t("Needed by law. Never shown to anyone.")}</p>
      <div className="field"><label htmlFor="by">{t("Year of birth")}</label><input className="input" id="by" inputMode="numeric" maxLength={4} value={f.birthYear} onChange={(e) => { setErr(null); setF({ ...f, birthYear: e.target.value.replace(/\D/g, "") }); }} placeholder="1996" autoFocus />
        <span className="t-sm muted">{t("ByRequest is for adults only. Before you pay or get paid, your age is confirmed once with our verification partner.")}</span></div>
      <div className="field"><label htmlFor="cty">{t("Country")}</label><select className="input" id="cty" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{BUYER_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{t(n)}</option>)}</select>
        <span className="t-sm muted">{t("Used for VAT and the law that applies. Never shown.")}</span></div>
    </div>) : null}

    {step === "agree" ? (<div className="join-step" key="agree">
      <h2 className="t-h1">{t("Last step")}</h2>
      <p className="muted">{t("Read what you agree to. It is short.")}</p>
      <label className="check"><input type="checkbox" checked={f.adult} onChange={(e) => { setErr(null); setF({ ...f, adult: e.target.checked }); }} /> <span>{t("I am 18 or older and accept the")} <a href="/legal/terms" target="_blank">{t("terms")}</a>.</span></label>
      <label className="check"><input type="checkbox" checked={f.sensitive} onChange={(e) => { setErr(null); setF({ ...f, sensitive: e.target.checked }); }} /> <span>{t("I agree that ByRequest handles my requests, deals and content, which can say something about my sex life, only to run the service. I can withdraw this by deleting my account.")} <a href="/legal/privacy" target="_blank">{t("Privacy statement")}</a></span></label>
      {showRef ? <div className="field join-ref"><label htmlFor="ref"><svg className="ico sm" aria-hidden="true"><use href="#i-gift" /></svg>{t("Invite code")}</label><input id="ref" className="input" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value.toUpperCase() })} placeholder="MILO-7K2Q" autoCapitalize="characters" autoComplete="off" maxLength={16} /></div>
        : <button type="button" className="linkbtn" onClick={() => setShowRef(true)}>{t("Got an invite code?")}</button>}
      <label className="check"><input type="checkbox" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /> <span>{t("Optional: send me news and offers by email. Off by default, you can change it anytime.")}</span></label>
      <div className="join-sum"><img src={`/av/${f.look}.webp`} alt="" /><div><b>{f.handle.trim().toLowerCase()}</b><span>{f.intent === "earn" ? t("Starts as creator: next is a short, private verification.") : t("Starts as buyer: next you can post your first request.")}</span></div></div>
    </div>) : null}

    {err ? <p className="formerr" role="alert">{t(err)}</p> : null}
    {step === "role" ? null : step === "agree"
      ? <button type="button" className="btn btn-primary btn-lg btn-block" disabled={pending} onClick={submit}>{pending ? t("Creating…") : f.intent === "earn" ? t("Create account and start earning") : t("Create account")}</button>
      : <button type="button" className="btn btn-primary btn-lg btn-block" disabled={checking || (step === "you" && f.handle.trim().length < 3) || (step === "about" && f.birthYear.length < 4)} onClick={next}>{checking ? t("Checking…") : t("Next")}</button>}
  </div>);
}
