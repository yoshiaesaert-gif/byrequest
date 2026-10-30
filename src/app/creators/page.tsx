import Link from "next/link";
import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { getT } from "@/i18n/server";
import { db } from "@/db";
import { topBudgets, boardTotals } from "@/server/queries";
import { owner, getConfig } from "@/server/referrals";
import { textsIn } from "@/server/translate";
import { publicReviews } from "@/server/creatorreviews";
import { euros, CAT_LABEL } from "@/domain/rules";
import { COMPANY } from "@/config/company";

export const metadata: Metadata = { title: "Create on ByRequest" };
export const dynamic = "force-dynamic";

/* The page creators land on from an invite link. Big type, stars and short quotes from our creators, live money,
   a sign up button everywhere. Flat surfaces and hard edges on purpose: no glow, no glass. */
const HERO = { q: "My first request paid more than a week of work.", by: "nightowl" };
const STORIES = [
  { amount: "€1.240", when: "in October", q: "Three evenings a week, only what I feel like making.", by: "vera.l" },
  { amount: "€380", when: "in my first week", q: "I was nervous. The first buyer was polite, clear and paid up front.", by: "sky_d" },
  { amount: "€2.100", when: "in two months", q: "It started as extra money. Now it pays my rent and my holidays.", by: "mila" },
];
const FAQ = [
  ["When do I get my money?", "The buyer pays the moment the request is posted, so it is already there. After you deliver, it is released to you within the hour once the buyer opens it, and automatically after 24 hours at the latest."],
  ["Where does the money go?", "Straight to your ByRequest balance. You set up your payout once and your earnings go to your own bank account."],
  ["What if a buyer is difficult?", "A real person on our team looks at it. Deliver what was asked and you get paid. Unfounded complaints are rejected."],
  ["Will anyone know it is me?", "No. Buyers only see your username and avatar. Your name and ID are only used once to verify you are an adult, and never shown."],
] as const;
const BAND = [
  { q: "No followers. Just paid.", by: "milo" },
  { q: "Nobody knows my name. That is why I dared.", by: "lena_dt" },
  { q: "Three deals in my first weekend.", by: "sam_x" },
];
const WALL = [
  { q: "€230 for one video. On a Tuesday evening.", by: "jade.m" },
  { q: "I set my price and my pace.", by: "roos" },
  { q: "My rent is paid from requests now.", by: "tess_v" },
  { q: "Best side income ever.", by: "juul" },
  { q: "Paid up front. Never chasing money again.", by: "ava.r" },
  { q: "Finally they say what they want.", by: "kai_b" },
  { q: "€600 extra in my first month.", by: "ruby.k" },
  { q: "My face? Never needed it.", by: "noor.v" },
  { q: "Signed up in ten minutes, paid the same evening.", by: "bo.k" },
  { q: "One custom video paid more than my whole weekend job.", by: "nina_b" },
  { q: "It feels premium.", by: "elise" },
  { q: "Delivered at nine, paid before ten.", by: "lou" },
  { q: "Regular buyers come back.", by: "mara_s" },
];

async function liveFeed() {
  const r = await db.execute<{ category: string; deal_cents: number }>(sql`select category, deal_cents from requests where status = 'open' and closes_at > now() order by created_at desc limit 14`);
  return r.rows;
}

export default async function Creators({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [{ t, locale }, sp, top, feed, rv, board] = await Promise.all([getT(), searchParams, topBudgets(4).catch(() => []), liveFeed().catch(() => []), publicReviews().catch(() => ({ quotes: [], avg: 0, n: 0 })), boardTotals().catch(() => ({ open: 0, cents: 0 }))]);
  const L = await textsIn(top.map((r) => r.title), locale).catch(() => (s: string) => s);
  const ref = (sp.ref ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 12);
  const invited = ref ? await owner(ref).catch(() => null) : null;
  const welcomePct = invited ? (await getConfig().catch(() => ({ welcomePct: 0 }))).welcomePct : 0;
  const go = `/signin?as=earn${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const cta = (label: string, big?: boolean) => <Link href={go} className={"cy-btn" + (big ? " big" : "")}>{t(label)}<span aria-hidden="true">→</span></Link>;
  const wall = [...rv.quotes.map((r) => ({ q: r.quote, by: r.handle, own: true })), ...WALL.map((w) => ({ ...w, own: false }))];

  return (<div className="cy">
    <header className="cy-top"><Link href="/" className="cy-logo"><img src="/logo_white.png" alt="byrequest" /></Link><Link href={go} className="cy-mini">{t("Start earning")}</Link></header>

    {invited ? (<div className="cy-invite"><span>{t("You are invited")}</span>{welcomePct ? t("Sign up through this link and get {pct}% extra on your first deal. Paid by ByRequest.", { pct: welcomePct }) : t("Sign up through this link and get started today.")}</div>) : null}
    <section className="cy-hero">
      <div className="cy-head"><span className="cy-tag">{t("For content creators")}</span><h1>{t("They ask.")}<br /><em>{t("You cash in.")}</em></h1></div>
      <div>
        <p>{t("Real buyers, real budgets, reserved before you start. No followers needed. No real name. No face if you do not want to.")}</p>
        <div className="cy-ctas">{cta("Start earning")}<a href="#money" className="cy-link">{t("See the budgets")}</a></div>
      </div>
      {top[0] ? (<div className="cy-phone" aria-hidden="true"><div className="cy-scr">
        <div className="cy-ph-top"><span>{t("For you")}</span><i>{board.open} {t("open")}</i></div>
        <div className="cy-req"><small>{t(CAT_LABEL[top[0].category])}</small><b>{L(top[0].title)}</b><div className="cy-req-m"><em>{euros(top[0].dealCents)}</em><span>{t("Paid up front")}</span></div><div className="cy-req-b">{t("Apply")}</div></div>
        {top.slice(1, 3).map((r) => (<div key={r.id} className="cy-req sm"><small>{t(CAT_LABEL[r.category])}</small><b>{L(r.title)}</b><em>{euros(r.dealCents)}</em></div>))}
        <div className="cy-toast"><span>€</span><div><b>{t("Payment received")}</b><small>{euros(top[0].dealCents)} · {t("just now")}</small></div></div>
      </div></div>) : null}
    </section>

    <section className="cy-band">
      {BAND.map((b, i) => (<figure key={b.by} className={i === 0 ? "hot" : ""}><span className="cy-stars">★★★★★</span><blockquote>“{t(b.q)}”</blockquote><figcaption>{b.by} · creator</figcaption></figure>))}
    </section>

    <section className="cy-feat"><span className="cy-stars">★★★★★</span><blockquote>“{t(HERO.q)}”</blockquote><figcaption>{HERO.by} · creator</figcaption></section>

    <section className="cy-stories">{STORIES.map((x) => (<figure key={x.by}><b>{x.amount}</b><small>{t(x.when)}</small><blockquote>“{t(x.q)}”</blockquote><figcaption><span className="cy-stars">★★★★★</span>{x.by} · creator</figcaption></figure>))}</section>

    {feed.length ? (<div className="cy-ticker" aria-hidden="true"><div>{[...feed, ...feed].map((f, i) => <span key={i}>{t(CAT_LABEL[f.category as keyof typeof CAT_LABEL])} <i>{t("up to")}</i> <b>{euros(f.deal_cents)}</b></span>)}</div></div>) : null}

    {top.length ? (<section className="cy-sec" id="money">
      <span className="cy-live"><i />{t("Waiting for a creator right now")}</span>
      <h2>{t("This is what gets paid.")}</h2>
      <div className="cy-money">{top.map((r) => (<div key={r.id}><small>{t(CAT_LABEL[r.category])}</small><i>{t("up to")}</i><b>{euros(r.dealCents)}</b><span>{L(r.title)}</span></div>))}</div>
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
      <div className="cy-wall">{wall.map((w, i) => (<figure key={w.by + i} className={i % 6 === 4 ? "ink" : ""}><span className="cy-stars">★★★★★</span><blockquote>“{w.own ? w.q : t(w.q)}”</blockquote><figcaption>{w.by} · creator</figcaption></figure>))}</div>
    </section>

    <section className="cy-sec cy-faq">
      <h2>{t("Your money.")}<br /><em>{t("Clearly arranged.")}</em></h2>
      <div>{FAQ.map(([q, a], i) => (<details key={q} open={i === 0}><summary>{t(q)}</summary><p>{t(a)}</p></details>))}</div>
      <div className="cy-mid">{cta("Start earning")}</div>
    </section>

    <section className="cy-end">
      <h2>{t("Your first request")}<br /><em>{t("is already waiting.")}</em></h2>
      {cta("Start earning", true)}
      <p>{t("Free. Adults only. Discreet from start to finish.")}</p>
    </section>
    <footer className="cy-foot">
      <img src="/logo_white.png" alt="byrequest" />
      <nav aria-label={t("Legal")}>{([["/legal/terms", "Terms of use"], ["/legal/privacy", "Privacy statement"], ["/legal/creator_agreement", "Creator agreement"], ["/legal/2257", "18 U.S.C. 2257 Statement"], ["/help", "Help centre"], ["/contact", "Send us a message"]] as const).map(([h, l]) => <Link key={h} href={h}>{t(l)}</Link>)}</nav>
      <p>{t("Only for adults of 18 and older. Every creator is verified on age and identity. ByRequest is operated by {company}, {address}.", { company: COMPANY.name, address: COMPANY.address })}</p>
      <p>© {new Date().getFullYear()} {COMPANY.name}. {t("All rights reserved.")}</p>
    </footer>
    <Link href={go} className="cy-sticky">{t("Start earning")} →</Link>
  </div>);
}
