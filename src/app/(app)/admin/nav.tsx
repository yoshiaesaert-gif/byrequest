"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string][] = [["/admin", "Overview"], ["/admin/requests", "Requests"], ["/admin/review", "Review queue"], ["/admin/users", "Accounts"], ["/admin/house", "Internal"], ["/admin/money", "Money"], ["/admin/team", "Team"], ["/admin/audit", "Audit log"]];

export default function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return <nav className="bo-nav" aria-label="Back office">{ITEMS.map(([h, l]) => {
    const on = h === "/admin" ? path === h : path.startsWith(h) || (h === "/admin/users" && path.startsWith("/admin/creators"));
    return <Link key={h} href={h} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{l}{counts[h] ? <i>{counts[h]}</i> : null}</Link>;
  })}</nav>;
}
