"use client";
import { useT } from "@/i18n/client";
import { useActionState, useState } from "react";
import { BUYER_COUNTRIES } from "@/config/compliance";
import { sendCode, checkCode, createAccount, demoSignIn, appealClosed, type AuthState } from "./actions";

const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem"];

export default function SignInForm({ demo }: { demo: boolean }) {
  const t = useT();
  const [s1, send, p1] = useActionState<AuthState, FormData>(sendCode, { step: "email" });
  const [s2, check, p2] = useActionState<AuthState, FormData>(checkCode, s1);
  const [s3, create, p3] = useActionState<AuthState, FormData>(createAccount, { step: "profile" });
  const [s4, appeal, p4] = useActionState<AuthState, FormData>(appealClosed, { step: "blocked" });
  const [look, setLook] = useState("kai");
  const [intent, setIntent] = useState<"" | "buy" | "earn">("");
  if (s2.step === "blocked") return (
    <form action={appeal} className="authstack">
      <div><h2 className="t-h1">{t("This account is closed")}</h2><p className="muted" style={{ marginTop: 8 }}>{s2.reason}</p></div>
      {s4.sent ? <p>{t("Your appeal was received. A person who did not take the first decision reviews it and replies by email.")}</p> : (<>
        <div className="field"><label htmlFor="ap">{t("Do you disagree? Tell us why")}</label><textarea id="ap" name="msg" className="input" rows={4} style={{ height: "auto", padding: 14 }} required minLength={10} /></div>
        {s4.error ? <p className="formerr" role="alert">{t(s4.error)}</p> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={p4}>{p4 ? "Sending…" : "Send appeal"}</button></>)}
      <p className="t-xs muted">{t("You can also go to an out of court dispute settlement body certified under the Digital Services Act, or to court.")}</p>
    </form>
  );
  const step = s2.step === "profile" ? "profile" : s1.step === "code" ? "code" : "email";

  if (step === "profile") return (
    <form action={(f) => { f.set("look", look); f.set("intent", intent); return create(f); }} className="authstack">
      <div><h2 className="t-h1">{t("What brings you here?")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("You can always do both later. This only decides where you start.")}</p></div>
      <div className="intent" role="radiogroup" aria-label={t("What brings you here?")}>
        <button type="button" role="radio" aria-checked={intent === "buy"} className={"intent-c" + (intent === "buy" ? " on" : "")} onClick={() => setIntent("buy")}>
          <span className="intent-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 16.5h5" /></svg></span>
          <b>{t("I want to ask for something")}</b><span>{t("Post a request with your budget. Creators who fit make an offer, you choose.")}</span></button>
        <button type="button" role="radio" aria-checked={intent === "earn"} className={"intent-c" + (intent === "earn" ? " on" : "")} onClick={() => setIntent("earn")}>
          <span className="intent-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7h17v10h-17zM12 14.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zM6.5 10v4M17.5 10v4" /></svg></span>
          <b>{t("I want to earn")}</b><span>{t("Pick requests you like, make them and get paid. No followers, no profile to keep up.")}</span></button>
      </div>
      <div><h3 className="t-h3">{t("Make it yours")}</h3><p className="muted t-sm" style={{ marginTop: 4 }}>{t("Only your username and avatar are ever shown. Never your name or email.")}</p></div>
      <div className="field"><label htmlFor="handle">{t("Username")}</label><input className="input" id="handle" name="handle" placeholder={t("nightowl")} autoComplete="off" required /></div>
      <div className="field"><label htmlFor="by">{t("Year of birth")}</label><input className="input" id="by" name="birthYear" inputMode="numeric" placeholder="1996" required /></div>
      <div className="field"><label>{t("Pick a look")}</label><div className="looks">{LOOKS.map((l) => (
        <button type="button" key={l} className={"look" + (l === look ? " on" : "")} onClick={() => setLook(l)} aria-pressed={l === look} aria-label={`Look ${l}`}><img src={`/av/${l}.webp`} alt="" /></button>))}</div>
        <span className="t-sm muted">{t("You can fine tune it later, or use a blurred photo.")}</span></div>
      <div className="field"><label htmlFor="cty">{t("Country")}</label><select className="input" id="cty" name="country" defaultValue="BE">{BUYER_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{t(n)}</option>)}</select>
        <span className="t-sm muted">{t("Used for VAT and the law that applies. Never shown.")}</span></div>
      <label className="check"><input type="checkbox" name="adult" /> <span>{t("I am 18 or older and accept the")} <a href="/legal/terms" target="_blank">{t("terms")}</a>{t(". Before I pay or open my vault, I confirm my age once with the verification partner.")}</span></label>
      <label className="check"><input type="checkbox" name="sensitive" /> <span>{t("I explicitly agree that ByRequest handles my requests, deals and content, which can reveal things about my sex life, for the purpose of the service. I can withdraw this by deleting my account.")} <a href="/legal/privacy" target="_blank">{t("Privacy statement")}</a></span></label>
      <label className="check"><input type="checkbox" name="marketing" /> <span>{t("Optional: send me news and offers by email. Off by default, you can change it anytime.")}</span></label>
      {s3.error ? <p className="formerr" role="alert">{t(s3.error)}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p3 || !intent}>{p3 ? t("Creating…") : intent === "earn" ? t("Create account and start earning") : t("Create account")}</button>
    </form>
  );

  if (step === "code") return (
    <form action={check} className="authstack">
      <input type="hidden" name="email" value={s1.email} />
      <div><h2 className="t-h1">{t("Check your inbox")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("We sent a six digit code to")} {s1.email}. {t("The email comes from a neutral sender.")}</p></div>
      {s1.devCode ? <p className="devcode">{t("Development code:")} <b className="num">{s1.devCode}</b></p> : null}
      <div className="field"><label htmlFor="code">{t("Code")}</label><input className="input codeinput" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} defaultValue={s1.devCode ?? ""} autoFocus required /></div>
      {s2.error ? <p className="formerr" role="alert">{t(s2.error)}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p2}>{p2 ? "Checking…" : "Continue"}</button>
    </form>
  );

  return (
    <form action={send} className="authstack">
      <div><h2 className="t-h1">{t("Welcome")}</h2><p className="muted" style={{ marginTop: 6 }}>{t("Sign in or create an account with your email. Nobody on ByRequest ever sees it.")}</p></div>
      <div className="field"><label htmlFor="email">{t("Email")}</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder={t("you@example.com")} required /></div>
      {s1.error ? <p className="formerr" role="alert">{t(s1.error)}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p1}>{p1 ? "Sending…" : "Send me a code"}</button>
      {demo ? (<div className="demo">
        <div className="divider">{t("or try a demo account")}</div>
        <div className="demorow">
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("nightowl")}><span className="mini mini-l" aria-hidden="true">N</span>{t("Buyer, nightowl")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("milo")}><img src="/av/milo.webp" alt="" className="mini" />{t("Creator, milo")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("ops")}><span className="mini mini-l" aria-hidden="true">S</span>{t("Support, ops")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("noah")}><img src="/av/noah.webp" alt="" className="mini" />{t("Creator, setup open")}</button>
        </div>
      </div>) : null}
    </form>
  );
}
