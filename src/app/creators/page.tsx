import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { topBudgets } from "@/server/queries";
import { textsIn } from "@/server/translate";
import { publicReviews } from "@/server/creatorreviews";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { euros, CAT_LABEL } from "@/domain/rules";

export const metadata: Metadata = { title: "Create on ByRequest" };
export const dynamic = "force-dynamic";

/* The landing page for creators who arrive through an invite link: the money and the freedom first, sign up last.
   Reviews are real only: stars and quotes from creators who were paid, approved by staff. Without them the blocks stay away. */

const KIND_HINT: Record<string, string> = { video: "Short clips to longer custom videos", photos: "Sets made exactly as asked", voice: "Voice notes, whispers, stories", custom: "Anything special, made to order", worn: "Items you wore, shipped discreetly" };

/* Lowest and highest open budget per kind of content, straight from the board. */
async function budgetsPerKind() {
  const r = await db.execute<{ category: string; lo: number; hi: number }>(sql`select category, min(deal_cents)::int lo, max(deal_cents)::int hi from requests where status = 'open' and closes_at > now() group by 1 order by max(deal_cents) desc`);
  return r.rows;
}

export default async function Creators({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [{ t, locale }, sp, top, cats, rv] = await Promise.all([getT(), searchParams, topBudgets(6).catch(() => []), budgetsPerKind().catch(() => []), publicReviews().catch(() => ({ quotes: [], avg: 0, n: 0 }))]);
  const REVIEWS = rv.quotes;
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
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
      {rv.n >= 3 ? <div className="cr-proof"><span className="cr-stars">★★★★★</span><span>{t("{avg} out of 5 from creators who already earned", { avg: rv.avg.toFixed(1) })}</span></div> : null}
    </section>

    {REVIEWS.length >= 4 ? (<section className="cr-marq" aria-label={t("Creators say it best")}>
      {[REVIEWS.filter((_, i) => i % 2 === 0), REVIEWS.filter((_, i) => i % 2 === 1)].map((row, k) => (<div key={k} className={"cr-row" + (k ? " rev" : "")}><div className="cr-track">{[...row, ...row, ...row].map((r, i) => (
        <figure key={i} className="cr-mq" aria-hidden={i >= row.length || undefined}><span className="cr-stars">{stars(r.stars)}</span><blockquote>“{r.quote}”</blockquote><figcaption><b>{r.handle}</b> · {t("earned on ByRequest")}</figcaption></figure>))}</div></div>))}
    </section>) : null}

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

    {cats.length ? (<section className="cr-kinds">
      <h2>{t("What buyers ask for")}</h2>
      <p className="cr-sub">{t("Live budgets on the board right now, per kind of content.")}</p>
      <div className="cr-kgrid">{cats.map((c) => (<div key={c.category} className="cr-k">
        <b>{t(CAT_LABEL[c.category as keyof typeof CAT_LABEL] ?? c.category)}</b>
        <span className="cr-range">{c.lo === c.hi ? euros(c.hi) : `${euros(c.lo)} – ${euros(c.hi)}`}</span>
        <small>{t(KIND_HINT[c.category] ?? "Made to order, your way")}</small>
      </div>))}</div>
    </section>) : null}

    <section className="cr-safe">
      <div className="cr-safe-in">
        <h2>{t("Private by design. Safe by default.")}</h2>
        <div className="cr-sgrid">
          {([["lock", "No real name, ever", "Buyers see your username and avatar. Your identity is checked once by our partner and never shown."],
            ["eye", "Face optional", "Many creators never show their face. You choose per request what you share."],
            ["shield", "Money first", "The budget is reserved before you start. If the buyer disappears, you are still protected."],
            ["inbox", "Private chats", "Talk with buyers inside ByRequest. Sharing contact details or meeting up is not allowed, for your safety."],
            ["check", "Your content stays yours", "Delivered content is watermarked with the buyer's name and only shown inside their private vault."],
            ["alert", "Help when you need it", "Report anything in one tap. A real team looks at every report."]] as const).map(([ic, h, p]) => (
            <div key={h} className="cr-s"><span><svg className="ico" aria-hidden="true"><use href={`#i-${ic}`} /></svg></span><b>{t(h)}</b><p>{t(p)}</p></div>))}
        </div>
      </div>
    </section>

    {REVIEWS.length ? (<section className="cr-rev">
      <div className="cr-rh"><h2>{t("Creators say it best")}</h2>{rv.n >= 3 ? <span className="cr-avg">{rv.avg.toFixed(1)} <span className="cr-stars">★</span></span> : null}</div>
      <div className="cr-wall">{REVIEWS.slice(0, 9).map((r, i) => (<figure key={r.handle} className={"cr-q" + (i === 0 ? " big" : "")}>
        <span className="cr-stars">{stars(r.stars)}</span><blockquote>“{r.quote}”</blockquote><figcaption><b>{r.handle}</b> · {t("earned on ByRequest")}</figcaption></figure>))}</div>
    </section>) : null}

    <section className="cr-faq">
      <h2>{t("Questions creators ask")}</h2>
      {([["Do I need followers?", "No. Buyers post requests on the board and you apply. Nobody needs to know you beforehand."],
        ["Do I have to show my face?", "No. You decide per request. Many creators work with an avatar and never show their face."],
        ["How and when do I get paid?", "The buyer pays up front. After you deliver and the short check passes, the money is released to your payout account automatically."],
        ["What kind of content can I make?", "Videos, photos, voice notes and custom work, all between verified adults. You only take requests you are comfortable with."],
        ["Who sees what I make?", "Only the buyer who ordered it, inside their private vault, with their name as a watermark. Nothing is public."],
        ["Is it really anonymous?", "Yes. You use a username and an avatar. Your legal details are only used for the age and identity check and for payouts."],
        ["What does it cost to join?", "Nothing. Creating an account is free and there is no subscription."]] as const).map(([q, a]) => (
        <details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>))}
    </section>

    <section className="cr-end">
      <h2>{t("Your first request could be waiting already.")}</h2>
      <Link href={go} className="cr-btn">{t("Start earning")}</Link>
      <p>{t("Free to join. Adults only. Discreet by design.")}</p>
    </section>
    <Link href={go} className="cr-sticky">{t("Start earning")}</Link>
  </div>);
}
