"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { startAuthentication, startRegistration, browserSupportsWebAuthn, browserSupportsWebAuthnAutofill } from "@simplewebauthn/browser";
import { useLocale, useT } from "@/i18n/client";
import { passkeyLoginOptions, passkeyLogin, passkeyRegisterOptions, passkeyRegister, passkeyRemove } from "@/app/signin/passkey-actions";
import { toast } from "./chrome";

const Key = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l3 3M14.5 8.5l2 2" /></svg>;
const cancelled = (e: unknown) => e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError");

async function signIn(autofill: boolean) {
  const o = await passkeyLoginOptions(); if (!o.ok) throw new Error(o.error);
  const resp = await startAuthentication({ optionsJSON: o.data!, useBrowserAutofill: autofill });
  const r = await passkeyLogin(resp); if (!r.ok) throw new Error(r.error);
  location.href = "/";
}

/* On the sign in page: one tap with Face ID or a fingerprint, and the passkey also shows in the email field's suggestions. */
export function PasskeySignIn() {
  const t = useT();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => setOk(browserSupportsWebAuthn()), 0);
    browserSupportsWebAuthnAutofill().then((yes) => { if (yes && !auto.current) { auto.current = true; signIn(true).catch(() => {}); } });
    return () => clearTimeout(id);
  }, []);
  if (!ok) return null;
  return (<>
    <div className="pk-or"><span>{t("or")}</span></div>
    <button type="button" className="btn btn-secondary btn-lg btn-block pk-btn" disabled={busy} onClick={async () => { setBusy(true); try { await signIn(false); } catch (e) { if (!cancelled(e)) toast(t(e instanceof Error ? e.message : "That did not work. Try again or use your email code."), "err"); setBusy(false); } }}><Key />{busy ? t("Waiting for your device…") : t("Sign in with a passkey")}</button>
  </>);
}

async function add(t: (s: string) => string) {
  const o = await passkeyRegisterOptions(); if (!o.ok) throw new Error(o.error);
  const resp = await startRegistration({ optionsJSON: o.data! });
  const r = await passkeyRegister(resp); if (!r.ok) throw new Error(r.error);
  toast(t("Passkey saved. Next time you sign in with one tap."));
}

/* In settings: the passkeys of this account, add one, remove one. */
export function PasskeyManager({ keys }: { keys: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[] }) {
  const t = useT();
  const [p, start] = useTransition();
  const [ok, setOk] = useState(true);
  useEffect(() => { const id = window.setTimeout(() => setOk(browserSupportsWebAuthn()), 0); return () => clearTimeout(id); }, []);
  const locale = useLocale();
  const d = (s: string) => new Date(s).toLocaleDateString(locale === "nl" ? "nl-BE" : locale === "fr" ? "fr-BE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (<div className="pk-man">
    {keys.length ? keys.map((k) => <div key={k.id} className="setrow"><div><b>{t(k.name)}</b><span className="s">{t("Added {date}", { date: d(k.createdAt) })}{k.lastUsedAt ? ` · ${t("last used {date}", { date: d(k.lastUsedAt) })}` : ""}</span></div><button className="btn btn-ghost btn-sm" disabled={p} onClick={() => start(async () => { const r = await passkeyRemove(k.id); toast(r.ok ? t("Passkey removed") : t(r.error), r.ok ? "ok" : "err"); })}>{t("Remove")}</button></div>)
      : <p className="t-sm muted">{t("No passkey yet. With a passkey you sign in with Face ID, your fingerprint or your device PIN. It is stored in iCloud Keychain, Google Password Manager or your password manager.")}</p>}
    {ok ? <button className="btn btn-secondary" disabled={p} onClick={() => start(async () => { try { await add(t); } catch (e) { if (!cancelled(e)) toast(t(e instanceof Error ? e.message : "That did not work."), "err"); } })}><Key />{t("Add a passkey")}</button> : <p className="t-xs muted">{t("This browser does not support passkeys.")}</p>}
  </div>);
}

/* Shown once after signing in with an email code, on devices that support passkeys. */
export function PasskeyPrompt() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [p, start] = useTransition();
  useEffect(() => { const id = window.setTimeout(() => { let seen = false; try { seen = localStorage.getItem("brq_pk_ask") === "1"; } catch { /* private mode */ } if (!seen && browserSupportsWebAuthn()) setShow(true); }, 1500); return () => clearTimeout(id); }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem("brq_pk_ask", "1"); } catch { /* private mode */ } setShow(false); };
  return (<div className="pk-ask" role="dialog" aria-label={t("Sign in faster next time")}>
    <span className="pk-ask-i"><Key /></span>
    <div className="pk-ask-tx"><b>{t("Sign in faster next time")}</b><p>{t("Save a passkey and sign in with Face ID or your fingerprint. No more email codes.")}</p></div>
    <div className="pk-ask-b"><button className="btn btn-ghost btn-sm" onClick={close}>{t("Not now")}</button><button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(async () => { try { await add(t); close(); } catch (e) { if (!cancelled(e)) toast(t(e instanceof Error ? e.message : "That did not work."), "err"); } })}>{t("Save passkey")}</button></div>
  </div>);
}
