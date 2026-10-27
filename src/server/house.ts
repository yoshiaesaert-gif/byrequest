import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { acceptOffer, rate } from "./deals";
import { log } from "./onboarding";
import { RuleError } from "@/domain/rules";

/* ByRequest team requests: staff accept offers and rate finished deals on behalf of the team
   profiles, within a total budget set in the back office. Every step is logged. */
const S = schema;
const KEY = "house_budget_cents";
const LIVE = ["held", "reviewing", "delivered", "disputed", "released"] as const;

export async function houseBudget() {
  const row = await db.query.settings.findFirst({ where: eq(S.settings.key, KEY) });
  const budget = typeof row?.value === "number" ? row.value : 300_000;
  const [spent] = await db.select({ c: sql<number>`coalesce(sum(${S.deals.dealCents}), 0)::int` }).from(S.deals)
    .innerJoin(S.users, eq(S.users.id, S.deals.buyerId)).where(and(eq(S.users.house, true), inArray(S.deals.status, [...LIVE])));
  return { budget, spent: spent.c, left: budget - spent.c };
}

export async function setHouseBudget(staffId: string, euros: number) {
  if (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000) throw new RuleError("Enter an amount in euros.");
  const cents = Math.round(euros * 100);
  await db.insert(S.settings).values({ key: KEY, value: cents }).onConflictDoUpdate({ target: S.settings.key, set: { value: cents, updatedAt: new Date() } });
  await log(db, `staff:${staffId}`, "house.budget_set", null, { cents });
}

export async function houseOverview() {
  const reqs = await db.select({ r: S.requests, handle: S.users.handle }).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId))
    .where(eq(S.users.house, true)).orderBy(desc(S.requests.createdAt)).limit(120);
  const ids = reqs.map((x) => x.r.id);
  const offers = ids.length ? await db.select({ o: S.offers, handle: S.users.handle, ratingSum: S.users.ratingSum, ratingCount: S.users.ratingCount }).from(S.offers)
    .innerJoin(S.users, eq(S.users.id, S.offers.creatorId)).where(and(inArray(S.offers.requestId, ids), sql`${S.offers.status} <> 'withdrawn'`)) : [];
  const deals = ids.length ? await db.select({ d: S.deals, creator: S.users.handle }).from(S.deals).innerJoin(S.users, eq(S.users.id, S.deals.creatorId)).where(inArray(S.deals.requestId, ids)) : [];
  return reqs.map((x) => ({ ...x, offers: offers.filter((o) => o.o.requestId === x.r.id), deal: deals.find((d) => d.d.requestId === x.r.id) ?? null }));
}

export async function houseAccept(staffId: string, offerId: string) {
  const o = await db.query.offers.findFirst({ where: eq(S.offers.id, offerId) });
  const r = o ? await db.query.requests.findFirst({ where: eq(S.requests.id, o.requestId) }) : null;
  const buyer = r ? await db.query.users.findFirst({ where: eq(S.users.id, r.buyerId) }) : null;
  if (!o || !r || !buyer?.house) throw new RuleError("Not a team request.");
  const b = await houseBudget();
  if (r.dealCents > b.left) throw new RuleError(`Over budget: €${Math.round(b.left / 100)} left. Raise the budget first.`);
  // The team is not a consumer, but the deal is created the same way as any other.
  const d = await acceptOffer(buyer.id, offerId, { withdrawalWaiver: true });
  await log(db, `staff:${staffId}`, "house.offer_accepted", o.creatorId, { dealId: d.id, requestId: r.id, cents: r.dealCents });
  return d.id;
}

export async function houseRate(staffId: string, dealId: string, stars: number) {
  const d = await db.query.deals.findFirst({ where: eq(S.deals.id, dealId) });
  const buyer = d ? await db.query.users.findFirst({ where: eq(S.users.id, d.buyerId) }) : null;
  if (!d || !buyer?.house) throw new RuleError("Not a team deal.");
  await rate(buyer.id, dealId, stars);       // only after a released deal, once, like any buyer
  await log(db, `staff:${staffId}`, "house.rated", d.creatorId, { dealId, stars });
}
