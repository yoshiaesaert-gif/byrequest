import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PROVIDER_ENV } from "@/config/compliance";
import { getT } from "@/i18n/server";
import { identityOutcome } from "../../actions";

export default async function SandboxIdentity({ params }: { params: Promise<{ ref: string }> }) {
  if (PROVIDER_ENV !== "test") notFound();
  const { ref } = await params;
  const { t } = await getT();
  const chk = await db.query.identityChecks.findFirst({ where: eq(schema.identityChecks.externalRef, ref) });
  if (!chk) notFound();
  const btn = (o: string, l: string, primary = false) => (
    <button name="outcome" value={o} className={"btn btn-block " + (primary ? "btn-primary" : "btn-secondary")}>{l}</button>);
  return (<div className="sbx"><form className="card" action={async (f) => { "use server"; await identityOutcome(ref, String(f.get("outcome")) as "adult", String(f.get("name") ?? ""), f.get("twice") === "on"); }}>
    <h1 className="t-h2">{t("Identity verification")}</h1>
    <p className="t-sm muted">{t("Choose the result of your verification. ByRequest receives it right away.")}</p>
    <div className="field"><label htmlFor="name">{t("Your legal name")}</label><input id="name" name="name" className="input" defaultValue="" /></div>
    {btn("adult", t("Approve: document, selfie and age 18+ confirmed"), true)}
    {btn("minor", t("Document valid, but the person is under 18"))}
    {btn("resubmit", t("Ask for another try"))}
    {btn("declined", t("Decline"))}
    {btn("expired", t("Expire the session"))}
    <p className="t-xs muted">{t("Reference")} {ref}</p>
  </form></div>);
}
