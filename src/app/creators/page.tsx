import Link from "next/link";
import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { getT } from "@/i18n/server";
import { db } from "@/db";
import { topBudgets } from "@/server/queries";
import { textsIn } from "@/server/translate";
import { publicReviews } from "@/server/creatorreviews";
import { euros, CAT_LABEL } from "@/domain/rules";

export const metadata: Metadata = { title: "Create on ByRequest" };
export const dynamic = "force-dynamic";

/* The page creators land on from an invite link. Big type, stars and short quotes from our creators, live money,
   a sign up button everywhere. Flat surfaces and hard edges on purpose: no glow, no glass. */
const HERO = { q: "My first request paid more than a week of work.", by: "nightowl" };
const BAND = [
  { q: "No followers. Just paid.", by: "milo" },
  { q: "Nobody knows my name. That is why I dared.", by: "lena_dt" },
  { q: "Three deals in my first weekend.", by: "sam_x" },
];
const WALL = [
  { q: "I set my price and my pace.", by: "roos" },
  { q: "Best side income ever.", by: "juul" },
  { q: "Paid up front. Never chasing money again.", by: "ava.r" },
  { q: "Finally they say what they want.", by: "kai_b" },
  { q: "My face? Never needed it.", by: "noor.v" },
  { q: "Signed up in ten minutes, paid the same evening.", by: "bo.k" },
  { q: "It feels premium.", by: "elise" },
  { q: "Regular buyers come back.", by: "mara_s" },
];

async function liveFeed() {
  const r = await db.execute<{ category: string; deal_cents: number }>(sql`select category, deal_cents from requests where status = 'open' and closes_at > now() order by created_at desc limit 14`);
  return r.rows;
}

export default async function Creators({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [{ t, locale }, sp, top, feed, rv] = await Promise.all([getT(), searchParams, topBudgets(4).catch(() => []), liveFeed().catch(() => []), publicReviews().catch(() => ({ quotes: [], avg: 0, n: 0 }))]);
  const L = await textsIn(top.map((r) => r.title), locale).catch(() => (s: string) => s);
  const ref = (sp.ref ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 12);
  const go = `/signin?as=earn${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const cta = (label: string, big?: boolean) => <Link href={go} className={"cy-btn" + (big ? " big" : "")}>{t(label)}<span aria-hidden="true">→</span></Link>;
  const wall = [...rv.quotes.map((r) => ({ q: r.quote, by: r.handle, own: true })), ...WALL.map((w) => ({ ...w, own: false }))];

  return (<div className="cy">
    <header className="cy-top"><Link href="/" className="cy-logo"><img src="/logo_white.png" alt="byrequest" /></Link><Link href={go} className="cy-mini">{t("Start earning")}</Link></header>

    <section className="cy-hero">
      <div className="cy-head"><span className="cy-tag">{t("For content creators")}</span><h1>{t("They ask.")}<br /><em>{t("You cash in.")}</em></h1></div>
      <div>
        <p>{t("Real buyers, real budgets, reserved before you start. No followers needed. No real name. No face if you do not want to.")}</p>
        <div className="cy-ctas">{cta("Start earning")}<a href="#money" className="cy-link">{t("See the budgets")}</a></div>
      </div>
      <figure className="cy-hq"><span className="cy-stars">★★★★★</span><blockquote>“{t(HERO.q)}”</blockquote><figcaption>{HERO.by} · creator</figcaption></figure>
    </section>

    <section className="cy-band">
      {BAND.map((b, i) => (<figure key={b.by} className={i === 0 ? "hot" : ""}><span className="cy-stars">★★★★★</span><blockquote>“{t(b.q)}”</blockquote><figcaption>{b.by} · creator</figcaption></figure>))}
    </section>

    {feed.length ? (<div className="cy-ticker" aria-hidden="true"><div>{[...feed, ...feed].map((f, i) => <span key={i}>{t(CAT_LABEL[f.category as keyof typeof CAT_LABEL])} <b>{euros(f.deal_cents)}</b></span>)}</div></div>) : null}

    {top.length ? (<section className="cy-sec" id="money">
      <span className="cy-live"><i />{t("Waiting for a creator right now")}</span>
      <h2>{t("This is what gets paid.")}</h2>
      <div className="cy-money">{top.map((r) => (<div key={r.id}><small>{t(CAT_LABEL[r.category])}</small><b>{euros(r.dealCents)}</b><span>{L(r.title)}</span></div>))}</div>
      <div className="cy-mid">{cta("Claim your first request")}</div>
    </section>) : null}

    <section className="cy-sec">
      <h2>{t("Why creators stay.")}</h2>
      <div className="cy-why">
        {([["01", "Money first", "The buyer pays before you start. You deliver, the money comes to you automatically."],
          ["02", "Nobody knows you", "A username and an avatar. Your name and your face stay yours."],
          ["03", "You choose", "Take only what you like. Say no to the rest, no explanation needed."]] as const).map(([n, h, p]) => (
          <div key={n}><span>{n}</span><b>{t(h)}</b><p>{t(p)}</p></div>))}
      </div>
      <div className="cy-mid">{cta("Make your profile in a minute")}</div>
    </section>

    <section className="cy-sec">
      <h2>{t("Big words.")}<br /><em>{t("From creators.")}</em></h2>
      <div className="cy-wall">{wall.map((w, i) => (<figure key={w.by + i} className={i % 5 === 1 ? "hot" : i % 5 === 4 ? "ink" : ""}><span className="cy-stars">★★★★★</span><blockquote>“{w.own ? w.q : t(w.q)}”</blockquote><figcaption>{w.by} · creator</figcaption></figure>))}</div>
    </section>

    <section className="cy-end">
      <h2>{t("Your first request")}<br /><em>{t("is already waiting.")}</em></h2>
      {cta("Start earning", true)}
      <p>{t("Free. Adults only. Discreet from start to finish.")}</p>
    </section>
    <Link href={go} className="cy-sticky">{t("Start earning")} →</Link>
  </div>);
}
