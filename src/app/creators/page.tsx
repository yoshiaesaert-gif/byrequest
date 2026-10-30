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

/* The page creators land on from an invite link. Editorial and direct: live money first, a few hard lines, sign up
   everywhere. The big lines are ByRequest's own; star reviews only come from creators who were actually paid. */
const LINES = ["No followers. Just paid.", "Nobody knows your name. That is the point.", "Paid up front. Never chase money again.", "You set the price. You set the pace."];

async function liveFeed() {
  const r = await db.execute<{ category: string; deal_cents: number }>(sql`select category, deal_cents from requests where status = 'open' and closes_at > now() order by created_at desc limit 14`);
  return r.rows;
}

export default async function Creators({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [{ t, locale }, sp, top, feed, rv] = await Promise.all([getT(), searchParams, topBudgets(5).catch(() => []), liveFeed().catch(() => []), publicReviews().catch(() => ({ quotes: [], avg: 0, n: 0 }))]);
  const L = await textsIn(top.map((r) => r.title), locale).catch(() => (s: string) => s);
  const ref = (sp.ref ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 12);
  const go = `/signin?as=earn${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const total = top.reduce((a, r) => a + r.dealCents, 0);
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
  const cta = (label: string, wide?: boolean) => <Link href={go} className={"cz-btn" + (wide ? " wide" : "")}>{t(label)}<span aria-hidden="true">→</span></Link>;

  return (<div className="cz">
    <header className="cz-top"><Link href="/" className="cz-logo"><img src="/logo_white.png" alt="byrequest" /></Link><Link href={go} className="cz-mini">{t("Start earning")}</Link></header>

    <section className="cz-hero">
      <div className="cz-copy">
        <span className="cz-tag">{t("For content creators")}</span>
        <h1>{t("They ask.")}<br /><i>{t("You get paid.")}</i></h1>
        <p>{t("Real buyers post exactly what they want, with the money already reserved. You pick what fits you. No followers, no real name, no face unless you want to.")}</p>
        <div className="cz-ctas">{cta("Start earning")}<a href="#money" className="cz-link">{t("See what is paid now")}</a></div>
      </div>
      {top.length ? (<aside className="cz-receipt" aria-label={t("Open right now")}>
        <div className="cz-rh"><span className="cz-live" />{t("Open right now")}</div>
        {top.map((r) => (<div key={r.id} className="cz-rl"><span><b>{L(r.title)}</b><small>{t(CAT_LABEL[r.category])}</small></span><em>{euros(r.dealCents)}</em></div>))}
        <div className="cz-rt"><span>{t("Waiting for creators")}</span><b>{euros(total)}</b></div>
      </aside>) : null}
    </section>

    {feed.length ? (<div className="cz-ticker" aria-hidden="true"><div className="cz-tt">{[...feed, ...feed].map((f, i) => <span key={i}>{t(CAT_LABEL[f.category as keyof typeof CAT_LABEL])} <b>{euros(f.deal_cents)}</b></span>)}</div></div>) : null}

    <section className="cz-lines">
      {LINES.map((l, i) => <p key={l} className={i % 2 ? "r" : ""}><span>0{i + 1}</span>{t(l)}</p>)}
      <div className="cz-mid">{cta("Claim your first request")}</div>
    </section>

    <section className="cz-money" id="money">
      <h2>{t("This is what gets paid.")}</h2>
      <div className="cz-grid">{top.slice(0, 4).map((r) => (<div key={r.id} className="cz-m"><small>{t(CAT_LABEL[r.category])}</small><b>{euros(r.dealCents)}</b><span>{L(r.title)}</span></div>))}</div>
      <p className="cz-note">{t("Live from the board. Budgets are reserved by the buyer before you start.")}</p>
    </section>

    <section className="cz-why">
      {([["I", "Money first", "The buyer pays before you start. You deliver, the money comes to you automatically."],
        ["II", "Nobody knows you", "A username and an avatar. Your name and your face stay yours."],
        ["III", "You choose", "Take only what you like. Say no to the rest, no explanation needed."]] as const).map(([n, h, p]) => (
        <div key={n}><span>{n}</span><b>{t(h)}</b><p>{t(p)}</p></div>))}
    </section>

    {rv.quotes.length ? (<section className="cz-reviews">
      <h2>{t("From creators who already earned")}{rv.n >= 3 ? <span className="cz-avg">{rv.avg.toFixed(1)} ★</span> : null}</h2>
      <div className="cz-rv">{rv.quotes.slice(0, 6).map((r) => (<figure key={r.handle}><span className="cz-stars">{stars(r.stars)}</span><blockquote>{r.quote}</blockquote><figcaption>{r.handle}</figcaption></figure>))}</div>
    </section>) : null}

    <section className="cz-end">
      <h2>{t("Your first request")}<br /><i>{t("is waiting.")}</i></h2>
      {cta("Start earning", true)}
      <p>{t("Free. Adults only. Discreet from start to finish.")}</p>
    </section>
    <Link href={go} className="cz-sticky">{t("Start earning")} →</Link>
  </div>);
}
