"use client";
import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setPref, becomeCreator, saveProfile, setMarketing } from "../actions";
import { toast } from "@/components/chrome";
import { GENDER, BODY_HAIR, PUBIC, SIZE, CUT, CUP, LABEL, BUILD, HAIR, EYES, TATTOOS, HEIGHTS, type Detail } from "@/domain/looks-detail";

export function Toggle({ k, on, b, s }: { k: "frost" | "discreetPush" | "neutralTab"; on: boolean; b: string; s: string }) {
  const t = useT();
  const [v, setV] = useState(on);
  return <div className="setrow"><div><b>{t(b)}</b><span className="s">{t(s)}</span></div><button className={"toggle" + (v ? " is-on" : "")} role="switch" aria-checked={v} aria-label={t(b)} onClick={async () => { setV(!v); await setPref(k, !v); }} /></div>;
}

/* Tips and reminders by email (the invite code, a nudge to finish setup, new requests). Codes and
   messages about your own deals are not affected. */
export function Reminders({ on }: { on: boolean }) {
  const t = useT();
  const [v, setV] = useState(on);
  return <div className="setrow"><div><b>{t("Tips and reminders by email")}</b><span className="s">{t("A few useful emails, never at night. Codes and messages about your deals always arrive")}</span></div><button className={"toggle" + (v ? " is-on" : "")} role="switch" aria-checked={v} aria-label={t("Tips and reminders by email")} onClick={async () => { setV(!v); await setPref("mailOff", v); }} /></div>;
}

export function Marketing({ on }: { on: boolean }) {
  const t = useT();
  const [v, setV] = useState(on);
  return <div className="setrow"><div><b>{t("Tips and news by email")}</b><span className="s">{t("Optional. Never required for using ByRequest or for creator approval")}</span></div><button className={"toggle" + (v ? " is-on" : "")} role="switch" aria-checked={v} aria-label={t("Tips and news by email")} onClick={async () => { setV(!v); await setMarketing(!v); }} /></div>;
}

export function BecomeCreator() {
  const t = useT();
  const [pending, start] = useTransition();
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
    <p className="t-sm muted">{t("Earn by making what buyers ask for. You choose every request yourself. Verify once and keep your profile private: your legal name and ID are never shown.")}</p>
    <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={pending} onClick={() => start(async () => { const r = await becomeCreator(); if (r && !r.ok) toast(t(r.error), "err"); })}>{t("Start creator setup")}</button>
  </div>);
}

type P = { visibility: "offer_only" | "public"; bio: string; heightCm: number | null; build: string; sport: string; work: string; languages: string; hair: string; eyes: string; body: string; tattoos: string; makes: string; never: string; showsFace: boolean; defaultVault: string; detail: Detail };

export function ProfileForm({ p, handle }: { p: P | null; handle: string }) {
  const t = useT();
  const [vis, setVis] = useState(p?.visibility ?? "offer_only");
  const [det, setDet] = useState<Detail>(p?.detail ?? {});
  const sel = (k: keyof Detail, label: string, list: readonly string[], req = false) => <div className="field"><label htmlFor={"d-" + k}>{t(label)}{req ? <span className="req" aria-hidden="true"> *</span> : null}</label>
    <select id={"d-" + k} className="select" value={det[k] ?? ""} onChange={(e) => setDet({ ...det, [k]: e.target.value || undefined })}><option value="">{t("Not shown")}</option>{list.map((v) => <option key={v} value={v}>{t(LABEL[v])}</option>)}</select></div>;
  const [pending, start] = useTransition();
  const pick = (name: keyof P, label: string, list: readonly (string | number)[], req = true, unit = "") => { const cur = (p?.[name] as string | number | null) ?? ""; const opts = cur !== "" && !list.includes(cur) ? [cur, ...list] : list;
    return <div className="field"><label htmlFor={name}>{t(label)}{req ? <span className="req" aria-hidden="true"> *</span> : null}</label><select id={name} name={name} className="select" defaultValue={String(cur)}><option value="">{t("Choose")}</option>{opts.map((v) => <option key={v} value={v}>{typeof v === "number" ? `${v}${unit}` : t(v)}</option>)}</select></div>; };
  const f = (name: keyof P, label: string, ph = "") => <div className="field"><label htmlFor={name}>{t(label)}</label><input id={name} name={name} className="input" defaultValue={(p?.[name] as string) ?? ""} placeholder={ph && t(ph)} /></div>;
  return (<form className="upbox" style={{ paddingTop: 16 }} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { fd.set("visibility", vis); for (const [k, v] of Object.entries(det)) if (v) fd.set("d_" + k, v); const r = await saveProfile(fd); toast(r.ok ? t(r.msg!) : t(r.error), r.ok ? "ok" : "err"); }); }}>
    <div className="field"><label>{t("Who sees my profile")}</label><div className="seg2">
      <button type="button" className={vis === "offer_only" ? "on" : ""} onClick={() => setVis("offer_only")}><b>{t("Only with an offer")}</b><span className="t-sm muted">{t("Only buyers you make an offer to, while they choose.")}</span></button>
      <button type="button" className={vis === "public" ? "on" : ""} onClick={() => setVis("public")}><b>{t("Public")}</b><span className="t-sm muted">{t("Anyone signed in can find you and send a private request.")}</span></button></div></div>
    <p className="t-xs muted">{t("Fields with * are needed before you can apply. Buyers choose on them.")}</p>
    <div className="field"><label htmlFor="bio">{t("Short bio")}<span className="req" aria-hidden="true"> *</span></label><textarea id="bio" name="bio" className="input" rows={3} maxLength={400} style={{ height: "auto", padding: 14 }} defaultValue={p?.bio ?? ""} placeholder={t("What you do, what you are like, what you make.")} /></div>
    <div className="cp-facts" style={{ marginTop: 0 }}>
      {pick("heightCm", "Height", HEIGHTS, true, " cm")}{pick("build", "Build", BUILD)}{pick("hair", "Hair", HAIR)}{pick("eyes", "Eyes", EYES)}{pick("tattoos", "Tattoos", TATTOOS, false)}
      {f("sport", "Sport", "Football, gym")}{f("work", "Work", "Student")}{f("languages", "Languages", "English, Dutch")}{f("body", "Distinctive features", "Piercings, freckles, a scar")}
    </div>
    <div className="field det-sec"><label>{t("How you look")}</label><p className="t-xs muted">{t("Buyers choose with this. Gender shows on your profile. The intimate details only show to buyers you applied to, never publicly.")}</p></div>
    <div className="cp-facts" style={{ marginTop: 0 }}>
      {sel("gender", "Gender", GENDER, true)}{sel("bodyHair", "Body hair", BODY_HAIR, true)}{sel("pubic", "Pubic hair", PUBIC, true)}
      {det.gender !== "woman" ? <>{sel("size", "Size", SIZE)}{sel("cut", "Circumcised", CUT)}</> : null}
      {det.gender !== "man" ? sel("cup", "Cup size", CUP) : null}
    </div>
    {f("makes", "I make", "Shower, Workout, Voice notes")}{f("never", "I never do", "Face, Outdoor content")}
    <div className="field"><label>{t("Default for offers")}</label><div className="optrow">
      <select name="showsFace" className="select" defaultValue={p?.showsFace ? "yes" : "no"} style={{ width: "auto" }}><option value="no">{t("No face")}</option><option value="yes">{t("Face shown")}</option></select>
      <select name="defaultVault" className="select" defaultValue={p?.defaultVault ?? "30d"} style={{ width: "auto" }}><option value="7d">{t("7 days in vault")}</option><option value="30d">{t("30 days in vault")}</option><option value="1y">{t("1 year in vault")}</option><option value="forever">{t("Forever in vault")}</option></select></div></div>
    <p className="t-xs muted">{t("Shown with your username only. Your age comes from your verified date of birth. Never add your real name, address, socials or anything that identifies you.")}</p>
    <div className="optrow"><button className="btn btn-primary" disabled={pending}>{pending ? t("Saving…") : t("Save profile")}</button><Link className="btn btn-secondary" href={`/c/${handle}`}>{t("Preview")}</Link></div>
  </form>);
}

