import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";

export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ latest: null }, { status: 401 });
  const [latest] = await db.select({ id: schema.notifications.id, title: schema.notifications.title, body: schema.notifications.body, href: schema.notifications.href })
    .from(schema.notifications).where(eq(schema.notifications.userId, u.id)).orderBy(desc(schema.notifications.createdAt)).limit(1);
  return Response.json({ latest: latest ?? null }, { headers: { "Cache-Control": "no-store" } });
}
