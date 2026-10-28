import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PROVIDER_ENV } from "@/config/compliance";
import { getT } from "@/i18n/server";
import { payoutOutcome } from "../../actions";

export default async function SandboxPayout({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ mode?: string }> }) {
  if (PROVIDER_ENV !== "test") notFound();
  const { ref } = await params;
  const mode = (await searchParams).mode;
  const { t } = await getT();
  const acc = await db.query.payoutAccounts.findFirst({ where: eq(schema.payoutAccounts.externalRef, ref) });
  if (!acc) notFound();
  const btn = (o: string, l: string, primary = false) => <button name="outcome" value={o} className={"btn btn-block " + (primary ? "btn-primary" : "btn-secondary")}>{l}</button>;
  return (<div className="sbx"><form className="card" action={async (f) => { "use server"; await payoutOutcome(ref, String(f.get("outcome")) as "approved", f.get("twice") === "on"); }}>
    <h1 className="t-h2">{t(mode === "link" ? "Link your payout account" : "Payout account review")}</h1>
    <p className="t-sm muted">{t("Choose the result for your payout account. ByRequest receives it right away.")}</p>
    {btn("approved", t("Approve: beneficiary verified, payouts and sales enabled"), true)}
    {btn("no_payouts", t("Approve the account, but keep payouts disabled"))}
    {btn("needs_tax", t("Ask for a tax identification number"))}
    {btn("rejected", t("Reject: account holder does not match"))}
    <p className="t-xs muted">{acc.accountType} · {acc.country} · {t("Reference")} {ref}</p>
  </form></div>);
}
