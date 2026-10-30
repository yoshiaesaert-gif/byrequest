"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";

const TOPICS: [string, string][] = [["question", "A question"], ["problem", "Something is not working"], ["payment", "Payments and payouts"], ["account", "My account"], ["partnership", "Partnerships and press"], ["other", "Something else"]];

export default function ContactForm() {
  const t = useT();
  const [topic, setTopic] = useState("question");
  const [message, setMessage] = useState(""); const [contact, setContact] = useState(""); const [site, setSite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle"); const [err, setErr] = useState("");
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (state === "sending") return; setState("sending"); setErr("");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, message, contact, site }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(t(j.error ?? "That did not work. Please try again.")); setState("idle"); return; }
      setState("sent");
    } catch { setErr(t("That did not work. Please try again.")); setState("idle"); }
  };
  if (state === "sent") return (<div className="ct ct-done"><span className="pb-ok"><svg className="ico" aria-hidden="true"><use href="#i-check" /></svg></span><h1>{t("Thank you, we got it")}</h1><p>{t("Our team reads every message. If you have an account, we answer in your ByRequest messages.")}</p></div>);
  return (<form className="ct" onSubmit={send}>
    <h1>{t("Send us a message")}</h1>
    <p className="muted">{t("Tell us what you need. Our team reads every message and gets back to you.")}</p>
    <div className="ct-topics" role="radiogroup" aria-label={t("Topic")}>{TOPICS.map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={topic === k} className={topic === k ? "on" : ""} onClick={() => setTopic(k)}>{t(l)}</button>)}</div>
    <label className="ct-f"><span>{t("Your message")}</span><textarea required minLength={10} maxLength={3000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("What can we help you with?")} /></label>
    <label className="ct-f"><span>{t("How can we reach you? (optional)")}</span><input maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("Only needed if you are not signed in")} /></label>
    <input className="ct-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={site} onChange={(e) => setSite(e.target.value)} />
    {err ? <p className="pb-err" role="alert">{err}</p> : null}
    <button className="btn btn-primary btn-lg" disabled={state === "sending"}>{state === "sending" ? t("Sending…") : t("Send message")}</button>
  </form>);
}
