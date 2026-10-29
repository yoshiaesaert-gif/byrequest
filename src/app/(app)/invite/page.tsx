import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { overview } from "@/server/referrals";
import { I, when } from "@/components/ui";
import { euros } from "@/domain/rules";
import { REF_SHARE, REF_WINDOW_DAYS, FEE_GIFT_CAP_CENTS } from "@/domain/referral";
import { ShareLink } from "./share";

/* Invite friends: one personal code, two links (creators and buyers), what you earned and where
   each friend is. Clear rules, no small print surprises. */
export default async function Invite() {
  const u = await requireUser();
  const { t, locale } = await getT();
  const o = await overview(u.id);
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const pct = Math.round(REF_SHARE * 100);
  const steps = (f: (typeof o.friends)[number]) => f.intent === "earn"
    ? [[t("Signed up"), true], [t("Verified"), f.verified], [t("First deal"), !!f.firstDealAt], [t("Bonus running"), !!f.windowEndsAt && new Date(f.windowEndsAt) > new Date()]] as const
    : [[t("Signed up"), true], [t("First deal"), f.buyerDone]] as const;
  return (<div className="wrap inv">
    <section className="inv-hero">
      <span className="inv-gift" aria-hidden="true"><I n="gift" c="lg" /></span>
      <span className="eyebrow">{t("Invite friends")}</span>
      <h1>{t("Bring a creator. Earn {pct}% alongside.", { pct })}</h1>
      <p>{t("For every friend who becomes a creator, you get {pct}% on top of what they net in their first {days} days, counted from their first deal. ByRequest pays it. Your friend keeps everything.", { pct, days: REF_WINDOW_DAYS })}</p>
      <div className="inv-example"><b>{t("Example")}</b> {t("Your friend earns {a} in their first month. You get {b}.", { a: euros(80000), b: euros(Math.round(80000 * REF_SHARE)) })}</div>
    </section>

    <div className="inv-links">
      <ShareLink kind="earn" url={`${base}/r/${o.code}`} code={o.code} title={t("Invite a creator")} text={t("They earn by making what buyers ask for. You get {pct}% on top for {days} days.", { pct, days: REF_WINDOW_DAYS })} />
      <ShareLink kind="buy" url={`${base}/r/${o.code}?as=buy`} code={o.code} title={t("Invite a buyer")} text={t("Their first service fee is on us. When their first deal is done, your next one is too.")} />
    </div>

    <div className="inv-stats">
      <div className="card"><span>{t("Link opened")}</span><b className="num">{o.opened}</b></div>
      <div className="card"><span>{t("Friends joined")}</span><b className="num">{o.friends.length}</b></div>
      <div className="card"><span>{t("You earned")}</span><b className="num">{euros(o.earned)}</b><small>{o.held ? t("{amount} waits for your payout setup", { amount: euros(o.held) }) : o.paid ? t("{amount} paid out", { amount: euros(o.paid) }) : t("Paid out like your earnings")}</small></div>
      <div className="card"><span>{t("Free service fees")}</span><b className="num">{o.freeFees}</b><small>{o.freeFees ? t("Used on your next request") : t("Earn one per invited buyer")}</small></div>
    </div>
    {o.held ? <div className="banner info"><I n="wallet" /><div className="grow"><b>{t("Finish your payout setup to receive {amount}", { amount: euros(o.held) })}</b><div className="t-sm">{t("Bonuses are paid out like earnings, to your own verified payout account.")}</div></div><Link href="/onboarding" className="btn btn-primary btn-sm">{t("Set up payouts")}</Link></div> : null}

    <section className="sec"><div className="sec-h"><h2 className="t-h2">{t("How it works")}</h2></div>
      <ol className="inv-how">
        <li><span>1</span><b>{t("Share your link")}</b><p>{t("Send it in a chat or share your code. It works for {days} days on their device.", { days: 30 })}</p></li>
        <li><span>2</span><b>{t("They sign up and get going")}</b><p>{t("Creators verify once and apply for requests they like. Buyers post their first request.")}</p></li>
        <li><span>3</span><b>{t("You get your thank you")}</b><p>{t("{pct}% of what a creator nets for {days} days from their first deal, paid out automatically. Or a free service fee per buyer.", { pct, days: REF_WINDOW_DAYS })}</p></li>
      </ol></section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">{t("Your friends")}</h2></div>
      {o.friends.length ? <div className="card inv-friends">{o.friends.map((f) => (
        <div key={f.id} className="inv-f">
          <div className="inv-f-h"><b>{f.name}</b><span className="badge">{f.intent === "earn" ? t("Creator") : t("Buyer")}</span><span className="t-sm muted">{t("Joined {date}", { date: when(f.joined, locale) })}</span>{f.earnedCents ? <b className="inv-f-e num">+{euros(f.earnedCents)}</b> : null}</div>
          <ol className="inv-steps">{steps(f).map(([l, done]) => <li key={l} className={done ? "done" : ""}><i />{l}</li>)}</ol>
          {f.windowEndsAt ? <p className="t-xs muted">{new Date(f.windowEndsAt) > new Date() ? t("Bonus runs until {date}", { date: when(f.windowEndsAt, locale) }) : t("Bonus period ended {date}", { date: when(f.windowEndsAt, locale) })}</p> : null}
        </div>))}</div>
        : <div className="card empty"><span className="empty-i"><I n="users" c="lg" /></span><b className="t-h3">{t("No friends yet")}</b><p className="muted t-sm">{t("Share your link. You see every friend here, from sign up to their first deal.")}</p></div>}
    </section>

    <section className="inv-rules"><b>{t("The rules, short and clear")}</b><ul>
      <li>{t("Only new accounts that sign up with your link or code count. You cannot invite yourself.")}</li>
      <li>{t("The creator bonus is {pct}% of what your friend nets after fees, on deals paid out within {days} days of their first paid deal. ByRequest pays it on top; your friend earns exactly the same.", { pct, days: REF_WINDOW_DAYS })}</li>
      <li>{t("Deals between you and your friend do not count.")}</li>
      <li>{t("A free service fee covers up to {cap} on one request. If that request is refunded, you get it back.", { cap: euros(FEE_GIFT_CAP_CENTS) })}</li>
      <li>{t("Bonuses are paid out like earnings, after review and the 24 hour objection window, to your own verified payout account.")}</li>
      <li>{t("Abuse, such as fake accounts, ends the bonus and can close the account. Every step is logged.")}</li>
    </ul></section>
  </div>);
}
