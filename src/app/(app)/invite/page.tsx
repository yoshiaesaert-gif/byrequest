import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { overview } from "@/server/referrals";
import { I } from "@/components/ui";
import { euros } from "@/domain/rules";
import { ShareBox, Withdraw } from "./share";

/* Invite friends, as simple as a banking app: one random code and link, a bonus balance and a
   statement. Discreet by design: nothing here says who joined, when, or what anyone earned. The
   statement has one line per week, never per friend or per deal. */
export default async function Invite() {
  const u = await requireUser();
  const { t, locale } = await getT();
  const o = await overview(u.id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "byrequest.me";
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${host}/r/${o.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0E0D17", light: "#FFFFFF" } });
  const { creatorPct: pct, windowDays: days } = o.cfg;
  const tag = locale === "nl" ? "nl-BE" : locale === "fr" ? "fr-BE" : "en-GB";
  const day = (d: Date, o2: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) => new Date(d).toLocaleDateString(tag, o2);
  const eur2 = (c: number) => (c < 0 ? "−" : "+") + "€" + (Math.abs(c) / 100).toFixed(2).replace(".", locale === "en" ? "." : ",");
  const line = (l: (typeof o.lines)[number]) => l.kind === "welcome_bonus" ? t("Welcome bonus · your first deal") : l.kind === "week_bonus" ? t("Week bonus · week of {date}", { date: day(l.weekOf ?? l.createdAt) })
    : l.kind === "free_fee" ? t("Free service fee · week of {date}", { date: day(l.weekOf ?? l.createdAt) })
    : l.kind === "withdrawal" ? t("Transferred to your account") : l.kind === "spent" ? t("Used for a request") : t("Back from a refunded request");
  return (<div className="wrap inv">
    <section className="inv-hero">
      <div className="inv-hero-copy">
        <span className="eyebrow">{t("Invite friends")}</span>
        <h1>{t("Invite friends. You both get a gift.")}</h1>
        <p>{t("Works for friends who create and for friends who buy. ByRequest pays every gift; nobody pays for it.")}</p>
      </div>
      <ShareBox url={url} display={`${host}/r/${o.code}`} code={o.code} qr={qr} />
    </section>

    <div className="inv-offers">
      <section className="inv-offer inv-offer-c">
        <span className="inv-offer-k"><I n="spark" c="sm" />{t("A friend who creates")}</span>
        <div className="inv-offer-row"><b className="inv-pct">{pct}%</b><div><b>{t("For you")}</b><p>{t("A bonus on everything they earn in their first {days} days.", { days })}</p></div></div>
        {o.cfg.welcomePct ? <div className="inv-offer-row"><b className="inv-pct">+{o.cfg.welcomePct}%</b><div><b>{t("For your friend")}</b><p>{t("Extra on top of their first deal. They keep all they earn.")}</p></div></div> : null}
      </section>
      {o.cfg.buyerGift ? <section className="inv-offer inv-offer-b">
        <span className="inv-offer-k"><I n="gift" c="sm" />{t("A friend who buys")}</span>
        <div className="inv-offer-row"><b className="inv-pct">€0</b><div><b>{t("For your friend")}</b><p>{t("No service fee on their first request.")}</p></div></div>
        <div className="inv-offer-row"><b className="inv-pct">€0</b><div><b>{t("For you")}</b><p>{t("Your next service fee is on us after their first deal.")}</p></div></div>
      </section> : null}
    </div>

    <ol className="inv-how">
      <li><span>1</span><div><b>{t("Share your link")}</b><p>{t("In a chat, in person with the QR code, or just say your code.")}</p></div></li>
      <li><span>2</span><div><b>{t("Your friend starts")}</b><p>{t("Signs up, verifies once and makes their first deal.")}</p></div></li>
      <li><span>3</span><div><b>{t("Your gifts every Monday")}</b><p>{t("Bonuses and free service fees land on your balance once a week.")}</p></div></li>
    </ol>

    <div className="inv-grid">
      <section className="card inv-bonus">
        <span className="eyebrow">{t("Bonus balance")}</span>
        <b className="inv-big num">{euros(o.balance)}</b>
        <span className="t-sm muted">{t("Next update {date}", { date: day(o.nextCredit, { weekday: "long", day: "numeric", month: "long" }) })}</span>
        <div className="inv-use">
          <Withdraw balance={o.balance} min={o.minWithdraw} ready={o.payoutsReady} />
          <Link href="/post" className="btn btn-secondary">{t("Use it for a request")}</Link>
        </div>
        {!o.payoutsReady ? <p className="t-xs muted">{t("To transfer, set up your payouts once.")} <Link href="/onboarding">{t("Set up payouts")}</Link></p> : null}
        {o.freeFees ? <div className="inv-buyer"><I n="gift" c="sm" /><span>{o.freeFees === 1 ? t("You have 1 free service fee. It is used on your next request.") : t("You have {n} free service fees. They are used on your next request.", { n: o.freeFees })}</span></div> : null}
      </section>
      <section className="card inv-statement">
        <span className="eyebrow">{t("Statement")}</span>
        {o.lines.length ? <ul>{o.lines.map((l) => <li key={l.id}><span>{line(l)}</span><b className={"num " + (l.cents > 0 ? "plus" : l.cents < 0 ? "min" : "")}>{l.kind === "free_fee" ? `+${l.ref ?? 1}` : eur2(l.cents)}</b></li>)}</ul>
          : <p className="t-sm muted">{t("Nothing yet. Your first week bonus shows here on the Monday after a friend's first deal.")}</p>}
        <p className="t-xs muted inv-discreet"><I n="lock" c="sm" />{t("Discreet: you never see who joined, when, or what anyone earned. Only one total per week.")}</p>
      </section>
    </div>

    <details className="inv-rules"><summary>{t("The rules, short and clear")}</summary><ul>
      <li>{t("Only new accounts that sign up with your link or code count. You cannot invite yourself.")}</li>
      <li>{t("The bonus is {pct}% of what your friend nets after fees, on deals paid out within {days} days of their first paid deal. ByRequest pays it on top; your friend earns exactly the same.", { pct, days })}</li>
      {o.cfg.welcomePct ? <li>{t("An invited creator gets {pct}% extra on their first paid deal, paid by ByRequest, on their bonus balance.", { pct: o.cfg.welcomePct })}</li> : null}
      <li>{t("Deals between you and your friend do not count.")}</li>
      <li>{t("Every Monday the bonuses of the week before land on your balance as one amount. Transfer it to your own verified account from {min}, or use it to pay for a request.", { min: euros(o.minWithdraw) })}</li>
      {o.cfg.buyerGift ? <li>{t("A free service fee covers up to {cap} on one request. If that request is refunded, you get it back.", { cap: euros(o.cfg.feeGiftCapCents) })}</li> : null}
      <li>{t("Your friend is never told who invited them, and you are never told what they do.")}</li>
      <li>{t("The percentage can change; a change counts for bonuses from that day on.")}</li>
      <li>{t("Abuse, such as fake accounts, ends the bonus and can close the account. Every step is logged.")}</li>
    </ul></details>
  </div>);
}
