"use client";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";
import { setCircle } from "../../actions";

/* Add to or remove from the buyer's Inner Circle. */
export function CircleButton({ handle, on }: { handle: string; on: boolean }) {
  const t = useT();
  const [v, setV] = useState(on);
  const [p, start] = useTransition();
  return <button type="button" className={"btn btn-block ic-btn" + (v ? " is-on" : "")} disabled={p} aria-pressed={v} onClick={() => start(async () => {
    const r = await setCircle(handle, !v);
    if (r.ok) { setV(!v); toast(t(!v ? "{name} is in your Inner Circle" : "Removed from your Inner Circle", { name: handle })); } else toast(t(r.error), "err");
  })}><svg className="ico sm" viewBox="0 0 24 24" fill={v ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></svg>{v ? t("In your Inner Circle") : t("Add to your Inner Circle")}</button>;
}
