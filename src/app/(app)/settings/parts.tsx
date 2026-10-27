"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setPref, becomeCreator, saveProfile, setMarketing, deleteMyAccount } from "../actions";
import { toast } from "@/components/chrome";

export function Toggle({ k, on, b, s }: { k: "frost" | "discreetPush" | "neutralTab"; on: boolean; b: string; s: string }) {
  const [v, setV] = useState(on);
  return <div className="setrow"><div><b>{b}</b><span className="s">{s}</span></div><button className={"toggle" + (v ? " is-on" : "")} role="switch" aria-checked={v} aria-label={b} onClick={async () => { setV(!v); await setPref(k, !v); }} /></div>;
}

export function Marketing({ on }: { on: boolean }) {
  const [v, setV] = useState(on);
  return <div className="setrow"><div><b>Tips and news by email</b><span className="s">Optional. Never required for using ByRequest or for creator approval</span></div><button className={"toggle" + (v ? " is-on" : "")} role="switch" aria-checked={v} aria-label="Tips and news by email" onClick={async () => { setV(!v); await setMarketing(!v); }} /></div>;
}

export function BecomeCreator() {
  const [pending, start] = useTransition();
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
    <p className="t-sm muted">Earn by making what buyers ask for. You choose every request yourself. Verify once and keep your profile private: your legal name and ID are never shown.</p>
    <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={pending} onClick={() => start(async () => { const r = await becomeCreator(); if (r && !r.ok) toast(r.error, "err"); })}>Start creator setup</button>
  </div>);
}

type P = { visibility: "offer_only" | "public"; bio: string; heightCm: number | null; build: string; sport: string; work: string; languages: string; hair: string; eyes: string; body: string; tattoos: string; makes: string; never: string; showsFace: boolean; defaultVault: string };

export function ProfileForm({ p, handle }: { p: P | null; handle: string }) {
  const [vis, setVis] = useState(p?.visibility ?? "offer_only");
  const [pending, start] = useTransition();
  const f = (name: keyof P, label: string, ph = "") => <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} className="input" defaultValue={(p?.[name] as string) ?? ""} placeholder={ph} /></div>;
  return (<form className="upbox" style={{ paddingTop: 16 }} action={(fd) => start(async () => { fd.set("visibility", vis); const r = await saveProfile(fd); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "err"); })}>
    <div className="field"><label>Who sees my profile</label><div className="seg2">
      <button type="button" className={vis === "offer_only" ? "on" : ""} onClick={() => setVis("offer_only")}><b>Only with an offer</b><span className="t-sm muted">Only buyers you make an offer to, while they choose.</span></button>
      <button type="button" className={vis === "public" ? "on" : ""} onClick={() => setVis("public")}><b>Public</b><span className="t-sm muted">Anyone signed in can find you and send a private request.</span></button></div></div>
    <div className="field"><label htmlFor="bio">Short bio</label><textarea id="bio" name="bio" className="input" rows={3} maxLength={400} style={{ height: "auto", padding: 14 }} defaultValue={p?.bio ?? ""} placeholder="What you do, what you are like, what you make." /></div>
    <div className="cp-facts" style={{ marginTop: 0 }}>
      <div className="field"><label htmlFor="heightCm">Height in cm</label><input id="heightCm" name="heightCm" className="input" inputMode="numeric" defaultValue={p?.heightCm ?? ""} /></div>
      {f("build", "Build", "Athletic")}{f("sport", "Sport", "Football, gym")}{f("work", "Work", "Student")}{f("languages", "Languages", "English, Dutch")}{f("hair", "Hair")}{f("eyes", "Eyes")}{f("body", "Body")}{f("tattoos", "Tattoos")}
    </div>
    {f("makes", "I make", "Shower, Workout, Voice notes")}{f("never", "I never do", "Face, Outdoor content")}
    <div className="field"><label>Default for offers</label><div className="optrow">
      <select name="showsFace" className="select" defaultValue={p?.showsFace ? "yes" : "no"} style={{ width: "auto" }}><option value="no">No face</option><option value="yes">Face shown</option></select>
      <select name="defaultVault" className="select" defaultValue={p?.defaultVault ?? "30d"} style={{ width: "auto" }}><option value="7d">7 days in vault</option><option value="30d">30 days in vault</option><option value="1y">1 year in vault</option><option value="forever">Forever in vault</option></select></div></div>
    <p className="t-xs muted">Shown with your username only. Your age comes from your verified date of birth. Never add your real name, address, socials or anything that identifies you.</p>
    <div className="optrow"><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button><Link className="btn btn-secondary" href={`/c/${handle}`}>Preview</Link></div>
  </form>);
}

export function DeleteAccount() {
  const [ask, setAsk] = useState(false); const [typed, setTyped] = useState(""); const [pending, start] = useTransition();
  if (!ask) return <div className="setrow"><div><b>Delete your account</b><span className="s">Your profile, requests, vault and messages go. Payment and tax records stay as the law requires</span></div><button className="btn btn-secondary btn-sm" onClick={() => setAsk(true)}>Delete</button></div>;
  return <div className="setrow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
    <b>Type DELETE to confirm. This cannot be undone.</b>
    <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type DELETE" />
    <div className="optrow"><button className="btn btn-primary btn-sm" disabled={pending || typed !== "DELETE"} onClick={() => start(async () => { const r = await deleteMyAccount(); if (r && !r.ok) toast(r.error, "err"); })}>Delete for good</button><button className="btn btn-secondary btn-sm" onClick={() => setAsk(false)}>Cancel</button></div></div>;
}
