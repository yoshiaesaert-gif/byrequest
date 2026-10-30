"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/* One quiet line: the daily queues on the left, everything else tucked into "More". */
const MAIN: [string, string][] = [["/admin", "Overview"], ["/admin/requests", "Requests"], ["/admin/offers", "Offers"], ["/admin/problems", "Support"], ["/admin/review", "Review queue"], ["/admin/users", "Accounts"], ["/admin/money", "Money"]];
const MORE: [string, string, string][] = [["/admin/visitors", "Visitors", "Who is on the site"], ["/admin/house", "Internal", "ByRequest team profiles"], ["/admin/referrals", "Referrals", "Codes and bonuses"], ["/admin/creator-reviews", "Creator reviews", "Stars and quotes for the creator page"], ["/admin/emails", "Emails", "Automatic mails"], ["/admin/team", "Team", "Staff and roles"], ["/admin/audit", "Audit log", "Every staff action"]];

export default function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", d); window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", d); window.removeEventListener("keydown", k); };
  }, [open]);
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h) || (h === "/admin/users" && path.startsWith("/admin/creators")));
  const moreOn = MORE.some(([h]) => on(h));
  return (<>
    <nav className="bo-nav" aria-label="Back office">{MAIN.map(([h, l]) => (
      <Link key={h} href={h} className={on(h) ? "on" : ""} aria-current={on(h) ? "page" : undefined}>{l}{counts[h] ? <i>{counts[h]}</i> : null}</Link>))}</nav>
    <div className="bo-more" ref={ref}>
      <button type="button" className={moreOn ? "on" : ""} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>More<svg className="ico sm" aria-hidden="true"><use href="#i-down" /></svg></button>
      {open ? <div className="bo-menu" role="menu" onClick={() => setOpen(false)}>{MORE.map(([h, l, s]) => <Link key={h} href={h} role="menuitem" className={on(h) ? "on" : ""}><b>{l}</b><span>{s}</span></Link>)}</div> : null}
    </div>
  </>);
}
