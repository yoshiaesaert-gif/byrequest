import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getT } from "@/i18n/server";
import { feed, pulse as livePulse } from "@/server/queries";
import { CREATOR_SHARE, euros } from "@/domain/rules";
import { Cover, I } from "@/components/ui";
import HowItWorks from "@/components/how-it-works";
import { EarnStart } from "./start";

/* The page for people who want to earn: what it is, how it works, what it is not. Reached from the
   menu ("Start creating, earn money") and from the buyer home. */
const STEPS = [
  ["See what people ask for", "Every request shows what is wanted, how long and the budget. You know what you earn before you start."],
  ["Pick only what you like", "Nobody sends you requests you did not choose. You make an offer: face or not, when you deliver."],
  ["Make it in your own time", "Film, record or shoot it whenever it suits you, within the time you offered."],
  ["Deliver and get paid", "Upload in the app. After the check and the 24 hour objection window the money lands in your account."],
] as const;
const FAQ = [
  ["Do I have to show my face?", "No. You decide per offer. Many creators never show their face."],
  ["Will anyone see my name?", "No. Buyers only see your username and avatar. Your legal name and ID are only used for verification and payouts."],
  ["Who are the buyers?", "Verified adults. You see their stars and how many deals they did, never who they are. Man or woman does not matter: it is about the request."],
  ["When do I get paid?", "After the delivery passed the check and the 24 hour objection window, or earlier when the buyer releases it. Payouts go out every Friday."],
  ["Do I need followers or a profile?", "No. There is nothing to keep up. Your profile can stay private and only shows to buyers you make an offer to."],
] as const;

export default async function Earn() {
  const u = await requireUser();
  const { t } = await getT();
  const [open, p] = await Promise.all([feed({ limit: 3 }), livePulse()]);
  return (<div className="wrap earn">
    <section className="er-hero">
      <div className="er-tx">
        <span className="h-kick">{t("Earn with ByRequest")}</span>
        <h1>{t("People ask.")}<br />{t("You make it.")}<br /><span>{t("You get paid.")}</span></h1>
        <p>{t("No followers, no profile to keep up, no DMs. Pick a request you like, make it and the money lands in your account.")}</p>
        <div className="er-cta"><EarnStart creator={u.isCreator} /><span>{t("Free. Verify once, about 5 minutes.")}</span></div>
        <div className="h-live"><span className="livedot" />{t("{n} requests open now", { n: p.open })}{p.paidCents ? ` · ${t("{amount} paid to creators this week", { amount: euros(p.paidCents) })}` : ""}</div>
      </div>
      <div className="er-cards">{open.map((r, i) => (
        <div key={r.id} className={"er-card media c" + i}><Cover cover={r.cover} frost />
          <div className="er-card-b"><span>{t("You earn")}</span><b className="num">{euros(Math.round(r.dealCents * CREATOR_SHARE))}</b></div></div>))}</div>
    </section>

    <HowItWorks variant="earn" />

    <section className="er-steps">
      <h2>{t("How it works")}</h2>
      <ol>{STEPS.map(([h, d], i) => <li key={h}><span className="num">{String(i + 1).padStart(2, "0")}</span><div><b>{t(h)}</b><p>{t(d)}</p></div></li>)}</ol>
    </section>

    <section className="er-faq">
      <h2>{t("Good to know")}</h2>
      {FAQ.map(([q, a]) => <details key={q}><summary>{t(q)}<I n="right" c="sm" /></summary><p>{t(a)}</p></details>)}
    </section>

    <section className="h-cross">
      <div><span className="h-kick">{t("Ready?")}</span><h2>{t("Your first offer is closer than you think.")}</h2><p>{t("Verify once. Then every request is one tap away.")}</p></div>
      <EarnStart creator={u.isCreator} white />
    </section>
    <p className="t-sm muted" style={{ textAlign: "center", margin: "18px 0 8px" }}><Link href="/post">{t("Rather ask for something? Post a request")} →</Link></p>
  </div>);
}
