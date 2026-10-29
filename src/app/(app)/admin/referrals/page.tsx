import { adminList, getConfig } from "@/server/referrals";
import { euros } from "@/domain/rules";
import { when } from "@/components/ui";
import { ReferralSettings } from "../parts";

/* The invite programme for staff: is it worth it? Per inviter and per invited person: active or
   not, deals, money moved, what ByRequest kept and what the programme cost. Plus the full trail. */
export default async function Referrals() {
  const [{ rows, inviters, events, totals, openBalances }, cfg] = await Promise.all([adminList(), getConfig()]);
  const net = totals.revenue - totals.cost;
  const roi = totals.cost ? (totals.revenue / totals.cost).toFixed(1) + "×" : "–";
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Referrals</h1><p>Invited creators earn their inviter {cfg.creatorPct}% of their net amount for {cfg.windowDays} days from their first paid deal, paid by ByRequest. Bonuses land on the inviter&apos;s bonus balance once a week; they transfer it from €10 or spend it on requests. Inviters never see who joined or what anyone earned. {cfg.buyerGift ? "Invited buyers get one free service fee, the inviter one more after the buyer's first deal." : "The buyer gift is off."}</p></div>
    <section><h2 className="bo-sh">Settings</h2><ReferralSettings cfg={cfg} /></section>
    <section><h2 className="bo-sh">Is it worth it</h2>
      <dl className="bo-kpis bo-kpis-6">
        <div><dt>Invited</dt><dd className="num">{totals.friends}</dd><span>{totals.active} made a deal</span></div>
        <div><dt>Deals by invited</dt><dd className="num">{totals.deals}</dd><span>paid out</span></div>
        <div><dt>Money moved</dt><dd className="num">{euros(totals.gmv)}</dd><span>deal value</span></div>
        <div><dt>ByRequest kept</dt><dd className="num">{euros(totals.revenue)}</dd><span>fees and share</span></div>
        <div><dt>Programme cost</dt><dd className="num">{euros(totals.cost)}</dd><span>bonuses and fee gifts</span></div>
        <div><dt>Net result</dt><dd className="num">{euros(net)}</dd><span>return {roi}</span></div>
      </dl>
      <p className="t-xs muted">Open bonus balances (not yet transferred or spent): {euros(openBalances)}.</p></section>
    <section><h2 className="bo-sh">Inviters</h2>
      <div className="bo-table"><table><thead><tr><th>Inviter</th><th className="r">Invited</th><th className="r">Active</th><th className="r">Deals</th><th className="r">Money moved</th><th className="r">Kept</th><th className="r">Cost</th><th className="r">Net</th></tr></thead>
        <tbody>{inviters.length ? inviters.map((x) => <tr key={x.referrer}><td>{x.referrer}</td><td className="r num">{x.friends}</td><td className="r num">{x.active}</td><td className="r num">{x.deals}</td><td className="r num">{euros(x.gmv)}</td><td className="r num">{euros(x.revenue)}</td><td className="r num">{euros(x.cost)}</td><td className="r num">{euros(x.revenue - x.cost)}</td></tr>)
          : <tr><td colSpan={8} className="muted">No inviters yet.</td></tr>}</tbody></table></div></section>
    <section><h2 className="bo-sh">Invited people</h2>
      <div className="bo-table"><table><thead><tr><th>Joined</th><th>Inviter</th><th>Invited</th><th>As</th><th>Code</th><th>First deal</th><th className="r">Deals</th><th className="r">Moved</th><th className="r">Kept</th><th className="r">Bonus</th></tr></thead>
        <tbody>{rows.length ? rows.map((r) => <tr key={r.id}><td>{when(r.created_at)}</td><td>{r.referrer}</td><td>{r.friend}</td><td>{r.intent === "earn" ? "creator" : "buyer"}</td><td className="num">{r.code}</td><td>{r.first_deal_at ? when(r.first_deal_at) : "–"}</td><td className="r num">{r.deals}</td><td className="r num">{euros(r.gmv)}</td><td className="r num">{euros(r.revenue)}</td><td className="r num">{euros(r.bonus)}</td></tr>)
          : <tr><td colSpan={10} className="muted">No referrals yet.</td></tr>}</tbody></table></div></section>
    <section><h2 className="bo-sh">Event trail</h2>
      <div className="bo-table"><table><thead><tr><th>When</th><th>Code</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>{events.length ? events.map((e) => <tr key={e.id}><td>{when(e.createdAt)}</td><td className="num">{e.code}</td><td>{e.event}</td><td className="t-xs bo-detail">{JSON.stringify(e.detail)}</td></tr>)
          : <tr><td colSpan={4} className="muted">Nothing yet.</td></tr>}</tbody></table></div></section>
  </div>);
}
