"use client";
import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseAsk } from "./ask-parse";

export default function Ask() {
  const t = useT();
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form className="ask" onSubmit={(e) => { e.preventDefault(); router.push(parseAsk(q, t)); }}>
      <svg className="ico lg" aria-hidden="true"><use href="#i-spark" /></svg>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("E.g. a 10 minute shower video")} aria-label={t("Describe your request")} />
      <button className="btn btn-primary">{t("Go")}</button>
    </form>
  );
}
