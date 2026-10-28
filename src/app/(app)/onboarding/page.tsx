import { redirect } from "next/navigation";
import { legalIn } from "@/legal/translations";
import { getT } from "@/i18n/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser, stepUpFresh } from "@/server/auth";
import * as ob from "@/server/onboarding";
import { Av, I } from "@/components/ui";
import { PAYOUT_COUNTRIES, PROVIDER_ENV, STEP_UP_MINUTES, activeProvider, FIELDS } from "@/config/compliance";
import Steps from "./steps";
import HowItWorks from "@/components/how-it-works";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string; welcome?: string }> }) {
  const { t, locale } = await getT();
  const u = await requireUser();
  if (!u.isCreator) redirect("/earn");
  const o = await ob.ensure(u.id);
  const [a, terms, privacy, agreementDoc, idCheck, appeals, fresh] = await Promise.all([
    ob.access(u.id), ob.hasCurrent(u.id, "terms"), ob.hasCurrent(u.id, "privacy"), ob.currentDoc("creator_agreement"),
    db.query.identityChecks.findFirst({ where: eq(schema.identityChecks.userId, u.id), orderBy: desc(schema.identityChecks.createdAt) }),
    db.select().from(schema.appeals).where(eq(schema.appeals.userId, u.id)).orderBy(desc(schema.appeals.createdAt)).limit(3),
    stepUpFresh(STEP_UP_MINUTES),
  ]);
  const accountDone = terms && privacy;
  const order = ["account", "identity", "payouts", "agreement", "done"] as const;
  const want = (await searchParams).step;
  const first = !accountDone ? "account" : a.areas.identity !== "approved" ? "identity" : a.areas.payout !== "approved" ? "payouts" : a.areas.agreement !== "approved" ? "agreement" : "done";
  const step = order.includes(want as "account") ? (want as (typeof order)[number]) : o.lastStep === "done" ? first : first;
  const idProvider = activeProvider("identity"), payProvider = activeProvider("payout");

  return (<div className="wrap"><div className="ob">
    <Link href="/" className="back"><I n="left" c="sm" />{t("Continue later")}</Link>
    {(await searchParams).welcome ? <><div className="banner ok"><I n="check" /><div className="grow"><b>{t("Welcome, {name}.", { name: u.handle })}</b><div className="t-sm">{t("Three short steps and you can make your first offer. Your progress is saved after every step.")}</div></div></div><HowItWorks hidden variant="earn" autoOpen /></> : null}
    <h1 className="t-h1">{t("Become a creator")}</h1>
    <p className="muted" style={{ marginTop: 6 }}>{t("Verify once. Keep your profile private. Your progress is saved after every step.")}</p>
    <Steps
      step={step}
      handle={u.handle}
      avatar={<Av a={u.avatar} name={u.handle} size={56} />}
      account={{ done: !!accountDone, terms, privacy }}
      identity={{ status: a.areas.identity, provider: idProvider?.label ?? null, env: idCheck?.env ?? null, reason: idCheck?.reason ?? null }}
      payout={{ status: a.areas.payout, provider: payProvider?.label ?? null, env: a.payout?.env ?? null, missing: a.payout?.missing ?? [], actionUrl: a.payout?.actionUrl ?? null, canReceive: a.payout?.canReceivePayouts ?? false, accountType: o.accountType, country: o.country, identityOk: a.areas.identity === "approved", stepUpFresh: fresh }}
      agreement={agreementDoc ? { status: a.areas.agreement, id: agreementDoc.id, sha: agreementDoc.sha256, version: agreementDoc.version, title: legalIn(locale, "creator_agreement", agreementDoc.version)?.title ?? agreementDoc.title, summary: legalIn(locale, "creator_agreement", agreementDoc.version)?.summary ?? agreementDoc.summary, draft: agreementDoc.status !== "approved" } : null}
      overview={{ status: a.status, missing: a.missing, areas: a.areas, testOnly: [idCheck?.env, a.payout?.env].includes("test") }}
      countries={PAYOUT_COUNTRIES}
      fieldInfo={FIELDS}
      appeals={appeals.map((x) => ({ area: x.area, status: x.status, answer: x.answer }))}
    />
  </div></div>);
}
