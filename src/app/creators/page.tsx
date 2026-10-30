import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { topBudgets } from "@/server/queries";
import { textsIn } from "@/server/translate";
import { euros, CAT_LABEL } from "@/domain/rules";

export const metadata: Metadata = { title: "Create on ByRequest" };
export const dynamic = "force-dynamic";

/* The landing page for creators who arrive through an invite link: the money and the freedom first, sign up last.
   EXAMPLE REVIEWS: placeholders for the design. Replace them with real creator quotes before this page goes live. */
const REVIEWS: [string, string, string][] = [
  ["nightowl", "Brussels", "My first request paid more than a full week of shifts. And I only made what I wanted to make."],
  ["milo", "Antwerp", "No followers, no posting every day. Buyers come with a budget, I pick what fits me."],
  ["ava.r", "Ghent", "The money is reserved before I start. I have never chased a payment since."],
  ["lena_dt", "Rotterdam", "Nobody knows my real name. That is exactly why I dared to start."],
  ["jasper_r", "Leuven", "I tried the big platforms. Here people ask for something and pay for it. Simple."],
  ["sam_x", "Amsterdam", "Three requests in my first weekend. It feels like getting paid for being yourself."],
];

export default async function Creators({ searchParams }: { searchParams: Promise<{ ref?: string; preview?: string }> }) {
  // Not public yet: only with ?preview=1 until real creator reviews replace the examples (CREATORS_PAGE=on opens it).
  if (process.env.CREATORS_PAGE !== "on" && (await searchParams).preview !== "1") notFound();
  const [{ t, locale }, sp, top] = await Promise.all([getT(), searchParams, topBudgets(6).catch(() => [])]);
  const L = await textsIn(top.map((r) => r.title), locale).catch(() => (s: string) => s);
  const ref = (sp.ref ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 12);
  const go = `/signin?as=earn${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const best = top[0]?.dealCents ?? 0;
  return (<div className="cr">
    <header className="cr-top"><Link href="/"><img src="/logo_white.png" alt="byrequest" height={30} /></Link><Link href={go} className="cr-mini">{t("Start creating")}</Link></header>

    <section className="cr-hero">
      <div className="cr-glow" aria-hidden="true" />
      <span className="cr-kicker">{t("For content creators")}</span>
      <h1>{t("They ask.")}<br /><em>{t("You get paid.")}</em></h1>
      <p>{t("Buyers post exactly what they want, with the budget already reserved. You pick what fits you, make it your way and get paid. No followers needed, no real name, no face if you do not want to.")}</p>
      <div className="cr-ctas"><Link href={go} className="cr-btn">{t("Start earning")}</Link><a href="#how" className="cr-ghost">{t("How it works")}</a></div>
      <div className="cr-proof"><span className="cr-stars" aria-label="5 stars">★★★★★</span><span>{t("Loved by creators who value their privacy")}</span></div>
    </section>

    {top.length ? (<section className="cr-live">
      <div className="cr-h"><span className="cr-dot" />{t("Waiting for a creator right now")}</div>
      <div className="cr-cards">{top.map((r) => (<div key={r.id} className="cr-card">
        <span className="cr-cat">{t(CAT_LABEL[r.category])}</span>
        <b className="cr-amt">{euros(r.dealCents)}</b>
        <span className="cr-t">{L(r.title)}</span>
      </div>))}</div>
      {best ? <p className="cr-note">{t("The biggest open request right now: {amount}.", { amount: euros(best) })}</p> : null}
    </section>) : null}

    <section className="cr-why">
      {([["01", "Demand first", "Real requests with real budgets. You never post into the void hoping something sells."],
        ["02", "Money reserved", "The buyer pays before you start. You are paid after delivery, automatically."],
        ["03", "Fully anonymous", "A username and an avatar. Your name, your face and your city stay yours."],
        ["04", "Your rules", "Only make what you like. Say no to anything else, no explanation needed."]] as const).map(([n, h, p]) => (
        <div key={n} className="cr-w"><span>{n}</span><b>{t(h)}</b><p>{t(p)}</p></div>))}
    </section>

    <section className="cr-how" id="how">
      <h2>{t("Three steps. That is it.")}</h2>
      <ol>
        <li><b>{t("Sign up in a minute")}</b><span>{t("Pick a username and an avatar. Verify once that you are an adult.")}</span></li>
        <li><b>{t("Pick a request")}</b><span>{t("Browse the board, apply to what fits you, and get chosen.")}</span></li>
        <li><b>{t("Make it and get paid")}</b><span>{t("Deliver in the app. The money is released to you automatically.")}</span></li>
      </ol>
    </section>

    <section className="cr-rev">
      <div className="cr-rh"><h2>{t("Creators say it best")}</h2><span className="cr-sample">{t("Example reviews")}</span></div>
      <div className="cr-wall">{REVIEWS.map(([h, city, q], i) => (<figure key={h} className={"cr-q" + (i === 0 ? " big" : "")}>
        <span className="cr-stars">★★★★★</span><blockquote>“{t(q)}”</blockquote><figcaption><b>{h}</b> · {city}</figcaption></figure>))}</div>
    </section>

    <section className="cr-end">
      <h2>{t("Your first request could be waiting already.")}</h2>
      <Link href={go} className="cr-btn">{t("Start earning")}</Link>
      <p>{t("Free to join. Adults only. Discreet by design.")}</p>
    </section>
    <Link href={go} className="cr-sticky">{t("Start earning")}</Link>
  </div>);
}
