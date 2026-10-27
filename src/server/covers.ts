import "server-only";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { chooseFor } from "@/domain/covers";

/* Looks at the whole open board and the latest posts, then picks the cover for a new request. */
export async function chooseCover(category: string, title: string) {
  const open = await db.select({ cover: schema.requests.cover }).from(schema.requests)
    .where(and(eq(schema.requests.status, "open"), gt(schema.requests.closesAt, new Date())));
  const usage: Record<string, number> = {};
  for (const r of open) if (r.cover) usage[r.cover] = (usage[r.cover] ?? 0) + 1;
  const recent = (await db.select({ cover: schema.requests.cover }).from(schema.requests).orderBy(desc(schema.requests.createdAt)).limit(4)).map((r) => r.cover ?? "");
  return chooseFor(category, title, usage, recent);
}
