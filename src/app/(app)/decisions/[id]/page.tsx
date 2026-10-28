import { getT } from "@/i18n/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { log } from "@/server/onboarding";
import { ACTION_LABEL } from "@/server/decisions";
import { I, when } from "@/components/ui";

/* Statement of reasons (DSA art. 17) with the internal complaint route (art. 20). */
export default async function DecisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { t } = await getT();
  const { id } = await params;
  const u = await requireUser();
  const d = await db.query.decisions.findFirst({ where: and(eq(schema.decisions.id, id), eq(schema.decisions.userId, u.id)) });
  if (!d) notFound();
  const appealed = await db.query.appeals.findFirst({ where: eq(schema.appeals.decisionId, d.id) });
  const sent = (await searchParams).sent;
  return (<div className="wrap"><div className="dec">
    <Link href="/inbox" className="back"><I n="left" c="sm" />{t("Inbox")}</Link>
    <span className="eyebrow">{t("Decision ·")} {when(d.createdAt)}</span>
    <h1 className="t-h1">{ACTION_LABEL[d.action] ?? "A decision about your account"}</h1>
    <dl className="dec-dl">
      <div><dt>{t("Why")}</dt><dd>{t(d.facts)}</dd></div>
      <div><dt>{t("Ground")}</dt><dd>{d.ground === "illegal_content" ? "The content is illegal" : "Our terms of use and content rules"}</dd></div>
      <div><dt>{t("What it covers")}</dt><dd>{d.scope}</dd></div>
      <div><dt>{t("How it was decided")}</dt><dd>{d.automated ? "Automatically, based on the result of a check" : "By a person on our team"}</dd></div>
    </dl>
    <h2 className="t-h3">{t("Do you disagree?")}</h2>
    {appealed || sent ? <p className="muted">{t("Your appeal was received. A person who did not take the first decision reviews it and replies in your inbox.")}</p> : (
      <form className="dec-form" action={async (f) => {
        "use server";
        const me = await requireUser();
        const msg = String(f.get("msg") ?? "").trim();
        if (msg.length < 10) redirect(`/decisions/${id}`);
        await db.insert(schema.appeals).values({ userId: me.id, area: d.action.startsWith("content") ? "content" : d.action.startsWith("creator") ? "restriction" : "account", message: msg.slice(0, 1000), decisionId: d.id });
        await log(db, `user:${me.id}`, "appeal.filed", me.id, { decisionId: d.id });
        redirect(`/decisions/${id}?sent=1`);
      }}>
        <textarea className="input" name="msg" rows={4} style={{ height: "auto", padding: 14 }} placeholder={t("Explain why you think this is wrong. Add anything we may have missed.")} required minLength={10} />
        <button className="btn btn-primary">{t("Send appeal")}</button>
      </form>)}
    <p className="t-sm muted">{t("You can also take this to an out of court dispute settlement body certified under the Digital Services Act, or to court.")}</p>
  </div></div>);
}
