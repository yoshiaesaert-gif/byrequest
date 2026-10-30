import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/db";
import { TEAM_HREF } from "@/server/queries";
import { ChatShell, SideCard } from "@/components/chat-shell";
import ChatPane, { type PaneMsg } from "@/components/chat-pane";

export const dynamic = "force-dynamic";

/* Messages from ByRequest itself, in the same window as every other conversation. */
export default async function FromByRequest() {
  const { t } = await getT();
  const u = await requireUser();
  const N = schema.notifications;
  const rows = await db.select().from(N).where(and(eq(N.userId, u.id), eq(N.href, TEAM_HREF))).orderBy(asc(N.createdAt)).limit(60);
  await db.update(N).set({ readAt: new Date() }).where(and(eq(N.userId, u.id), eq(N.href, TEAM_HREF), isNull(N.readAt)));
  const msgs: PaneMsg[] = rows.map((m) => ({ id: m.id, kind: "e2e", mine: false, title: t(m.title), text: t(m.body), nonce: null, body: "", at: m.createdAt.toISOString(), read: true }));
  const logo = <img src="/apple-icon.png" alt="" width={52} height={52} style={{ borderRadius: "50%", width: "100%", height: "100%", objectFit: "cover" }} />;
  return (<ChatShell back="/inbox" backLabel={t("Inbox")} eyebrow={t("The team behind ByRequest")} title="ByRequest" avatar={logo}
    chat={<ChatPane name="ByRequest" meId={u.id} avatar={logo} initial={{ v: "static", status: null, typing: false, otherKey: null, closed: false, msgs }} e2e={false} readOnly fromInbox empty={t("No messages yet")} lock={t("Official messages")} />}
    side={<>
      <SideCard title={t("Need help?")}>
        <p className="t-sm" style={{ margin: 0 }}>{t("Questions? Mail support@byrequest.me, we answer within a day.")}</p>
        <div className="sh-btns"><Link href="/help" className="btn btn-secondary">{t("Help centre")}</Link><a href="mailto:support@byrequest.me" className="btn btn-secondary">support@byrequest.me</a></div>
      </SideCard>
      <SideCard><div className="sh-links"><Link href="/report">{t("Report a problem")}</Link><Link href="/settings">{t("Privacy settings")}</Link><Link href="/legal/contact">{t("Point of contact")}</Link></div></SideCard>
    </>} />);
}
