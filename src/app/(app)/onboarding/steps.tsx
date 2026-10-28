"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptAccountDocs, startIdentity, sendStepUp, confirmStepUp, payoutFields, submitPayout, acceptAgreement, appeal } from "./actions";
import { toast } from "@/components/chrome";

type Check = "not_started" | "pending" | "action_required" | "approved" | "rejected" | "expired";
type Props = {
  step: "account" | "identity" | "payouts" | "agreement" | "done"; handle: string; avatar: React.ReactNode;
  account: { done: boolean; terms: boolean; privacy: boolean };
  identity: { status: Check; provider: string | null; env: string | null; reason: string | null };
  payout: { status: Check; provider: string | null; env: string | null; missing: string[]; actionUrl: string | null; canReceive: boolean; accountType: string | null; country: string | null; identityOk: boolean; stepUpFresh: boolean };
  agreement: { status: Check; id: string; sha: string; version: string; title: string; summary: string[]; draft: boolean } | null;
  overview: { status: string; missing: string[]; areas: Record<string, string>; testOnly: boolean };
  countries: { code: string; name: string }[];
  fieldInfo: Record<string, { label: string; help?: string; type?: string; optional?: boolean }>;
  appeals: { area: string; status: string; answer: string | null }[];
};
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
const SAY: Record<Check, string> = { not_started: "Not started", pending: "Being reviewed", action_required: "Action needed", approved: "Approved", rejected: "Not approved", expired: "Expired" };
function Status({ s, env }: { s: Check; env?: string | null }) {
  const t = useT();
  return <span className={`status st-${s}`}>{t(SAY[s])}{s === "approved" && env === "test" ? <span className="envtag">{t("Test")}</span> : null}</span>;
}

export default function Steps(p: Props) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(p.step);
  const [seen, setSeen] = useState(p.step);
  if (seen !== p.step) { setSeen(p.step); setStep(p.step); }   // follow server redirects such as ?step=payouts
  const go = (s: Props["step"]) => { setStep(s); router.replace(`/onboarding?step=${s}`, { scroll: false }); };
  const S = [
    { k: "account", l: "Account", s: p.account.done ? "approved" : "not_started" },
    { k: "identity", l: "Identity", s: p.identity.status },
    { k: "payouts", l: "Payouts", s: p.payout.status },
    { k: "agreement", l: "Agreement", s: p.agreement?.status ?? "not_started" },
  ] as const;
  return (<>
    <div className="ob-steps" role="list">{S.map((x, i) => (
      <button key={x.k} role="listitem" className={"ob-step " + (x.s === "approved" ? "done" : ["action_required", "rejected", "expired"].includes(x.s) ? "warn" : "") + (step === x.k ? " cur" : "")} onClick={() => go(x.k)} aria-current={step === x.k ? "step" : undefined}>
        <i />{String.fromCharCode(65 + i)}. {x.l}</button>))}</div>
    {step === "account" ? <Account p={p} next={() => go("identity")} /> : null}
    {step === "identity" ? <Identity p={p} next={() => go("payouts")} /> : null}
    {step === "payouts" ? <Payouts p={p} next={() => go("agreement")} /> : null}
    {step === "agreement" ? <Agreement p={p} next={() => go("done")} /> : null}
    {step === "done" ? <Overview p={p} /> : null}
  </>);
}

function Account({ p, next }: { p: Props; next: () => void }) {
  const t = useT();
  const [terms, setTerms] = useState(p.account.terms);
  const [privacy, setPrivacy] = useState(p.account.privacy);
  const [pending, start] = useTransition();
  return (<div className="card ob-card">
    <div><span className="eyebrow">{t("Step A")}</span><h2>{t("Create your account")}</h2></div>
    <div className="checklist">
      <div className="row"><div><b>{t("Email")}</b><div className="t-sm muted">{t("Verified with a code when you signed in.")}</div></div><Status s="approved" /></div>
      <div className="row"><div><b>{t("Username")}</b><div className="t-sm muted">{p.handle}. {t("This is the only name others see.")}</div></div><Status s="approved" /></div>
      <div className="row"><div style={{ display: "flex", gap: 12, alignItems: "center" }}>{p.avatar}<div><b>{t("Avatar or photo")}</b><div className="t-sm muted">{t("An avatar, or a photo you may blur.")}</div></div></div><Link className="btn btn-secondary btn-sm" href="/avatar">{t("Edit")}</Link></div>
    </div>
    <label className="check"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} disabled={p.account.terms} /><span>{t("I agree to the")} <Link href="/legal/terms" target="_blank" style={{ fontWeight: 600 }}>{t("Terms of use")}</Link>.</span></label>
    <label className="check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} disabled={p.account.privacy} /><span>{t("I have read the")} <Link href="/legal/privacy" target="_blank" style={{ fontWeight: 600 }}>{t("Privacy statement")}</Link>.</span></label>
    <p className="t-xs muted">{t("Marketing messages are a separate, optional choice in Settings. They are never part of these agreements.")}</p>
    <button className="btn btn-primary btn-lg" disabled={pending || !terms || !privacy} onClick={() => start(async () => { const r = await acceptAccountDocs(); if (r.ok) next(); else toast(t(r.error), "err"); })}>{p.account.done ? "Continue" : "Save and continue"}</button>
  </div>);
}

function Identity({ p, next }: { p: Props; next: () => void }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const s = p.identity.status;
  return (<div className="card ob-card">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><span className="eyebrow">{t("Step B")}</span><h2>{t("Verify your identity")}</h2></div><Status s={s} env={p.identity.env} /></div>
    <div className="why"><Ico n="shield" /><div><b>{t("Why we ask")}</b><br />{t("Your legal name and ID are not displayed on your profile. Verification is required for payments and safety: it confirms you are an adult and that payouts go to you.")}</div></div>
    <ul className="docsum">
      <li><Ico n="check" c="sm" />{t("A valid ID document, checked by")} {p.identity.provider ?? "our verification partner"}</li>
      <li><Ico n="check" c="sm" />{t("A quick live selfie, to confirm the document is yours")}</li>
      <li><Ico n="check" c="sm" />{t("Your legal name, date of birth and country come from the check itself. You do not type them twice.")}</li>
    </ul>
    {s === "approved" ? <><p className="t-sm">{p.identity.env === "test" ? t("Your identity is verified in the test environment.") : t("Your identity is verified.")}</p><button className="btn btn-primary btn-lg" onClick={next}>{t("Continue")}</button></>
      : s === "pending" ? <><b>{t("Your verification is being reviewed.")}</b><p className="t-sm muted">{t("This can take from a few minutes to a day. You get a notification when it is done. You can leave this page.")}</p><button className="btn btn-secondary" onClick={() => location.reload()}>{t("Check again")}</button></>
      : !p.identity.provider ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{t("Identity verification is not available yet. We will notify you.")}</span></div>
      : (<>
        {s === "rejected" || s === "expired" || s === "action_required" ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{s === "expired" ? "Your verification expired. Please verify again." : s === "action_required" ? "The provider needs another try, for example a clearer photo." : `Your verification was not approved${p.identity.reason ? `: ${p.identity.reason}` : ""}.`}</span></div> : null}
        <button className="btn btn-primary btn-lg" disabled={pending} onClick={() => start(async () => { const r = await startIdentity(); if (r && !r.ok) toast(t(r.error), "err"); })}>{pending ? "Opening…" : s === "not_started" ? "Start verification" : "Verify again"}</button>
        <p className="t-xs muted">{t("You are sent to the verification provider and come back here afterwards.")}</p>
        {s === "rejected" ? <div className="field"><label htmlFor="ap">{t("Think this is a mistake?")}</label><textarea id="ap" className="input" rows={3} style={{ height: "auto", padding: 14 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("Tell support what happened. Do not include ID numbers.")} />
          <button className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { const r = await appeal("identity", msg); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); if (r.ok) setMsg(""); })}>{t("Ask for a review")}</button>
          <span className="t-xs muted">{t("Support can explain the decision and ask the provider to look again. Support cannot approve a check the provider declined.")}</span></div> : null}
      </>)}
  </div>);
}

function Payouts({ p, next }: { p: Props; next: () => void }) {
  const t = useT();
  const [type, setType] = useState<"individual" | "business">((p.payout.accountType as "individual") ?? "individual");
  const [country, setCountry] = useState(p.payout.country ?? "BE");
  const [mode, setMode] = useState<"create" | "link">("create");
  const [fields, setFields] = useState<string[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [dev, setDev] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => { let on = true; payoutFields(country, type).then((r) => { if (on && r.ok) setFields(r.fields ?? []); }); return () => { on = false; }; }, [country, type]);
  const s = p.payout.status;
  const editing = s === "not_started" || s === "rejected";
  return (<div className="card ob-card">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><span className="eyebrow">{t("Step C")}</span><h2>{t("Set up payouts")}</h2></div><Status s={s} env={p.payout.env} /></div>
    <div className="why"><Ico n="wallet" /><div><b>{t("How you get paid")}</b><br />{t("Payouts are handled by")} {p.payout.provider ?? "our payment partner"}. They check that the account belongs to you. Bank and tax details go straight to them; we keep only a reference and the status.</div></div>
    {!p.payout.identityOk ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{t("Verify your identity first.")}</span></div>
      : !p.payout.provider ? <div className="upwarn"><Ico n="alert" c="sm" /><span>{t("Payout setup is not available yet. We will notify you.")}</span></div>
      : s === "approved" ? <><p className="t-sm">{p.payout.canReceive ? "Payouts are enabled." : "Your account is approved, but the provider has not enabled payouts yet."}</p><button className="btn btn-primary btn-lg" onClick={next}>{t("Continue")}</button></>
      : !editing ? (<>
        <b>{s === "pending" ? "The provider is reviewing your payout account." : "Action needed to enable payouts."}</b>
        {p.payout.missing.length ? <ul className="docsum">{p.payout.missing.map((m) => <li key={m}><Ico n="alert" c="sm" />{p.fieldInfo[m]?.label ?? m}</li>)}</ul> : null}
        {p.payout.actionUrl ? <><a className="btn btn-primary btn-lg" href={p.payout.actionUrl}>{t("Open {provider} to finish", { provider: p.payout.provider })} <Ico n="right" c="sm" /></a><p className="t-xs muted">{t("This opens the payment provider in a new step. Complete it there; the status here updates by itself.")}</p></> : null}
        <button className="btn btn-secondary" onClick={() => location.reload()}>{t("Check again")}</button>
      </>)
      : !p.payout.stepUpFresh ? (<div className="upbox">
        <b>{t("Confirm it is you")}</b><p className="t-sm muted">{t("Payout details are sensitive, so we ask for a fresh code from your email.")}</p>
        {!sent ? <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await sendStepUp(); if (r.ok) { setSent(true); setDev(r.devCode ?? null); } else toast(t(r.error), "err"); })}>{t("Send me a code")}</button>
          : <>{dev ? <p className="devcode">{t("Development code:")} <b className="num">{dev}</b></p> : null}<input className="input codeinput" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-label={t("Code")} />
            <button className="btn btn-primary" disabled={pending || code.length !== 6} onClick={() => start(async () => { const r = await confirmStepUp(code); if (r.ok) router_reload(); else toast(t(r.error), "err"); })}>{t("Confirm")}</button></>}
      </div>)
      : (<>
        <div className="field"><label>{t("I receive payouts as")}</label><div className="seg2">
          <button type="button" className={type === "individual" ? "on" : ""} onClick={() => setType("individual")}><b>{t("Individual")}</b><span className="t-sm muted">{t("In your own name.")}</span></button>
          <button type="button" className={type === "business" ? "on" : ""} onClick={() => setType("business")}><b>{t("Business")}</b><span className="t-sm muted">{t("A company or sole trader.")}</span></button></div></div>
        <div className="field"><label htmlFor="ct">{t("Country of residence")}</label><select id="ct" className="select" value={country} onChange={(e) => setCountry(e.target.value)}>{p.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
        <div className="field"><label>{t("How do you want to connect?")}</label><div className="seg2">
          <button type="button" className={mode === "create" ? "on" : ""} onClick={() => setMode("create")}><b>{t("Add a payout account")}</b><span className="t-sm muted">{t("Enter the details the provider asks for.")}</span></button>
          <button type="button" className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}><b>{t("Link an existing account")}</b><span className="t-sm muted">{t("If you already have one at")} {p.payout.provider}.</span></button></div></div>
        {mode === "create" ? fields.map((k) => (<div key={k} className="field"><label htmlFor={k}>{p.fieldInfo[k]?.label ?? k}</label><input id={k} className="input" autoComplete="off" value={vals[k] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />{p.fieldInfo[k]?.help ? <span className="t-sm muted">{p.fieldInfo[k].help}</span> : null}</div>)) : null}
        <p className="t-xs muted">{t("Only the fields")} {p.payout.provider} needs for {p.countries.find((c) => c.code === country)?.name} and this account type are shown. They may ask for more later, for example tax details.</p>
        <button className="btn btn-primary btn-lg" disabled={pending || (mode === "create" && fields.some((k) => !p.fieldInfo[k]?.optional && !vals[k]))} onClick={() => start(async () => { const r = await submitPayout({ mode, country, accountType: type, fields: mode === "create" ? vals : {} }); if (r && r.ok) { toast(r.msg ?? "Saved"); location.reload(); } else if (r && !r.ok) toast(t(r.error), "err"); })}>{pending ? "Sending…" : mode === "link" ? `Continue to ${p.payout.provider}` : "Send to the provider"}</button>
      </>)}
  </div>);
}
function router_reload() { location.reload(); }

function Agreement({ p, next }: { p: Props; next: () => void }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const a = p.agreement;
  if (!a) return <div className="card ob-card"><h2>{t("Creator agreement")}</h2><p className="muted">{t("The agreement is not published yet.")}</p></div>;
  return (<div className="card ob-card">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><span className="eyebrow">{t("Step D")}</span><h2>{a.title}</h2><span className="t-sm muted">{t("Version")} {a.version}</span></div><Status s={a.status as Check} /></div>
    {a.draft ? <div className="banner test" style={{ margin: 0 }}><Ico n="alert" /><div className="grow t-sm">{t("Working draft, pending legal and payment partner review.")}</div></div> : null}
    <ul className="docsum">{a.summary.map((x) => <li key={x}><Ico n="check" c="sm" />{x}</li>)}</ul>
    <Link href="/legal/creator_agreement" target="_blank" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>{t("Read the full agreement")}</Link>
    {a.status === "approved" ? <><p className="t-sm">{t("You accepted version")} {a.version}.</p><button className="btn btn-primary btn-lg" onClick={next}>{t("See your overview")}</button></> : (<>
      <label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t("I have read the creator agreement, version {v}, and I agree to it.", { v: a.version })}</span></label>
      <button className="btn btn-primary btn-lg" disabled={!ok || pending} onClick={() => start(async () => { const r = await acceptAgreement(a.id, a.sha); if (r.ok) next(); else toast(t(r.error), "err"); })}>{t("I agree")}</button></>)}
  </div>);
}

function Overview({ p }: { p: Props }) {
  const t = useT();
  const active = p.overview.status === "active";
  const rows: [string, string][] = [["Email", p.overview.areas.email], ["Identity", p.overview.areas.identity], ["Payouts", p.overview.areas.payout], ["Creator agreement", p.overview.areas.agreement]];
  return (<div className="card ob-card">
    {active ? <div className="ready"><span className="big"><Ico n="check" c="lg" /></span><h2>{t("You’re ready to earn.")}</h2><p className="muted">{p.overview.testOnly ? t("Everything is approved in the test environment.") : t("Everything is approved.")} {t("Make offers, deliver and get paid.")}</p><Link href="/for-you" className="btn btn-primary btn-lg">{t("Browse requests")}</Link></div>
      : <div><span className="eyebrow">{t("Overview")}</span><h2>{p.overview.status === "pending_verification" ? "Your verification is being reviewed." : p.overview.status === "suspended" ? "Your creator account is suspended." : "Almost there"}</h2><p className="muted" style={{ marginTop: 6 }}>{t("You can prepare your profile already. Offers, uploads and payouts open when everything below is approved.")}</p></div>}
    <div className="checklist">{rows.map(([k, v]) => <div key={k} className="row"><b>{k}</b><Status s={v as Check} /></div>)}
      {p.overview.areas.restriction !== "none" ? <div className="row"><b>{t("Account")}</b><span className="status st-rejected">{p.overview.areas.restriction === "suspended" ? "Suspended" : "Restricted"}</span></div> : null}</div>
    {!active && p.overview.missing.length ? <div><b>{t("Still missing")}</b><ul className="docsum" style={{ marginTop: 8 }}>{p.overview.missing.map((m) => <li key={m}><Ico n="alert" c="sm" />{m.includes("DAC7") ? <Link href="/tax">{m}</Link> : m}</li>)}</ul></div> : null}
    {p.appeals.length ? <div><b>{t("Your requests to support")}</b>{p.appeals.map((x, i) => <p key={i} className="t-sm muted">{x.area}: {x.status === "answered" ? x.answer : "waiting for a reply"}</p>)}</div> : null}
    <Link href="/settings#profile" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>{t("Prepare your public profile")}</Link>
  </div>);
}
