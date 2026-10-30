"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: string; q: string; a: string; href?: string; cta?: string };
type Cat = { id: string; icon: string; title: string; sub: string; items: Item[] };
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;
// Accents and case do not matter when searching.
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const POPULAR = ["start-how", "preview-seconds", "pay-statement", "earn-share", "privacy-hide", "deals-object"];

export default function HelpCenter({ cats, labels }: { cats: Cat[]; labels: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(cats[0].id);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
    const c = cats.find((c) => c.id === h || c.items.some((i) => i.id === h));
    if (c) setTimeout(() => { setCat(c.id); if (h !== c.id) { setOpen(h); setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: "center" }), 60); } }, 0);
  }, [cats]);
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  const found = words.length ? cats.map((c) => ({ ...c, items: c.items.filter((i) => words.every((w) => norm(`${i.q} ${i.a} ${c.title}`).includes(w))) })).filter((c) => c.items.length) : [];
  const total = found.reduce((n, c) => n + c.items.length, 0);
  const all = cats.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id })));
  const go = (id: string) => { const i = all.find((x) => x.id === id); if (!i) return; setQ(""); setCat(i.cat); setOpen(id); history.replaceState(null, "", `#${id}`); setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60); };
  const cur = cats.find((c) => c.id === cat)!;

  const qa = (i: Item, force = false) => (<div key={i.id} id={i.id} className={"hc-qa" + (open === i.id || force ? " is-open" : "")}>
    <button type="button" className="hc-q" aria-expanded={open === i.id || force} onClick={() => { setOpen(open === i.id ? null : i.id); history.replaceState(null, "", `#${i.id}`); }}><span>{i.q}</span><Ico n="down" /></button>
    <div className="hc-a"><p>{i.a}</p>{i.href ? <Link href={i.href} className="hc-go">{i.cta ?? labels.more} <Ico n="right" c="sm" /></Link> : null}</div>
  </div>);

  return (<>
    <section className="hc-hero">
      <h1>{labels.title}</h1><p>{labels.sub}</p>
      <label className="hc-search"><Ico n="search" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search} />{q ? <button type="button" onClick={() => setQ("")} aria-label="Clear"><Ico n="x" /></button> : null}</label>
      <div className="hc-pop"><span>{labels.popular}</span>{POPULAR.map((id) => { const i = all.find((x) => x.id === id); return i ? <button key={id} type="button" onClick={() => go(id)}>{i.q}</button> : null; })}</div>
    </section>

    {words.length ? (<section className="hc-results">
      <p className="hc-count">{labels.count.replace("{n}", String(total))}</p>
      {found.map((c) => <div key={c.id} className="hc-panel"><div className="hc-ph sm"><span className={`hc-ci t-${c.id}`}><Ico n={c.icon} /></span><b>{c.title}</b></div><div className="hc-list">{c.items.map((i) => qa(i, true))}</div></div>)}
      {!total ? <div className="hc-panel hc-none"><b>{labels.none}</b></div> : null}
    </section>) : (<div className="hc-body">
      <nav className="hc-nav" aria-label={labels.all}>{cats.map((c) => <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => { setCat(c.id); setOpen(null); }}><span className={`hc-ci t-${c.id}`}><Ico n={c.icon} /></span><span className="hc-nt">{c.title}</span><span className="hc-nn">{c.items.length}</span></button>)}</nav>
      <section className="hc-panel" id={cur.id}>
        <div className="hc-ph"><span className={`hc-ci lg t-${cur.id}`}><Ico n={cur.icon} /></span><div><h2>{cur.title}</h2><p>{cur.sub}</p></div></div>
        <div className="hc-list">{cur.items.map((i) => qa(i))}</div>
      </section>
    </div>)}

    <section className="hc-still">
      <div><h2>{labels.still}</h2><p>{labels.mail}</p></div>
      <div className="hc-still-btns"><Link className="btn btn-primary btn-lg" href="/contact">{labels.mail}</Link><Link className="btn btn-secondary btn-lg" href="/report">{labels.report}</Link></div>
    </section>
  </>);
}
