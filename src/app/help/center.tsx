"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: string; q: string; a: string; href?: string; cta?: string };
type Cat = { id: string; icon: string; title: string; sub: string; items: Item[] };
const Ico = ({ n }: { n: string }) => <svg className="ico" aria-hidden="true"><use href={`#i-${n}`} /></svg>;
// Accents and case do not matter when searching: "previews" finds "préviews".
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function HelpCenter({ cats, labels }: { cats: Cat[]; labels: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const h = decodeURIComponent(location.hash.slice(1)); if (!h) return; const c = cats.find((c) => c.id === h || c.items.some((i) => i.id === h)); if (c) setTimeout(() => { setCat(c.id); if (h !== c.id) setOpen(h); setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: "center" }), 50); }, 0); }, [cats]);
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  const shown = cats.map((c) => ({ ...c, items: c.items.filter((i) => (!cat || cat === c.id || words.length > 0) && words.every((w) => norm(`${i.q} ${i.a} ${c.title}`).includes(w))) })).filter((c) => c.items.length && (words.length > 0 || !cat || cat === c.id));
  const total = shown.reduce((n, c) => n + c.items.length, 0);
  return (<>
    <section className="hc-hero"><h1 className="t-h1">{labels.title}</h1><p className="muted">{labels.sub}</p>
      <label className="hc-search"><Ico n="search" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search} autoFocus />{q ? <button type="button" onClick={() => setQ("")} aria-label="x"><Ico n="x" /></button> : null}</label>
      {words.length ? <p className="t-sm muted">{labels.count.replace("{n}", String(total))}</p> : null}
    </section>
    {!words.length ? <nav className="hc-cats">{cats.map((c) => <button key={c.id} type="button" className={"hc-cat" + (cat === c.id ? " is-on" : "")} onClick={() => { setCat(cat === c.id ? null : c.id); setOpen(null); }}><span className="hc-ci"><Ico n={c.icon} /></span><b>{c.title}</b><span className="t-xs muted">{c.sub}</span></button>)}</nav> : null}
    {cat && !words.length ? <button type="button" className="btn btn-secondary btn-sm hc-all" onClick={() => setCat(null)}>{labels.all}</button> : null}
    <div className="hc-list">
      {shown.map((c) => (<section key={c.id} id={c.id} className="hc-sec"><h2 className="t-h3"><Ico n={c.icon} />{c.title}</h2>
        {c.items.map((i) => (<div key={i.id} id={i.id} className={"hc-qa" + (open === i.id || words.length ? " is-open" : "")}>
          <button type="button" className="hc-q" aria-expanded={open === i.id || words.length > 0} onClick={() => { setOpen(open === i.id ? null : i.id); history.replaceState(null, "", `#${i.id}`); }}><span>{i.q}</span><Ico n="down" /></button>
          <div className="hc-a"><p>{i.a}</p>{i.href ? <Link href={i.href} className="hc-go">{i.cta ?? labels.more} <Ico n="right" /></Link> : null}</div>
        </div>))}</section>))}
      {!total ? <div className="card empty"><b>{labels.none}</b></div> : null}
    </div>
    <section className="hc-still card"><b className="t-h3">{labels.still}</b><p className="muted t-sm">{labels.mail}</p><a className="btn btn-primary" href="mailto:support@byrequest.me">support@byrequest.me</a></section>
  </>);
}
