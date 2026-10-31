"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

/* In-site confirmation, never the browser's own popup. Any client component can await ask("…"); the host is
   mounted once in the app layout. Escape or a click outside cancels. */
type Ask = { text: string; title?: string; ok?: string; cancel?: string; danger?: boolean; resolve: (v: boolean) => void };
export function ask(text: string, o: Omit<Ask, "text" | "resolve"> = {}): Promise<boolean> {
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent("brq:ask", { detail: { ...o, text, resolve } })));
}

export function AskHost() {
  const t = useT();
  const [a, setA] = useState<Ask | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = (e: Event) => setA((e as CustomEvent<Ask>).detail);
    window.addEventListener("brq:ask", on);
    return () => window.removeEventListener("brq:ask", on);
  }, []);
  useEffect(() => {
    if (!a) return;
    okRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { a.resolve(false); setA(null); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [a]);
  if (!a) return null;
  const done = (v: boolean) => { a.resolve(v); setA(null); };
  return (<div className="ask-back" onClick={(e) => e.target === e.currentTarget && done(false)}>
    <div className="ask" role="alertdialog" aria-modal="true" aria-labelledby="ask-t">
      {a.title ? <b id="ask-t">{a.title}</b> : null}
      <p id={a.title ? undefined : "ask-t"}>{a.text}</p>
      <div className="ask-btns"><button className="btn btn-secondary" onClick={() => done(false)}>{a.cancel ?? t("Cancel")}</button>
        <button ref={okRef} className={"btn " + (a.danger ? "btn-danger" : "btn-primary")} onClick={() => done(true)}>{a.ok ?? t("Continue")}</button></div>
    </div>
  </div>);
}
