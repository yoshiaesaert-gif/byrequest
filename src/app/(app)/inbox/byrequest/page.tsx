import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/db";
import { TEAM_HREF } from "@/server/queries";
import { TeamTimes } from "../lists";

/* Messages from ByRequest itself: news and tips, shown as a conversation with the team. */
export default async function FromByRequest() {
  const { t } = await getT();
  const u = await requireUser();
  const N = schema.notifications;
  const msgs = await db.select().from(N).where(and(eq(N.userId, u.id), eq(N.href, TEAM_HREF))).orderBy(asc(N.createdAt)).limit(60);
  await db.update(N).set({ readAt: new Date() }).where(and(eq(N.userId, u.id), eq(N.href, TEAM_HREF), isNull(N.readAt)));
  return (<div className="wrap team-chat">
    <Link href="/inbox" className="bt-back"><svg className="ico" aria-hidden="true"><use href="#i-left" /></svg>{t("Inbox")}</Link>
    <div className="card bt">
      <div className="bt-h"><img src="/apple-icon.png" alt="" width={48} height={48} /><div><b>ByRequest</b><span>{t("The team behind ByRequest")}</span></div></div>
      <div className="bt-msgs">
        {msgs.length ? <TeamTimes msgs={msgs.map((m) => ({ id: m.id, title: t(m.title), body: t(m.body), at: m.createdAt.toISOString() }))} /> : <p className="t-sm muted">{t("No messages yet")}</p>}
      </div>
      <p className="bt-f">{t("Questions? Mail support@byrequest.me, we answer within a day.")}</p>
    </div>
  </div>);
}
