"use client";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { replyToTeam } from "../../actions";
import { toast } from "@/components/chrome";

/* Write back to the ByRequest team. The text is kept until it is sent. */
export default function TeamReply() {
  const t = useT();
  const [text, setText] = useState(""); const [p, start] = useTransition();
  const send = () => start(async () => {
    try { const r = await replyToTeam(text); if (!r.ok) { toast(t(r.error ?? "Something went wrong"), "err"); return; } setText(""); toast(t("Sent. The team will answer here.")); }
    catch { toast(t("Not sent. Try again in a moment."), "err"); }
  });
  return (<form className="tm-reply" onSubmit={(e) => { e.preventDefault(); if (text.trim().length > 1) send(); }}>
    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Write to the ByRequest team")} rows={3} maxLength={2000} />
    <button className="btn btn-primary btn-block" disabled={p || text.trim().length < 2}>{p ? t("Sending") : t("Send")}</button>
  </form>);
}
