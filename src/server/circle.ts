import "server-only";
import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import { blockedEither } from "./blocks";

const S = schema;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/* Inner Circle: creators a buyer was happy with. They can get personal requests, and when the buyer
   posts on the board they see it first, for HEAD_START hours, before everyone else. */
export const HEAD_START = 3;
export const CIRCLE_MAX = 25;

/* Only who you worked with: a delivered or paid out deal. */
export async function workedWith(buyerId: string, creatorId: string) {
  const [r] = await db.select({ n: count() }).from(S.deals).where(and(eq(S.deals.buyerId, buyerId), eq(S.deals.creatorId, creatorId), inArray(S.deals.status, ["delivered", "released"])));
  return r.n > 0;
}
export async function inCircle(buyerId: string, creatorId: string) {
  return !!(await db.query.circle.findFirst({ where: and(eq(S.circle.buyerId, buyerId), eq(S.circle.creatorId, creatorId)) }));
}
export async function circleSize(buyerId: string) {
  const [r] = await db.select({ n: count() }).from(S.circle).where(eq(S.circle.buyerId, buyerId));
  return r.n;
}
/* How many buyers keep this creator in their Inner Circle: shown on the profile, never who. */
export async function circleFans(creatorId: string) {
  const [r] = await db.select({ n: count() }).from(S.circle).where(eq(S.circle.creatorId, creatorId));
  return r.n;
}
export async function setCircle(buyerId: string, creatorId: string, on: boolean) {
  if (!on) { await db.delete(S.circle).where(and(eq(S.circle.buyerId, buyerId), eq(S.circle.creatorId, creatorId))); return; }
  if (!(await workedWith(buyerId, creatorId))) throw new RuleError("You can add a creator once they delivered a request for you.");
  if ((await circleSize(buyerId)) >= CIRCLE_MAX) throw new RuleError("Your Inner Circle is full. Remove someone first.");
  await db.insert(S.circle).values({ buyerId, creatorId }).onConflictDoNothing();
  await db.insert(S.notifications).values({ userId: creatorId, title: "You are in someone's Inner Circle", body: "A buyer you worked for added you. You now see their new requests first, and they can send you personal requests.", href: "/" });
}

/* A personal request goes to one creator: their profile is open, or they are in your Inner Circle. */
export async function canSendPersonal(buyerId: string, creatorId: string) {
  if (buyerId === creatorId || (await blockedEither(buyerId, creatorId))) return false;
  const [p, c] = await Promise.all([db.query.creatorProfiles.findFirst({ where: eq(S.creatorProfiles.userId, creatorId), columns: { visibility: true } }), inCircle(buyerId, creatorId)]);
  return !!p && (p.visibility === "public" || c || (await workedWith(buyerId, creatorId)));
}

/* Which requests a viewer may see: personal ones only by their creator, head starts only by the circle. */
export function seenBy(viewerId?: string): SQL {
  if (!viewerId) return sql`(${S.requests.forCreatorId} is null and (${S.requests.circleUntil} is null or ${S.requests.circleUntil} < now()))`;
  return sql`((${S.requests.forCreatorId} is null or ${S.requests.forCreatorId} = ${viewerId} or ${S.requests.buyerId} = ${viewerId})
    and (${S.requests.circleUntil} is null or ${S.requests.circleUntil} < now() or ${S.requests.buyerId} = ${viewerId}
      or exists (select 1 from circle c where c.buyer_id = ${S.requests.buyerId} and c.creator_id = ${viewerId})))`;
}
export function mayView(r: { buyerId: string; forCreatorId: string | null; circleUntil: Date | null }, viewerId: string, isCircle: boolean) {
  if (r.buyerId === viewerId) return true;
  if (r.forCreatorId) return r.forCreatorId === viewerId;
  return !r.circleUntil || r.circleUntil < new Date() || isCircle;
}

/* When a request goes live: start the head start and tell the right creators. */
export async function onLive(tx: Tx, r: { id: string; buyerId: string; forCreatorId: string | null; circleFirst: boolean }) {
  if (r.forCreatorId) {
    await tx.insert(S.notifications).values({ userId: r.forCreatorId, title: "A personal request for you", body: "A buyer sent a request to you only. Nobody else sees it.", href: `/requests/${r.id}` });
    return;
  }
  if (!r.circleFirst) return;
  const fans = await tx.select({ id: S.circle.creatorId }).from(S.circle).where(eq(S.circle.buyerId, r.buyerId));
  if (!fans.length) return;
  await tx.update(S.requests).set({ circleUntil: new Date(Date.now() + HEAD_START * 3_600_000) }).where(eq(S.requests.id, r.id));
  await tx.insert(S.notifications).values(fans.map((f) => ({ userId: f.id, title: "First pick for you", body: `A buyer from your Inner Circle posted a new request. For ${HEAD_START} hours only you and their other favourites see it.`, href: `/requests/${r.id}` })));
}
