/* Redistributes covers of open requests so the board repeats as little as possible.
   Neutral cards chosen by a buyer (g-<tint>) stay neutral. Older requests from before covers existed
   (no cover at all) get a mood photo, so lists never show empty black tiles. Safe to run at every start. */
import "dotenv/config";
import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "../src/db";
import { chooseFor } from "../src/domain/covers";

async function main() {
  const rows = await db.select().from(schema.requests)
    .where(and(eq(schema.requests.status, "open"), gt(schema.requests.closesAt, new Date()), isNotNull(schema.requests.cover))).orderBy(asc(schema.requests.createdAt));
  const usage: Record<string, number> = {}; const recent: string[] = []; let changed = 0;
  for (const r of rows) {
    const c = chooseFor(r.category, r.title, usage, recent.slice(-3), () => 0);
    usage[c] = (usage[c] ?? 0) + 1; recent.push(c);
    if (c !== r.cover) { await db.update(schema.requests).set({ cover: c }).where(eq(schema.requests.id, r.id)); changed++; }
  }
  const bare = await db.select().from(schema.requests).where(isNull(schema.requests.cover)).orderBy(asc(schema.requests.createdAt));
  for (const r of bare) {
    const c = chooseFor(r.category, r.title, usage, recent.slice(-3), () => 0);
    usage[c] = (usage[c] ?? 0) + 1; recent.push(c);
    await db.update(schema.requests).set({ cover: c }).where(eq(schema.requests.id, r.id));
  }
  console.log(`Covers rebalanced: ${changed} of ${rows.length} open requests changed, ${bare.length} older requests got a cover.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
