"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";

/* Asked once a creator has been paid: stars and one sentence, shown publicly only if they allow it and we approve it. */
export function ReviewAsk({ done }: { done: boolean }) {
  const t = useT();
  const [stars, setStars] = useState(0); const [hover, setHover] = useState(0);
  const [quote, setQuote] = useState(""); const [ok, setOk] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent">(done ? "sent" : "idle"); const [err, setErr] = useState("");
  if (state === "sent") return null;
  const send = async () => {
    setState("sending"); setErr("");
    const r = await fetch("/api/creator-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stars, quote, mayPublish: ok }) }).then((x) => x.json()).catch(() => ({ ok: false }));
    if (r.ok) setState("sent"); else { setErr(t(r.error ?? "That did not work. Please try again.")); setState("idle"); }
  };
  return (<section className="rv-ask">
    <div><b>{t("You earned on ByRequest. How do you like it?")}</b><span>{t("One sentence helps other creators decide. Takes ten seconds.")}</span></div>
    <div className="rv-stars" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n}`} className={(hover || stars) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}>★</button>)}</div>
    {stars ? (<>
      <textarea maxLength={160} rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder={t("For example: my first request paid more than a week of shifts.")} />
      <label className="rv-ok"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />{t("ByRequest may show this with my username")}</label>
      {err ? <p className="pb-err">{err}</p> : null}
      <button className="btn btn-primary" disabled={state === "sending"} onClick={send}>{state === "sending" ? t("Sending…") : t("Send")}</button>
    </>) : null}
  </section>);
}
