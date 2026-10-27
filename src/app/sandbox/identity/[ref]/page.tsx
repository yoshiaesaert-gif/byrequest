import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PROVIDER_ENV } from "@/config/compliance";
import { identityOutcome } from "../../actions";

export default async function SandboxIdentity({ params }: { params: Promise<{ ref: string }> }) {
  if (PROVIDER_ENV !== "test") notFound();
  const { ref } = await params;
  const chk = await db.query.identityChecks.findFirst({ where: eq(schema.identityChecks.externalRef, ref) });
  if (!chk) notFound();
  const btn = (o: string, l: string, primary = false) => (
    <button name="outcome" value={o} className={"btn btn-block " + (primary ? "btn-primary" : "btn-secondary")}>{l}</button>);
  return (<div className="sbx"><form className="card" action={async (f) => { "use server"; await identityOutcome(ref, String(f.get("outcome")) as "adult", String(f.get("name") ?? ""), f.get("twice") === "on"); }}>
    <span className="tag">Test provider · simulated</span>
    <h1 className="t-h2">Identity verification</h1>
    <p className="t-sm muted">This page stands in for a real verification provider. It does not check any document. Choose the outcome to simulate; a signed webhook is sent to ByRequest.</p>
    <div className="field"><label htmlFor="name">Legal name returned by the provider</label><input id="name" name="name" className="input" defaultValue="Alex Example" /></div>
    {btn("adult", "Approve: document, selfie and age 18+ confirmed", true)}
    {btn("minor", "Document valid, but the person is under 18")}
    {btn("resubmit", "Ask for another try")}
    {btn("declined", "Decline")}
    {btn("expired", "Expire the session")}
    <label className="check"><input type="checkbox" name="twice" /> <span>Also deliver the same event twice (duplicate webhook test)</span></label>
    <p className="t-xs muted">Reference {ref}</p>
  </form></div>);
}
