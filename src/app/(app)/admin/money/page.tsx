import Link from "next/link";
import { moneyView } from "@/server/backoffice";
import { euros } from "@/domain/rules";
import { when } from "@/components/ui";
import { PROVIDERS } from "@/config/compliance";

const ENTRY: Record<string, string> = { buyer_charge: "Charged to buyers", escrow_hold: "Held by the partner", creator_payout: "Paid to creators", payout_on_hold: "Payouts on hold", referral_payout: "Invite bonuses paid", referral_on_hold: "Invite bonuses on hold", fee_gift: "Service fees gifted", tip_charge: "Tips charged", tip_payout: "Tips paid to creators", tip_on_hold: "Tips on hold", platform_revenue: "Platform revenue", buyer_refund: "Refunded to buyers", vat_payable: "VAT due (deemed supplier)" };
const ORDER = ["buyer_charge", "escrow_hold", "creator_payout", "payout_on_hold", "platform_revenue", "vat_payable", "buyer_refund", "referral_payout", "referral_on_hold", "fee_gift", "tip_charge", "tip_payout", "tip_on_hold"];
const STATUS = ["held", "reviewing", "delivered", "disputed", "released", "refunded"];

export default async function Money() {
  const m = await moneyView();
  const by = (rows: { entry: string; cents: number; n: number }[]) => Object.fromEntries(rows.map((r) => [r.entry, r]));
  const e30 = by(m.entries30), all = by(m.entriesAll);
  const st = Object.fromEntries(m.byStatus.map((r) => [r.status, r]));
  const pay = Object.values(PROVIDERS).filter((p) => p.roles.includes("payments"));
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Money</h1><p>A mirror of the payment partner&apos;s records, built from signed events. Funds are held and paid out by the partner, never by ByRequest. Reconcile against the partner dashboard before any decision.</p></div>

    <section><h2 className="bo-sh">Deals by stage</h2>
      <dl className="bo-kpis bo-kpis-6">{STATUS.map((s) => <div key={s}><dt>{s}</dt><dd className="num">{st[s]?.n ?? 0}</dd><span>{euros(st[s]?.cents ?? 0)}</span></div>)}</dl></section>

    <section><h2 className="bo-sh">Ledger totals</h2>
      <div className="bo-table"><table><thead><tr><th>Entry</th><th className="r">Last 30 days</th><th className="r">Count</th><th className="r">All time</th></tr></thead>
        <tbody>{ORDER.map((k) => <tr key={k}><td>{ENTRY[k]}</td><td className="r num">{euros(e30[k]?.cents ?? 0)}</td><td className="r num">{e30[k]?.n ?? 0}</td><td className="r num">{euros(all[k]?.cents ?? 0)}</td></tr>)}</tbody></table></div></section>

    <section><h2 className="bo-sh">Latest entries</h2>
      <div className="bo-table"><table><thead><tr><th>When</th><th>Entry</th><th>Deal</th><th>Account</th><th className="r">Amount</th></tr></thead>
        <tbody>{m.rows.map(({ l, handle, title }) => <tr key={l.id}><td className="t-sm">{when(l.createdAt)}</td><td>{ENTRY[l.entry] ?? l.entry}</td><td className="t-sm">{title ?? "–"}</td><td>{handle && l.userId ? <Link href={`/admin/users/${l.userId}`}>{handle}</Link> : "–"}</td><td className="r num">{euros(l.cents)}</td></tr>)}</tbody></table>
        {!m.rows.length ? <p className="muted t-sm bo-empty">No entries yet.</p> : null}</div></section>

    <section><h2 className="bo-sh">Tax reporting</h2>
      <p className="t-sm muted" style={{ marginBottom: 10 }}>DAC7: once a year, by 31 January, report seller details, consideration and fees per quarter to the FOD Financiën (MyMinfin) or the Belastingdienst. VAT is due on what buyers pay, as ByRequest is treated as the supplier for VAT; confirm the OSS filing with the accountant. Downloads are admin only and logged.</p>
      <div className="optrow">{[new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => <a key={y} href={`/api/admin/dac7?year=${y}`} className="btn btn-secondary btn-sm">DAC7 working file {y}</a>)}</div></section>

    <p className="t-sm muted" style={{ marginTop: 20 }}>Payment partner{pay.length > 1 ? "s" : ""}: {pay.map((p) => `${p.label} (${p.status})`).join(", ") || "none configured"}.</p>
  </div>);
}
