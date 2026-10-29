import { adminList, getConfig } from "@/server/referrals";
import { ReferralSettings } from "../parts";
import { euros } from "@/domain/rules";
import { when } from "@/components/ui";

/* The invite programme for staff: every referral, every reward and the full event trail. */
export default async function Referrals() {
  const [{ rows, events, totals }, cfg] = await Promise.all([adminList(), getConfig()]);
  const sum = (k: string, st?: string) => totals.filter((x) => x.kind === k && (!st || x.status === st)).reduce((s, x) => s + x.cents, 0);
  const count = (k: string) => totals.filter((x) => x.kind === k).reduce((s, x) => s + x.n, 0);
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Referrals</h1><p>Invited creators earn their inviter {cfg.creatorPct}% of their net amount for {cfg.windowDays} days from their first paid deal, paid by ByRequest and bundled into one payout every Monday. {cfg.buyerGift ? "Invited buyers get one free service fee, and their inviter one more after the first paid out deal." : "The buyer gift is off."} Every step below is also in the ledger and the audit log.</p></div>
    <section><h2 className="bo-sh">Settings</h2><ReferralSettings cfg={cfg} /></section>
    <section><h2 className="bo-sh">Totals</h2>
      <dl className="bo-kpis bo-kpis-6">
        <div><dt>Referrals</dt><dd className="num">{rows.length}</dd><span>{rows.filter((r) => r.r.intent === "earn").length} creators</span></div>
        <div><dt>Bonuses earned</dt><dd className="num">{euros(sum("creator_share"))}</dd><span>{count("creator_share")} deals</span></div>
        <div><dt>Paid out</dt><dd className="num">{euros(sum("creator_share", "paid"))}</dd><span>weekly, on Mondays</span></div>
        <div><dt>Waiting</dt><dd className="num">{euros(sum("creator_share", "on_hold"))}</dd><span>next Monday or payout setup</span></div>
        <div><dt>Fee gifts</dt><dd className="num">{count("free_fee")}</dd><span>to inviters</span></div>
        <div><dt>Events</dt><dd className="num">{events.length}</dd><span>latest 200</span></div>
      </dl></section>
    <section><h2 className="bo-sh">Referrals</h2>
      <div className="bo-table"><table><thead><tr><th>Joined</th><th>Inviter</th><th>Friend</th><th>Code</th><th>As</th><th>First deal</th><th>Window ends</th><th className="r">Earned</th></tr></thead>
        <tbody>{rows.length ? rows.map(({ r, referrer, friend }) => <tr key={r.id}><td>{when(r.createdAt)}</td><td>{referrer}</td><td>{friend}</td><td className="num">{r.code}</td><td>{r.intent === "earn" ? "creator" : "buyer"}</td><td>{r.firstDealAt ? when(r.firstDealAt) : r.buyerRewardedAt ? when(r.buyerRewardedAt) : "–"}</td><td>{r.windowEndsAt ? when(r.windowEndsAt) : "–"}</td><td className="r num">{euros(r.earnedCents)}</td></tr>)
          : <tr><td colSpan={8} className="muted">No referrals yet.</td></tr>}</tbody></table></div></section>
    <section><h2 className="bo-sh">Event trail</h2>
      <div className="bo-table"><table><thead><tr><th>When</th><th>Code</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>{events.length ? events.map((e) => <tr key={e.id}><td>{when(e.createdAt)}</td><td className="num">{e.code}</td><td>{e.event}</td><td className="t-xs bo-detail">{JSON.stringify(e.detail)}</td></tr>)
          : <tr><td colSpan={4} className="muted">Nothing yet.</td></tr>}</tbody></table></div></section>
  </div>);
}
