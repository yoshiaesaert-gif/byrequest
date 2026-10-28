"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { toast } from "@/components/chrome";
import { becomeCreator, setMode } from "../actions";

/* Starts creator setup, or for someone who already is a creator, switches to creating. */
export function EarnStart({ creator, white }: { creator: boolean; white?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [p, start] = useTransition();
  const go = () => start(async () => {
    if (creator) { await setMode("sell"); router.push("/"); router.refresh(); return; }
    const r = await becomeCreator();
    if (r && !r.ok) toast(t(r.error), "err");
  });
  return <button className={"btn btn-lg " + (white ? "btn-white" : "btn-brand")} disabled={p} onClick={go}>{creator ? t("Switch to creating") : t("Start earning")}</button>;
}
