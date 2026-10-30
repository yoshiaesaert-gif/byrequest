import Link from "next/link";
import { COMPANY } from "@/config/company";

/* A fixed policy page in the reader's language, with the company details at the bottom. */
export function PolicyDoc({ title, paras, updated, footer }: { title: string; paras: string[]; updated: string; footer: string }) {
  return (<div className="wrap"><article className="doc">
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 40, marginBottom: 24 }} /></Link>
    <h1>{title}</h1>
    {paras.map((p, i) => p.startsWith("## ") ? <h2 key={i}>{p.slice(3)}</h2> : <p key={i}>{p}</p>)}
    <footer className="doc-meta"><p>{footer}</p><p>{COMPANY.name} · {COMPANY.address}</p><p>{updated}</p></footer>
  </article></div>);
}
