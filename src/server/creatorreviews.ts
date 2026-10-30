import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";

const { creatorReviews: R, users, deals } = schema;

/* Only creators who were really paid can leave a review: at least one released deal. */
export async function canReview(userId: string) {
  const [d] = await db.select({ n: sql<number>`count(*)::int` }).from(deals).where(and(eq(deals.creatorId, userId), eq(deals.status, "released")));
  return d.n > 0;
}
export async function myReview(userId: string) { return db.query.creatorReviews.findFirst({ where: eq(R.userId, userId) }) ?? null; }

export async function saveReview(userId: string, input: { stars: number; quote: string; mayPublish: boolean }) {
  if (!(await canReview(userId))) throw new RuleError("Reviews open after your first paid deal.");
  const stars = Math.round(input.stars);
  if (stars < 1 || stars > 5) throw new RuleError("Choose 1 to 5 stars.");
  const quote = input.quote.replace(/\s+/g, " ").trim().slice(0, 160);
  const v = { stars, quote, mayPublish: input.mayPublish, status: "pending" as const, createdAt: new Date(), decidedAt: null };
  await db.insert(R).values({ userId, ...v }).onConflictDoUpdate({ target: R.userId, set: v });
}

export async function reviewsForStaff() {
  return db.select({ r: R, handle: users.handle }).from(R).innerJoin(users, eq(users.id, R.userId)).orderBy(desc(R.createdAt)).limit(300);
}
export async function decideReview(id: string, status: "approved" | "hidden") {
  await db.update(R).set({ status, decidedAt: new Date() }).where(eq(R.id, id));
}

/* For the public creator page: approved quotes that may be shown, and the real average of every review. */
export async function publicReviews() {
  const [quotes, [avg]] = await Promise.all([
    db.select({ handle: users.handle, stars: R.stars, quote: R.quote }).from(R).innerJoin(users, eq(users.id, R.userId))
      .where(and(eq(R.status, "approved"), eq(R.mayPublish, true), sql`length(${R.quote}) >= 10`)).orderBy(desc(R.stars), desc(R.decidedAt)).limit(30),
    db.select({ avg: sql<number>`coalesce(avg(${R.stars}),0)::float`, n: sql<number>`count(*)::int` }).from(R).where(sql`${R.status} <> 'hidden'`),
  ]);
  return { quotes, avg: avg.avg, n: avg.n };
}
