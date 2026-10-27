"use client";
import { useActionState, useState } from "react";
import { sendCode, checkCode, createAccount, demoSignIn, type AuthState } from "./actions";

const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem"];

export default function SignInForm({ demo }: { demo: boolean }) {
  const [s1, send, p1] = useActionState<AuthState, FormData>(sendCode, { step: "email" });
  const [s2, check, p2] = useActionState<AuthState, FormData>(checkCode, s1);
  const [s3, create, p3] = useActionState<AuthState, FormData>(createAccount, { step: "profile" });
  const [look, setLook] = useState("kai");
  const step = s2.step === "profile" ? "profile" : s1.step === "code" ? "code" : "email";

  if (step === "profile") return (
    <form action={(f) => { f.set("look", look); return create(f); }} className="authstack">
      <div><h2 className="t-h1">Make it yours</h2><p className="muted" style={{ marginTop: 6 }}>Only your username and avatar are ever shown. Never your name or email.</p></div>
      <div className="field"><label htmlFor="handle">Username</label><input className="input" id="handle" name="handle" placeholder="nightowl" autoComplete="off" required /></div>
      <div className="field"><label htmlFor="by">Year of birth</label><input className="input" id="by" name="birthYear" inputMode="numeric" placeholder="1996" required /></div>
      <div className="field"><label>Pick a look</label><div className="looks">{LOOKS.map((l) => (
        <button type="button" key={l} className={"look" + (l === look ? " on" : "")} onClick={() => setLook(l)} aria-pressed={l === look} aria-label={`Look ${l}`}><img src={`/av/${l}.webp`} alt="" /></button>))}</div>
        <span className="t-sm muted">You can fine tune it later, or use a blurred photo.</span></div>
      <label className="check"><input type="checkbox" name="adult" /> <span>I am 18 or older and agree to the terms. Creators verify their ID once before their first offer.</span></label>
      {s3.error ? <p className="formerr" role="alert">{s3.error}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p3}>{p3 ? "Creating…" : "Create account"}</button>
    </form>
  );

  if (step === "code") return (
    <form action={check} className="authstack">
      <input type="hidden" name="email" value={s1.email} />
      <div><h2 className="t-h1">Check your inbox</h2><p className="muted" style={{ marginTop: 6 }}>We sent a six digit code to {s1.email}. The email comes from a neutral sender.</p></div>
      {s1.devCode ? <p className="devcode">Development code: <b className="num">{s1.devCode}</b></p> : null}
      <div className="field"><label htmlFor="code">Code</label><input className="input codeinput" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} defaultValue={s1.devCode ?? ""} autoFocus required /></div>
      {s2.error ? <p className="formerr" role="alert">{s2.error}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p2}>{p2 ? "Checking…" : "Continue"}</button>
    </form>
  );

  return (
    <form action={send} className="authstack">
      <div><h2 className="t-h1">Welcome</h2><p className="muted" style={{ marginTop: 6 }}>Sign in or create an account with your email. Nobody on ByRequest ever sees it.</p></div>
      <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
      {s1.error ? <p className="formerr" role="alert">{s1.error}</p> : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={p1}>{p1 ? "Sending…" : "Send me a code"}</button>
      {demo ? (<div className="demo">
        <div className="divider">or try a demo account</div>
        <div className="demorow">
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("nightowl")}><img src="/av/kai.webp" alt="" className="mini" />Buyer, nightowl</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("milo")}><img src="/av/milo.webp" alt="" className="mini" />Creator, milo</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("ops")}><img src="/av/nour.webp" alt="" className="mini" />Support, ops</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("noah")}><img src="/av/noah.webp" alt="" className="mini" />Creator, setup open</button>
        </div>
      </div>) : null}
    </form>
  );
}
