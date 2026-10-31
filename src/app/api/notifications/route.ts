import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { TEAM_HREF } from "@/server/queries";

export async function GET(req: Request) {
  const u = await currentUser();
  // ?team=1: how many messages from the ByRequest team are unread (the dot on the help button).
  if (new URL(req.url).searchParams.get("team") && u) {
    const rows = await db.select({ id: schema.notifications.id }).from(schema.notifications).where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.href, TEAM_HREF), isNull(schema.notifications.readAt)));
    return Response.json({ team: rows.length }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!u) return Response.json({ latest: null }, { status: 401 });
  const [latest] = await db.select({ id: schema.notifications.id, title: schema.notifications.title, body: schema.notifications.body, href: schema.notifications.href })
    .from(schema.notifications).where(and(eq(schema.notifications.userId, u.id), isNull(schema.notifications.readAt))).orderBy(desc(schema.notifications.createdAt)).limit(1);
  return Response.json({ latest: latest ?? null }, { headers: { "Cache-Control": "no-store" } });
}
