import Link from "next/link";
import { and, eq, inArray, or } from "drizzle-orm";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/db";
import { balance } from "@/server/referrals";
import { I } from "@/components/ui";
import { euros } from "@/domain/rules";
import DeleteFlow from "./flow";

/* Deleting an account is deliberately a few careful steps: what you lose, then your username and a
   code from your email, then one last button. Open deals must finish first. */
export default async function DeletePage() {
  const u = await requireUser();
  const { t } = await getT();
  const [open] = await db.select({ id: schema.deals.id }).from(schema.deals).where(and(or(eq(schema.deals.buyerId, u.id), eq(schema.deals.creatorId, u.id)), inArray(schema.deals.status, ["held", "reviewing", "delivered", "disputed"]))).limit(1);
  const bal = await balance(u.id);
  return (<div className="wrap del">
    <Link href="/settings" className="back"><I n="left" c="sm" />{t("Profile and privacy")}</Link>
    <h1 className="t-h1">{t("Delete your account")}</h1>
    {open ? <div className="banner warn"><I n="alert" /><div className="grow"><b>{t("You still have an open deal")}</b><div className="t-sm">{t("Finish or cancel your open deals first, so nobody loses money. Then you can delete your account.")}</div></div><Link href="/deals" className="btn btn-secondary btn-sm">{t("Open deals")}</Link></div>
      : <DeleteFlow handle={u.handle} balance={bal ? euros(bal) : null} />}
  </div>);
}
