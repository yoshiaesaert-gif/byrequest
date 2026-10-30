"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { startAuthentication, browserSupportsWebAuthn, type AuthenticationResponseJSON } from "@simplewebauthn/browser";
import nacl from "tweetnacl";
import { useT } from "@/i18n/client";
import { myKeys, keepKey, pub, newKeys, lockKey, unlockKey, sealTo, openFrom, linkCode, PRF_SALT } from "./e2e";
import { unlockOptions, unlockVerify, saveKeyBox, linkStart, linkCollect, linkPending, linkApprove, linkRefuse } from "@/app/signin/passkey-actions";
import { setPublicKey, forceNewKey } from "@/app/(app)/actions";
import { toast } from "./chrome";

const Lock = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const deviceName = () => { const ua = navigator.userAgent; return /iphone/i.test(ua) ? "iPhone" : /ipad/i.test(ua) ? "iPad" : /android/i.test(ua) ? "Android" : /mac os/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Browser"; };

/* Asks one of this account's passkeys for its PRF secret. Returns null when the passkey or browser has no PRF. */
export async function passkeySecret(): Promise<{ id: string; box: string | null; prf: ArrayBuffer } | null> {
  const o = await unlockOptions(); if (!o.ok) throw new Error(o.error);
  const resp = await startAuthentication({ optionsJSON: { ...o.data!, extensions: { prf: { eval: { first: PRF_SALT } } } as never } });
  const prf = (resp.clientExtensionResults as { prf?: { results?: { first?: ArrayBuffer } } }).prf?.results?.first;
  const clean: AuthenticationResponseJSON = { ...resp, clientExtensionResults: {} };
  const v = await unlockVerify(clean); if (!v.ok) throw new Error(v.error);
  return prf ? { id: v.data!.id, box: v.data!.box, prf } : null;
}
/* Locks this device's key with a passkey, so any device with that passkey opens the chats. */
export async function lockWithPasskey(uid: string) {
  const kp = myKeys(uid); if (!kp) return false;
  const s = await passkeySecret(); if (!s) return false;
  const r = await saveKeyBox(s.id, lockKey(s.prf, kp.secretKey));
  return r.ok;
}

/* Makes sure this device holds the account's chat key, without the server ever seeing it.
   Devices that have it also approve new devices that ask for it. */
export function KeySync({ uid, accountPub, passkeys, locked }: { uid: string; accountPub: string | null; passkeys: number; locked: boolean }) {
  const t = useT();
  const [state, setState] = useState<"ok" | "locked" | null>(null);
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<{ id: string; pub: string; device: string } | null>(null);
  const [offerLock, setOfferLock] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [shown, setShown] = useState("");
  const [busy, setBusy] = useState(false);
  const eph = useRef<nacl.BoxKeyPair | null>(null);
  const refused = useRef(new Set<string>());

  const done = useCallback((sk: Uint8Array) => { keepKey(uid, sk); toast(t("Your chats are open on this device")); location.reload(); }, [uid, t]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const kp = myKeys(uid);
      if (!accountPub) { const k = kp ?? newKeys(); keepKey(uid, k.secretKey); setPublicKey(pub(k)).catch(() => {}); setState("ok"); return; }
      if (kp && pub(kp) === accountPub) {
        setState("ok");
        let asked = false; try { asked = localStorage.getItem("brq_lock_ask") === "1"; } catch { /* private mode */ }
        if (passkeys && !locked && !asked && browserSupportsWebAuthn()) setOfferLock(true);
        return;
      }
      setState("locked"); setOpen(true);
    }, 0);
    const reopen = () => setOpen(true);
    window.addEventListener("brq:unlock", reopen);
    return () => { clearTimeout(id); window.removeEventListener("brq:unlock", reopen); };
  }, [uid, accountPub, passkeys, locked]);

  // A device with the key looks for new devices of the same account that ask for it.
  useEffect(() => {
    if (state !== "ok") return;
    const tick = () => linkPending().then((r) => { if (r.ok) setAsk((cur) => cur ?? r.data!.find((x) => !refused.current.has(x.id)) ?? null); }).catch(() => {});
    tick(); const h = window.setInterval(tick, 5000);
    return () => clearInterval(h);
  }, [state]);

  // The new device waits for the sealed key.
  useEffect(() => {
    if (!code) return;
    const h = window.setInterval(async () => {
      const r = await linkCollect(code).catch(() => null);
      if (!r?.ok) return;
      if ("gone" in r.data!) { setCode(null); toast(t("The request expired. Try again."), "err"); return; }
      if ("box" in r.data!) { const sk = eph.current && openFrom(r.data!.box!, eph.current); if (sk && pub(nacl.box.keyPair.fromSecretKey(sk)) === accountPub) done(sk); else { setCode(null); toast(t("That did not work. Try again."), "err"); } }
    }, 2500);
    return () => clearInterval(h);
  }, [code, accountPub, done, t]);

  const viaPasskey = async () => {
    setBusy(true);
    try {
      const s = await passkeySecret();
      const sk = s?.box ? unlockKey(s.prf, s.box) : null;
      if (sk && pub(nacl.box.keyPair.fromSecretKey(sk)) === accountPub) return done(sk);
      toast(t(s ? "This passkey does not hold your chat key yet. Approve this device from another one." : "This passkey cannot unlock chats. Approve this device from another one."), "err");
    } catch (e) { if (!(e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError"))) toast(t("That did not work. Try again."), "err"); }
    setBusy(false);
  };
  const viaDevice = async () => {
    setBusy(true);
    eph.current = newKeys();
    const r = await linkStart(pub(eph.current), deviceName()).catch(() => null);
    setBusy(false);
    if (r?.ok) { setShown(linkCode(pub(eph.current))); setCode(r.data!); } else toast(t("That did not work. Try again."), "err");
  };
  const fresh = async () => {
    if (!confirm(t("Start with a new chat key? Messages from before stay locked on this device. Only do this if you no longer have a device where your chats open."))) return;
    const k = newKeys(); keepKey(uid, k.secretKey); await forceNewKey(pub(k)); location.reload();
  };
  const approve = async () => {
    if (!ask) return; const kp = myKeys(uid); if (!kp) return;
    setBusy(true); const r = await linkApprove(ask.id, sealTo(ask.pub, kp.secretKey)).catch(() => null); setBusy(false);
    toast(r?.ok ? t("Approved. Your chats now open on your {device}.", { device: t(ask.device) }) : t("That did not work. Try again."), r?.ok ? "ok" : "err"); setAsk(null);
  };
  const refuse = () => { if (!ask) return; refused.current.add(ask.id); linkRefuse(ask.id).catch(() => {}); setAsk(null); };
  const closeLock = () => { try { localStorage.setItem("brq_lock_ask", "1"); } catch { /* private mode */ } setOfferLock(false); };

  if (state === "locked" && open) return createPortal(<div className="scrim" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
    <div className="sheet ks" role="dialog" aria-modal="true" aria-label={t("Open your chats on this device")}>
      <span className="ks-i"><Lock /></span>
      <div><h2 className="t-h3">{t("Open your chats on this device")}</h2><p className="t-sm muted" style={{ marginTop: 6 }}>{t("Your chats are end to end encrypted. Only your own devices hold the key, not ByRequest. Bring it to this device in one step.")}</p></div>
      {code && shown ? <div className="ks-code">
        <p className="t-sm">{t("Open ByRequest on a device where your chats already open. Approve there when you see this code:")}</p>
        <b className="num">{shown}</b>
        <span className="t-xs muted">{t("Waiting for approval…")}</span>
      </div> : <div className="ks-b">
        {passkeys ? <button className="btn btn-primary btn-block" disabled={busy} onClick={viaPasskey}>{t("Unlock with my passkey")}</button> : null}
        <button className={"btn btn-block " + (passkeys ? "btn-secondary" : "btn-primary")} disabled={busy} onClick={viaDevice}>{t("Approve from another device")}</button>
      </div>}
      <div className="ks-f"><button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t("Later")}</button><button className="btn btn-ghost btn-sm muted" onClick={fresh}>{t("I have no other device")}</button></div>
    </div>
  </div>, document.body);

  if (ask) return createPortal(<div className="scrim"><div className="sheet ks" role="dialog" aria-modal="true" aria-label={t("A new device asks for your chats")}>
    <span className="ks-i"><Lock /></span>
    <div><h2 className="t-h3">{t("A new device asks for your chats")}</h2><p className="t-sm muted" style={{ marginTop: 6 }}>{t("Your {device} wants to open your encrypted chats. Only approve if it shows the same code and you are signing in there yourself.", { device: t(ask.device) })}</p></div>
    <div className="ks-code"><b className="num">{linkCode(ask.pub)}</b></div>
    <div className="ks-b"><button className="btn btn-primary btn-block" disabled={busy} onClick={approve}>{t("Approve")}</button><button className="btn btn-secondary btn-block" disabled={busy} onClick={refuse}>{t("Not me, refuse")}</button></div>
  </div></div>, document.body);

  if (offerLock) return <div className="pk-ask" role="dialog" aria-label={t("Your chats on all your devices")}>
    <span className="pk-ask-i"><Lock /></span>
    <div className="pk-ask-tx"><b>{t("Your chats on all your devices")}</b><p>{t("Lock your chat key with your passkey. Any device with that passkey then opens your chats, still end to end encrypted.")}</p></div>
    <div className="pk-ask-b"><button className="btn btn-ghost btn-sm" onClick={closeLock}>{t("Not now")}</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { const ok = await lockWithPasskey(uid); toast(t(ok ? "Done. Your passkey now opens your chats." : "This passkey cannot hold your chat key. You can still approve new devices from this one."), ok ? "ok" : "err"); closeLock(); } catch { /* cancelled */ } setBusy(false); }}>{t("Lock with passkey")}</button></div>
  </div>;
  return null;
}
