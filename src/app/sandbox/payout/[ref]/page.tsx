import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PROVIDER_ENV } from "@/config/compliance";
import { payoutOutcome } from "../../actions";

export default async function SandboxPayout({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ mode?: string }> }) {
  if (PROVIDER_ENV !== "test") notFound();
  const { ref } = await params;
  const mode = (await searchParams).mode;
  const acc = await db.query.payoutAccounts.findFirst({ where: eq(schema.payoutAccounts.externalRef, ref) });
  if (!acc) notFound();
  const btn = (o: string, l: string, primary = false) => <button name="outcome" value={o} className={"btn btn-block " + (primary ? "btn-primary" : "btn-secondary")}>{l}</button>;
  return (<div className="sbx"><form className="card" action={async (f) => { "use server"; await payoutOutcome(ref, String(f.get("outcome")) as "approved", f.get("twice") === "on"); }}>
    <span className="tag">Test provider · simulated</span>
    <h1 className="t-h2">{mode === "link" ? "Link your payout account" : "Payout account review"}</h1>
    <p className="t-sm muted">This page stands in for the payment provider’s own onboarding. Choose the result to simulate; a signed webhook is sent to ByRequest.</p>
    {btn("approved", "Approve: beneficiary verified, payouts and sales enabled", true)}
    {btn("no_payouts", "Approve the account, but keep payouts disabled")}
    {btn("needs_tax", "Ask for a tax identification number")}
    {btn("rejected", "Reject: account holder does not match")}
    <label className="check"><input type="checkbox" name="twice" /> <span>Also deliver the same event twice (duplicate webhook test)</span></label>
    <p className="t-xs muted">{acc.accountType} · {acc.country} · reference {ref}</p>
  </form></div>);
}
