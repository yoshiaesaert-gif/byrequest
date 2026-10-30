"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { myKeys, open, seal } from "@/components/e2e";
import { offerThread, sendOfferMessage } from "../../actions";
import { Ticks } from "@/components/ui";
import { toast } from "@/components/chrome";

type Thread = NonNullable<Awaited<ReturnType<typeof offerThread>>>;

/* The buyer's questions about this application, and your answers. Shown once the buyer wrote. */
export default function OfferTalk({ offerId, uid }: { offerId: string; uid: string }) {
  const t = useT();
  const [th, setTh] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [p, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const load = () => offerThread(offerId).then((x) => setTh(x)).catch(() => {});
  useEffect(() => { load(); const h = window.setInterval(load, 15000); return () => clearInterval(h); }, [offerId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!th || !th.msgs.length) return null;
  const kp = myKeys(uid);
  const say = (m: Thread["msgs"][number]) => (th.other.publicKey && kp ? open(m.body, m.nonce, th.other.publicKey, kp) : null) ?? t("This message was written to another device of yours.");
  const send = () => start(async () => {
    if (!kp) { window.dispatchEvent(new Event("brq:unlock")); return; }
    if (!th.other.publicKey) { toast(t("Try again in a moment."), "err"); return; }
    const r = await sendOfferMessage(offerId, seal(text.trim(), th.other.publicKey, kp));
    if (r.ok) { setText(""); await load(); setTimeout(() => end.current?.scrollIntoView({ block: "nearest" }), 50); } else toast(t(r.error), "err");
  });
  return (<section className="talk" id="talk">
    <div className="talk-h"><b>{t("Questions from the buyer")}</b><span>{t("Only you and {name} can read this.", { name: th.other.handle })}</span></div>
    <div className="talk-msgs">{th.msgs.map((m) => <div key={m.id} className={"talk-m" + (m.mine ? " mine" : "")}><span>{say(m)}</span>{m.mine ? <small className="talk-meta"><Ticks read={m.read} t={t} /></small> : null}</div>)}<div ref={end} /></div>
    <form className="talk-f" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(); }}><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Answer {name}", { name: th.other.handle })} maxLength={1500} /><button className="btn btn-primary" disabled={p || !text.trim()}>{t("Send")}</button></form>
  </section>);
}
