/* Keeps the site honest now that the ByRequest team requests carry the board. Runs at every start.
   1. Old demo requests from fictional buyers are closed and their offers removed, so every open
      request on the board is either a real person's or a labelled team request.
   2. Creator ratings and deal counts are recomputed from finished deals with a real rating, so no
      profile shows numbers that did not happen.
   The demo sign in accounts stay for testing. Before launch the demo accounts are removed. */
import "dotenv/config";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema as S } from "../src/db";

async function main() {
  const demo = await db.select({ id: S.users.id }).from(S.users).where(like(S.users.email, "%@demo.byrequest.app"));
  const ids = demo.map((d) => d.id);
  let closed = 0, removedOffers = 0;
  // In the demo the demo accounts are the point: keep their requests and offers (see demo-life.ts).
  const demoMode = process.env.BRQ_PROVIDER_ENV !== "live" && process.env.BRQ_DEMO !== "0";
  if (ids.length && !demoMode) {
    const reqs = await db.select({ id: S.requests.id }).from(S.requests).where(and(inArray(S.requests.buyerId, ids), eq(S.requests.status, "open")));
    if (reqs.length) {
      const rid = reqs.map((r) => r.id);
      removedOffers = (await db.delete(S.offers).where(and(inArray(S.offers.requestId, rid), eq(S.offers.status, "pending"))).returning({ id: S.offers.id })).length;
      closed = (await db.update(S.requests).set({ status: "closed" }).where(inArray(S.requests.id, rid)).returning({ id: S.requests.id })).length;
    }
    // Demo creators do not offer on team requests: only real creators should.
    removedOffers += (await db.delete(S.offers).where(and(inArray(S.offers.creatorId, ids), eq(S.offers.status, "pending"), sql`${S.offers.requestId} in (select r.id from requests r join users u on u.id = r.buyer_id where u.house)`)).returning({ id: S.offers.id })).length;
  }
  // In the demo, keyboard mash titles (six letters or more and not one vowel) are taken offline.
  let junk = 0;
  if (demoMode) {
    const bad = await db.select({ id: S.requests.id }).from(S.requests).where(and(eq(S.requests.status, "open"), sql`${S.requests.title} !~* '[aeiouy]' and length(regexp_replace(${S.requests.title}, '[^a-z]', '', 'gi')) >= 6`));
    if (bad.length) {
      const rid = bad.map((r) => r.id);
      await db.update(S.offers).set({ status: "declined" }).where(and(inArray(S.offers.requestId, rid), eq(S.offers.status, "pending")));
      junk = (await db.update(S.requests).set({ status: "closed" }).where(inArray(S.requests.id, rid)).returning({ id: S.requests.id })).length;
    }
  }
  await db.execute(sql`update users u set rating_sum = coalesce(x.s, 0), rating_count = coalesce(x.n, 0)
    from (select c.id, sum(d.buyer_rating)::int s, count(d.buyer_rating)::int n from users c left join deals d on d.creator_id = c.id group by c.id) x
    where x.id = u.id and (u.rating_sum <> coalesce(x.s, 0) or u.rating_count <> coalesce(x.n, 0))`);
  await db.execute(sql`update users u set buyer_rating_sum = coalesce(x.s, 0), buyer_rating_count = coalesce(x.n, 0)
    from (select b.id, sum(d.creator_rating)::int s, count(d.creator_rating)::int n from users b left join deals d on d.buyer_id = b.id group by b.id) x
    where x.id = u.id and (u.buyer_rating_sum <> coalesce(x.s, 0) or u.buyer_rating_count <> coalesce(x.n, 0))`);
  console.log(`Clean demo: ${closed} old demo requests closed, ${junk} junk requests offline, ${removedOffers} demo offers removed, ratings recomputed from real deals.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
