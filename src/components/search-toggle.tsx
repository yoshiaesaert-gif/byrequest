"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

/* Search sits behind a magnifier and opens in place, so the top bar stays calm. */
export default function SearchToggle() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const show = () => { setOpen(true); requestAnimationFrame(() => ref.current?.focus()); };
  return (<form className={"navsearch2" + (open ? " open" : "")} role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/for-you?q=${encodeURIComponent(q.trim())}`); }}>
    <button type={open ? "submit" : "button"} className="icon-btn" onClick={open ? undefined : show} aria-label={t("Search requests")}><svg className="ico" aria-hidden="true"><use href="#i-search" /></svg></button>
    <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search requests")} aria-label={t("Search requests")} tabIndex={open ? 0 : -1}
      onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQ(""); } }} onBlur={() => { if (!q.trim()) setOpen(false); }} />
  </form>);
}
