"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const on = (p: string, href: string) => (href === "/" ? p === "/" : p === href || p.startsWith(href + "/"));

export default function NavLinks({ items, tabs }: { items: string[][]; tabs?: boolean }) {
  const p = usePathname();
  if (!tabs) return <>{items.map(([h, l]) => <Link key={h} href={h} className={on(p, h) ? "is-on" : ""}>{l}</Link>)}</>;
  return <>{items.map(([h, ic, l]) => (
    <Link key={h} href={h} className={(h === "/post" ? "plus " : "") + (on(p, h) ? "is-on" : "")} aria-label={l || "Post a request"}>
      {h === "/post" ? <span className="p"><svg className="ico" aria-hidden="true"><use href="#i-plus" /></svg></span>
        : <><svg className="ico" aria-hidden="true"><use href={`#i-${ic}`} /></svg><span>{l}</span></>}
    </Link>))}</>;
}
