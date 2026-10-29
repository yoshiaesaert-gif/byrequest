import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { overview } from "@/server/referrals";
import { I, when } from "@/components/ui";
import { euros } from "@/domain/rules";
import { ShareBox, CodeEditor } from "./share";

/* Invite friends, kept as simple as a banking app: one short link, one code, share it, and a bonus
   every Monday. Discreet by design: friends show only as joined or active, money only as weekly
   totals that were paid out, never per friend or per deal. */
export default async function Invite() {
  const u = await requireUser();
  const { t, locale } = await getT();
  const o = await overview(u.id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "byrequest.me";
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${host}/r/${o.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0E0D17", light: "#FFFFFF" } });
  const { creatorPct: pct, windowDays: days } = o.cfg;
  const active = o.friends.filter((f) => f.active).length;
  const date = (d: Date) => new Date(d).toLocaleDateString(locale === "nl" ? "nl-BE" : locale === "fr" ? "fr-BE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (<div className="wrap inv">
    <section className="inv-hero">
      <div className="inv-hero-copy">
        <span className="eyebrow">{t("Invite friends")}</span>
        <h1>{t("Get a {pct}% bonus on every friend who creates.", { pct })}</h1>
        <p>{t("On everything a friend earns as a creator in their first {days} days. ByRequest pays it, your friend keeps everything. On your account every Monday.", { days })}</p>
      </div>
      <ShareBox url={url} display={`${host}/r/${o.code}`} code={o.code} qr={qr} />
    </section>

    <ol className="inv-how">
      <li><span>1</span><div><b>{t("Share your link")}</b><p>{t("In a chat, in person with the QR code, or just say your code.")}</p></div></li>
      <li><span>2</span><div><b>{t("Your friend starts")}</b><p>{t("Signs up, verifies once and makes their first deal.")}</p></div></li>
      <li><span>3</span><div><b>{t("Your bonus every Monday")}</b><p>{t("{pct}% for {days} days, bundled into one weekly amount.", { pct, days })}</p></div></li>
    </ol>

    <div className="inv-grid">
      <section className="card inv-bonus">
        <span className="eyebrow">{t("Your bonus")}</span>
        <b className="inv-big num">{euros(o.paidTotal)}</b>
        <span className="t-sm muted">{t("paid out in total")}</span>
        <dl className="inv-dl">
          <div><dt>{t("Next payout")}</dt><dd>{date(o.nextPayout)}</dd></div>
          {o.lastPaid ? <div><dt>{t("Last payout")}</dt><dd>{euros(o.lastPaid.cents)} · {when(o.lastPaid.at, locale)}</dd></div> : null}
          <div><dt>{t("Friends")}</dt><dd>{t("{n} joined · {m} active", { n: o.friends.length, m: active })}</dd></div>
          <div><dt>{t("Link opened")}</dt><dd>{o.opened}×</dd></div>
        </dl>
        {o.waiting && !o.payoutsReady ? <div className="inv-warn"><I n="wallet" c="sm" /><span>{t("A bonus is waiting. Set up your payouts to receive it.")}</span><Link href="/onboarding" className="btn btn-primary btn-sm">{t("Set up payouts")}</Link></div> : null}
        <p className="t-xs muted">{t("Discreet: you never see what a friend earns. Only one weekly total.")}</p>
      </section>
      <section className="card inv-friends">
        <span className="eyebrow">{t("Your friends")}</span>
        {o.friends.length ? <ul>{o.friends.slice(0, 8).map((f) => <li key={f.id}><span className="inv-av">{f.name.slice(0, 1).toUpperCase()}</span><b>{f.name}</b><span className={"badge " + (f.active ? "ok" : "")}>{f.active ? t("Active") : t("Joined")}</span><span className="t-xs muted">{when(f.joined, locale)}</span></li>)}{o.friends.length > 8 ? <li className="inv-more">{t("+{n} more", { n: o.friends.length - 8 })}</li> : null}</ul>
          : <p className="t-sm muted">{t("Nobody yet. Share your link: you see every friend here as soon as they join.")}</p>}
        {o.cfg.buyerGift ? <div className="inv-buyer"><I n="gift" c="sm" /><span>{t("Inviting a buyer? Their first service fee is on us, and you get one too after their first deal.")}{o.freeFees ? " " + t("You have {n} free service fees.", { n: o.freeFees }) : ""}</span></div> : null}
      </section>
    </div>

    <CodeEditor code={o.code} />

    <details className="inv-rules"><summary>{t("The rules, short and clear")}</summary><ul>
      <li>{t("Only new accounts that sign up with your link or code count. You cannot invite yourself.")}</li>
      <li>{t("The bonus is {pct}% of what your friend nets after fees, on deals paid out within {days} days of their first paid deal. ByRequest pays it on top; your friend earns exactly the same.", { pct, days })}</li>
      <li>{t("Deals between you and your friend do not count.")}</li>
      <li>{t("Bonuses are bundled per week and paid every Monday to your own verified payout account.")}</li>
      {o.cfg.buyerGift ? <li>{t("A free service fee covers up to {cap} on one request. If that request is refunded, you get it back.", { cap: euros(o.cfg.feeGiftCapCents) })}</li> : null}
      <li>{t("The percentage can change; a change counts for bonuses from that day on.")}</li>
      <li>{t("Abuse, such as fake accounts, ends the bonus and can close the account. Every step is logged.")}</li>
    </ul></details>
  </div>);
}
