"use client";
import { useActionState, useState } from "react";
import { BUYER_COUNTRIES } from "@/config/compliance";
import { sendCode, checkCode, createAccount, demoSignIn, appealClosed, type AuthState } from "./actions";

const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem"];

export default function SignInForm({ demo }: { demo: boolean }) {
  const [s1, send, p1] = useActionState<AuthState, FormData>(sendCode, { step: "email" });
  const [s2, check, p2] = useActionState<AuthState, FormData>(checkCode, s1);
  const [s3, create, p3] = useActionState<AuthState, FormData>(createAccount, { step: "profile" });
  const [s4, appeal, p4] = useActionState<AuthState, FormData>(appealClosed, { step: "blocked" });
  const [look, setLook] = useState("kai");
  if (s2.step === "blocked") return (
    <form action={appeal} className="authstack">
      <div><h2 className="t-h1">This account is closed</h2><p className="muted" style={{ marginTop: 8 }}>{s2.reason}</p></div>
      {s4.sent ? <p>Your appeal was received. A person who did not take the first decision reviews it and replies by email.</p> : (<>
        <div className="field"><label htmlFor="ap">Do you disagree? Tell us why</label><textarea id="ap" name="msg" className="input" rows={4} style={{ height: "auto", padding: 14 }} required minLength={10} /></div>
        {s4.error ? <p className="formerr" role="alert">{s4.error}</p> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={p4}>{p4 ? "Sending…" : "Send appeal"}</button></>)}
      <p className="t-xs muted">You can also go to an out of court dispute settlement body certified under the Digital Services Act, or to court.</p>
    </form>
  );
  const step = s2.step === "profile" ? "profile" : s1.step === "code" ? "code" : "email";

  if (step === "profile") return (
    <form action={(f) => { f.set("look", look); return create(f); }} className="authstack">
      <div><h2 className="t-h1">Make it yours</h2><p className="muted" style={{ marginTop: 6 }}>Only your username and avatar are ever shown. Never your name or email.</p></div>
      <div className="field"><label htmlFor="handle">Username</label><input className="input" id="handle" name="handle" placeholder="nightowl" autoComplete="off" required /></div>
      <div className="field"><label htmlFor="by">Year of birth</label><input className="input" id="by" name="birthYear" inputMode="numeric" placeholder="1996" required /></div>
      <div className="field"><label>Pick a look</label><div className="looks">{LOOKS.map((l) => (
        <button type="button" key={l} className={"look" + (l === look ? " on" : "")} onClick={() => setLook(l)} aria-pressed={l === look} aria-label={`Look ${l}`}><img src={`/av/${l}.webp`} alt="" /></button>))}</div>
        <span className="t-sm muted">You can fine tune it later, or use a blurred photo.</span></div>
      <div className="field"><label htmlFor="cty">Country</label><select className="input" id="cty" name="country" defaultValue="BE">{BUYER_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <span className="t-sm muted">Used for VAT and the law that applies. Never shown.</span></div>
      <label className="check"><input type="checkbox" name="adult" /> <span>I am 18 or older and accept the <a href="/legal/terms" target="_blank">terms</a>. Before I pay or open my vault, I confirm my age once with the verification partner.</span></label>
      <label className="check"><input type="checkbox" name="sensitive" /> <span>I explicitly agree that ByRequest handles my requests, deals and content, which can reveal things about my sex life, for the purpose of the service. I can withdraw this by deleting my account. <a href="/legal/privacy" target="_blank">Privacy statement</a></span></label>
      <label className="check"><input type="checkbox" name="marketing" /> <span>Optional: send me news and offers by email. Off by default, you can change it anytime.</span></label>
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
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("nightowl")}><span className="mini mini-l" aria-hidden="true">N</span>Buyer, nightowl</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("milo")}><img src="/av/milo.webp" alt="" className="mini" />Creator, milo</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("ops")}><span className="mini mini-l" aria-hidden="true">S</span>Support, ops</button>
          <button type="button" className="btn btn-secondary" onClick={() => demoSignIn("noah")}><img src="/av/noah.webp" alt="" className="mini" />Creator, setup open</button>
        </div>
      </div>) : null}
    </form>
  );
}
