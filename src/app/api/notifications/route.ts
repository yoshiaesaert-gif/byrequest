import { and, desc, eq, isNull, or, like } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { TEAM_HREF } from "@/server/queries";

/* Only answers from support belong in the help chat. Other messages from the team (news, a personal note) stay in the inbox only,
   and opening the help chat never marks those as read. */
const N = schema.notifications;
const SUPPORT = or(like(N.title, "%ByRequest support"), eq(N.title, "About your report"));

export async function GET(req: Request) {
  const u = await currentUser();
  // ?team=1: how many messages from the ByRequest team are unread (the dot on the help button).
  if (new URL(req.url).searchParams.get("team") && u) {
    // The last answers from the team as well, so the help chat shows them where the question was asked.
    const rows = await db.select({ id: schema.notifications.id, title: schema.notifications.title, body: schema.notifications.body, at: schema.notifications.createdAt, readAt: schema.notifications.readAt })
      .from(schema.notifications).where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.href, TEAM_HREF), SUPPORT)).orderBy(desc(schema.notifications.createdAt)).limit(5);
    return Response.json({ team: rows.filter((r) => !r.readAt).length, msgs: rows.reverse().map((r) => ({ id: r.id, who: r.title, text: r.body, at: r.at, unread: !r.readAt })) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!u) return Response.json({ latest: null }, { status: 401 });
  const [latest] = await db.select({ id: schema.notifications.id, title: schema.notifications.title, body: schema.notifications.body, href: schema.notifications.href })
    .from(schema.notifications).where(and(eq(schema.notifications.userId, u.id), isNull(schema.notifications.readAt))).orderBy(desc(schema.notifications.createdAt)).limit(1);
  return Response.json({ latest: latest ?? null }, { headers: { "Cache-Control": "no-store" } });
}

/* The help chat was opened with the team's answers in view: they count as read. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ ok: false }, { status: 401 });
  if (new URL(req.url).searchParams.get("team") === "read")
    await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.href, TEAM_HREF), SUPPORT, isNull(schema.notifications.readAt)));
  return Response.json({ ok: true });
}
