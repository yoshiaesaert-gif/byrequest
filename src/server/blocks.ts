import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import { log } from "./onboarding";

const { blocks, offers, requests, users, previewAlbums } = schema;

/* Blocking works both ways once one person blocks the other: no applications, no new deals, no chat,
   no profile, and their requests disappear from each other's board. It is silent: the other person
   is never told. A deal already running keeps its protection (delivery, review, refund); only the
   chat stops. Every block and unblock is written to the audit log. */

export async function blockedEither(a: string, b: string) {
  if (a === b) return false;
  const row = await db.query.blocks.findFirst({ where: or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))), columns: { blockerId: true } });
  return !!row;
}

/* Everyone a person must not meet: those they blocked and those who blocked them. */
export async function blockedSet(userId: string) {
  const rows = await db.select({ a: blocks.blockerId, b: blocks.blockedId }).from(blocks).where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
  return new Set(rows.map((r) => (r.a === userId ? r.b : r.a)));
}

export async function iBlocked(userId: string, otherId: string) {
  return !!(await db.query.blocks.findFirst({ where: and(eq(blocks.blockerId, userId), eq(blocks.blockedId, otherId)), columns: { blockerId: true } }));
}

/* A buyer stays anonymous on the board, so a creator blocks the person behind a request by its id. */
export async function blockTarget(userId: string, target: { handle: string } | { requestId: string }) {
  if ("handle" in target) return block(userId, target.handle);
  const r = await db.query.requests.findFirst({ where: eq(requests.id, target.requestId), columns: { buyerId: true } });
  const u = r && await db.query.users.findFirst({ where: eq(users.id, r.buyerId), columns: { handle: true } });
  if (!u) throw new RuleError("This account cannot be blocked.");
  return block(userId, u.handle, true);
}

export async function block(userId: string, handle: string, anonymous = false) {
  const other = await db.query.users.findFirst({ where: eq(users.handle, handle), columns: { id: true, house: true } });
  if (!other || other.id === userId) throw new RuleError("This account cannot be blocked.");
  await db.transaction(async (tx) => {
    await tx.insert(blocks).values({ blockerId: userId, blockedId: other.id, anonymous }).onConflictDoNothing();
    // Open applications between the two are withdrawn, in both directions, with their preview requests.
    const mine = await tx.select({ id: requests.id }).from(requests).where(eq(requests.buyerId, userId));
    const theirs = await tx.select({ id: requests.id }).from(requests).where(eq(requests.buyerId, other.id));
    const pairs = [
      mine.length ? and(eq(offers.creatorId, other.id), inArray(offers.requestId, mine.map((r) => r.id))) : undefined,
      theirs.length ? and(eq(offers.creatorId, userId), inArray(offers.requestId, theirs.map((r) => r.id))) : undefined,
    ].filter((x) => !!x);
    if (pairs.length) {
      const open = await tx.select({ id: offers.id }).from(offers).where(and(eq(offers.status, "pending"), or(...pairs)));
      if (open.length) {
        await tx.update(offers).set({ status: "withdrawn" }).where(inArray(offers.id, open.map((o) => o.id)));
        await tx.update(previewAlbums).set({ status: "declined" }).where(and(inArray(previewAlbums.offerId, open.map((o) => o.id)), inArray(previewAlbums.status, ["requested", "in_review", "ready"])));
      }
    }
    await log(tx, `user:${userId}`, "safety.block", other.id, { by: userId });
  });
}

export async function unblock(userId: string, key: string) {
  const other = key.startsWith("anon:") ? { id: key.slice(5) } : await db.query.users.findFirst({ where: eq(users.handle, key), columns: { id: true } });
  if (!other) return;
  await db.delete(blocks).where(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, other.id)));
  await log(db, `user:${userId}`, "safety.unblock", other.id, { by: userId });
}

export async function myBlocks(userId: string) {
  const rows = await db.select({ id: users.id, handle: users.handle, avatar: users.avatar, anonymous: blocks.anonymous, at: blocks.createdAt }).from(blocks).innerJoin(users, eq(users.id, blocks.blockedId)).where(eq(blocks.blockerId, userId));
  // A buyer blocked from a request stays anonymous: the list shows "a buyer", and undo works by a key.
  return rows.map((r) => (r.anonymous ? { key: `anon:${r.id}`, handle: null, avatar: null, at: r.at } : { key: r.handle, handle: r.handle, avatar: r.avatar, at: r.at }));
}
