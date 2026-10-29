import "server-only";
import { asked, PREVIEW_LIMIT } from "./albums";
import { blockedEither, iBlocked } from "./blocks";
import { DEMO_MODE } from "@/config/compliance";
import { and, asc, desc, eq, gt, inArray, or, sql, count } from "drizzle-orm";
import { db, schema } from "@/db";

const { requests, offers, deals, users, creatorProfiles, messages, vaultItems, media, previewAlbums, notifications, saves, ledger } = schema;

export type FeedItem = Awaited<ReturnType<typeof feed>>[number];

export async function feed(opts: { viewerId?: string; tab?: "for-you" | "new" | "ending"; limit?: number; category?: string } = {}) {
  const now = new Date();
  const conds = [eq(requests.status, "open"), gt(requests.closesAt, now)];
  // Two people where one blocked the other never see each other's requests.
  if (opts.viewerId) conds.push(sql`not exists (select 1 from blocks b where (b.blocker_id = ${opts.viewerId} and b.blocked_id = "requests"."buyer_id") or (b.blocked_id = ${opts.viewerId} and b.blocker_id = "requests"."buyer_id"))`);
  if (opts.category) conds.push(eq(requests.category, opts.category as "video"));
  const order = opts.tab === "ending" ? [asc(requests.closesAt)] : opts.tab === "new" ? [desc(requests.createdAt)] : [desc(requests.dealCents), asc(requests.closesAt)];
  const rows = await db.select({
    r: requests,
    offers: sql<number>`(select count(*)::int from offers o where o.request_id = "requests"."id")`,
    house: sql<boolean>`(select u.house from users u where u.id = "requests"."buyer_id")`,
    buyer: sql<{ sum: number; count: number; deals: number }>`(select json_build_object('sum', u.buyer_rating_sum, 'count', u.buyer_rating_count, 'deals', (select count(*) from deals d where d.buyer_id = u.id and d.status = 'released')) from users u where u.id = "requests"."buyer_id")`,
  }).from(requests).where(and(...conds)).orderBy(...order).limit(opts.limit ?? 40);
  // In the demo the team profiles play ordinary buyers, so their label is left out.
  return rows.map(({ r, offers, house, buyer }) => ({ ...r, offers, buyer, house: house && !DEMO_MODE, mine: r.buyerId === opts.viewerId }));
}

export async function request(id: string) {
  const r = await db.query.requests.findFirst({ where: eq(requests.id, id) });
  if (!r) return r;
  const b = await db.query.users.findFirst({ where: eq(users.id, r.buyerId), columns: { house: true, buyerRatingSum: true, buyerRatingCount: true } });
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(deals).where(and(eq(deals.buyerId, r.buyerId), eq(deals.status, "released")));
  return { ...r, house: !!b?.house && !DEMO_MODE, buyer: { sum: b?.buyerRatingSum ?? 0, count: b?.buyerRatingCount ?? 0, deals: n } };
}

export async function offersFor(requestId: string) {
  const rows = await db.select({ o: offers, u: users, p: creatorProfiles })
    .from(offers).innerJoin(users, eq(users.id, offers.creatorId)).innerJoin(creatorProfiles, eq(creatorProfiles.userId, users.id))
    .where(and(eq(offers.requestId, requestId), sql`${offers.status} <> 'withdrawn'`)).orderBy(desc(users.ratingSum));
  return rows.map((r) => ({ o: r.o, ...publicProfile(r.u, r.p) }));
}

export async function myRequests(buyerId: string) {
  return db.select({
    r: requests,
    offers: sql<number>`(select count(*)::int from offers o where o.request_id = "requests"."id" and o.status = 'pending')`,
  }).from(requests).where(eq(requests.buyerId, buyerId)).orderBy(desc(requests.createdAt));
}

export async function myOffers(creatorId: string) {
  return db.select({ o: offers, r: requests }).from(offers).innerJoin(requests, eq(requests.id, offers.requestId))
    .where(eq(offers.creatorId, creatorId)).orderBy(desc(offers.createdAt));
}

export async function myDeals(userId: string) {
  return db.select({ d: deals, r: requests, buyer: users }).from(deals)
    .innerJoin(requests, eq(requests.id, deals.requestId)).innerJoin(users, eq(users.id, deals.buyerId))
    .where(or(eq(deals.buyerId, userId), eq(deals.creatorId, userId))).orderBy(desc(deals.createdAt));
}

export async function deal(id: string, viewerId: string) {
  const d = await db.query.deals.findFirst({ where: eq(deals.id, id) });
  if (!d || (d.buyerId !== viewerId && d.creatorId !== viewerId)) return null;
  const [r, o, buyer, creator, msgs, dispute] = await Promise.all([
    db.query.requests.findFirst({ where: eq(requests.id, d.requestId) }),
    db.query.offers.findFirst({ where: eq(offers.id, d.offerId) }),
    db.query.users.findFirst({ where: eq(users.id, d.buyerId) }),
    db.query.users.findFirst({ where: eq(users.id, d.creatorId) }),
    db.select().from(messages).where(eq(messages.dealId, id)).orderBy(asc(messages.createdAt)),
    db.query.disputes.findFirst({ where: eq(schema.disputes.dealId, id) }),
  ]);
  return { d, r: r!, o: o!, buyer: buyer!, creator: creator!, msgs, dispute };
}

export async function vault(buyerId: string) {
  return db.select({ v: vaultItems, m: media, d: deals, r: requests, creator: users.handle })
    .from(vaultItems).innerJoin(media, eq(media.id, vaultItems.mediaId)).innerJoin(deals, eq(deals.id, vaultItems.dealId))
    .innerJoin(requests, eq(requests.id, deals.requestId)).innerJoin(users, eq(users.id, deals.creatorId))
    .where(and(eq(vaultItems.buyerId, buyerId), or(sql`${vaultItems.availableUntil} is null`, gt(vaultItems.availableUntil, new Date()))))
    .orderBy(desc(deals.deliveredAt), asc(vaultItems.position));
}

/* A creator profile is visible when it is public, when the viewer has an offer from this creator
   on one of their requests, or when they already have a deal together. */
export async function profileFor(handle: string, viewerId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.handle, handle) });
  if (!u || !u.isCreator || u.bannedAt) return null;
  const p = await db.query.creatorProfiles.findFirst({ where: eq(creatorProfiles.userId, u.id) });
  if (!p) return null;
  // Blocked: the one who blocked sees a short note with an undo; the blocked person sees nothing.
  if (u.id !== viewerId && await blockedEither(u.id, viewerId)) return (await iBlocked(viewerId, u.id)) ? { hidden: false as const, blocked: true as const, handle: u.handle } : null;
  let reason: "public" | "self" | "offer" | "deal" | null = p.visibility === "public" ? "public" : u.id === viewerId ? "self" : null;
  let offerId: string | null = null;
  if (!reason) {
    const [o] = await db.select({ id: offers.id }).from(offers).innerJoin(requests, eq(requests.id, offers.requestId))
      .where(and(eq(offers.creatorId, u.id), eq(requests.buyerId, viewerId), eq(offers.status, "pending"))).limit(1);
    if (o) { reason = "offer"; offerId = o.id; }
  }
  if (!reason) {
    const [d] = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.creatorId, u.id), eq(deals.buyerId, viewerId))).limit(1);
    if (d) reason = "deal";
  }
  if (!reason) return { hidden: true as const };
  if (!offerId) {
    const [o] = await db.select({ id: offers.id }).from(offers).innerJoin(requests, eq(requests.id, offers.requestId))
      .where(and(eq(offers.creatorId, u.id), eq(requests.buyerId, viewerId), eq(offers.status, "pending"))).limit(1);
    offerId = o?.id ?? null;
  }
  const album = offerId ? await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.offerId, offerId) }) : null;
  const ofr = offerId ? await db.query.offers.findFirst({ where: eq(offers.id, offerId) }) : null;
  const previewsLeft = ofr ? Math.max(0, PREVIEW_LIMIT - await asked(viewerId, ofr.requestId)) : 0;
  const reviews = await db.select({ stars: deals.buyerRating, at: sql<Date | null>`coalesce(${deals.settledAt}, ${deals.deliveredAt})`.mapWith(deals.settledAt), by: users.handle, text: deals.reviewText, extra: sql<boolean>`coalesce((${deals.buyerScores}->>'overDelivered')::boolean, false)` }).from(deals)
    .innerJoin(users, eq(users.id, deals.buyerId)).where(and(eq(deals.creatorId, u.id), sql`${deals.buyerRating} is not null`)).orderBy(sql`coalesce(${deals.settledAt}, ${deals.deliveredAt}) desc nulls last`).limit(12);
  const [{ n }] = await db.select({ n: count() }).from(deals).where(and(eq(deals.creatorId, u.id), eq(deals.status, "released")));
  // Intimate details only for the creator, a buyer they applied to, or a buyer they have a deal with.
  const intimate = u.id === viewerId || !!offerId || !!(await db.select({ id: deals.id }).from(deals).where(and(eq(deals.creatorId, u.id), eq(deals.buyerId, viewerId))).limit(1))[0];
  const detail = intimate ? (p.detail ?? {}) : { gender: p.detail?.gender };
  return { hidden: false as const, blocked: false as const, ...publicProfile(u, p), reason, offerId, album, previewsLeft, reviews, dealsDone: n, detail, intimate };
}

/* The only shape of a creator that leaves the server for other users. No email, no birth year,
   no keys, no verification or payout data. Age is derived from the verified birth year. */
export function publicProfile(u: typeof users.$inferSelect, p: typeof creatorProfiles.$inferSelect) {
  return {
    u: { id: u.id, handle: u.handle, avatar: u.avatar, ratingSum: u.ratingSum, ratingCount: u.ratingCount, age: new Date().getFullYear() - u.birthYear },
    p: { visibility: p.visibility, bio: p.bio, heightCm: p.heightCm, build: p.build, sport: p.sport, work: p.work, languages: p.languages, hair: p.hair, eyes: p.eyes, body: p.body, tattoos: p.tattoos, makes: p.makes, never: p.never, showsFace: p.showsFace, defaultVault: p.defaultVault, fromCents: p.fromCents, replyMinutes: p.replyMinutes },
  };
}
export type PublicProfile = ReturnType<typeof publicProfile>;

export async function publicCreators(limit = 12, viewerId?: string) {
  const rows = await db.select({ u: users, p: creatorProfiles }).from(users).innerJoin(creatorProfiles, eq(creatorProfiles.userId, users.id))
    .where(and(eq(creatorProfiles.visibility, "public"), sql`${users.bannedAt} is null`,
      viewerId ? sql`not exists (select 1 from blocks b where (b.blocker_id = ${viewerId} and b.blocked_id = ${users.id}) or (b.blocked_id = ${viewerId} and b.blocker_id = ${users.id}))` : undefined))
    .orderBy(sql`case when ${users.avatar}->>'kind' = '3d' then 0 else 1 end`, desc(users.ratingCount)).limit(limit);
  return rows.map((r) => publicProfile(r.u, r.p));
}

export async function unread(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
  return n;
}
export async function inbox(userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(40);
}

export async function savedIds(userId: string) {
  return new Set((await db.select({ id: saves.requestId }).from(saves).where(eq(saves.userId, userId))).map((r) => r.id));
}

/* Live, non identifying numbers for the home page. */
export async function pulse() {
  const since = new Date(Date.now() - 7 * 86400_000);
  // Only real money counts: payouts to accounts that are not demo accounts.
  const [paid] = await db.select({ c: sql<number>`coalesce(sum(${ledger.cents}),0)::int` }).from(ledger).where(and(eq(ledger.entry, "creator_payout"), gt(ledger.createdAt, since), DEMO_MODE ? undefined : sql`${ledger.userId} not in (select id from users where email like '%@demo.byrequest.app')`));
  const [open] = await db.select({ n: count() }).from(requests).where(and(eq(requests.status, "open"), gt(requests.closesAt, new Date())));
  const [done] = await db.select({ n: count() }).from(deals).where(eq(deals.status, "released"));
  const [avg] = await db.select({ h: sql<number>`coalesce(avg(extract(epoch from (${deals.deliveredAt} - ${deals.createdAt}))/3600),0)::float` }).from(deals).where(sql`${deals.deliveredAt} is not null`);
  const recent = await db.select({ cat: requests.category, amount: requests.amount, hours: sql<number>`extract(epoch from (${deals.deliveredAt} - ${deals.createdAt}))/3600`, at: deals.deliveredAt })
    .from(deals).innerJoin(requests, eq(requests.id, deals.requestId)).where(sql`${deals.deliveredAt} is not null`).orderBy(desc(deals.deliveredAt)).limit(8);
  return { paidCents: paid.c, open: open.n, done: done.n, avgHours: avg.h, recent };
}

/* Preview requests for a creator. The buyer stays anonymous: the creator sees the request, not who asked. */
export async function albumsForCreator(creatorId: string) {
  return db.select({ a: previewAlbums, title: requests.title, requestId: requests.id }).from(previewAlbums).innerJoin(offers, eq(offers.id, previewAlbums.offerId)).innerJoin(requests, eq(requests.id, offers.requestId))
    .where(and(eq(previewAlbums.creatorId, creatorId), eq(previewAlbums.status, "requested")));
}

export async function mediaMany(ids: string[]) {
  return ids.length ? db.select().from(media).where(inArray(media.id, ids)) : [];
}

export async function categoryStats() {
  const rows = await db.select({ c: requests.category, n: count(), med: sql<number>`percentile_cont(0.5) within group (order by ${requests.dealCents})::int`, lo: sql<number>`percentile_cont(0.25) within group (order by ${requests.dealCents})::int`, hi: sql<number>`percentile_cont(0.75) within group (order by ${requests.dealCents})::int` })
    .from(requests).where(and(eq(requests.status, "open"), gt(requests.closesAt, new Date()))).groupBy(requests.category);
  return Object.fromEntries(rows.map((r) => [r.c, r]));
}

export async function creatorEarnings(creatorId: string) {
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const [paid] = await db.select({ c: sql<number>`coalesce(sum(${ledger.cents}),0)::int` }).from(ledger).where(and(eq(ledger.userId, creatorId), eq(ledger.entry, "creator_payout"), gt(ledger.createdAt, month)));
  const [held] = await db.select({ c: sql<number>`coalesce(sum(${ledger.cents}),0)::int` }).from(ledger).where(and(eq(ledger.userId, creatorId), eq(ledger.entry, "payout_on_hold")));
  const [pending] = await db.select({ c: sql<number>`coalesce(sum(${deals.creatorCents}),0)::int` }).from(deals).where(and(eq(deals.creatorId, creatorId), sql`${deals.status} in ('held','reviewing','delivered','disputed')`));
  const weeks = await db.select({ w: sql<string>`to_char(date_trunc('week', ${ledger.createdAt}), 'YYYY-MM-DD')`, c: sql<number>`sum(${ledger.cents})::int` }).from(ledger)
    .where(and(eq(ledger.userId, creatorId), eq(ledger.entry, "creator_payout"), gt(ledger.createdAt, new Date(Date.now() - 84 * 86400_000)))).groupBy(sql`1`).orderBy(sql`1`);
  return { monthCents: paid.c, heldCents: held.c, pendingCents: pending.c, weeks };
}

/* Opening a chat marks it read for that side, together with its message notifications. */
export async function markChatRead(dealId: string, userId: string, buyer: boolean) {
  const now = new Date();
  await db.update(deals).set(buyer ? { buyerReadAt: now } : { creatorReadAt: now }).where(eq(deals.id, dealId));
  await db.update(notifications).set({ readAt: now }).where(and(eq(notifications.userId, userId), eq(notifications.href, `/deals/${dealId}`), sql`${notifications.readAt} is null`));
}

/* Every chat of a user, newest activity first, with the last line and the number of unread messages. */
export async function conversations(userId: string) {
  const rows = await db.execute(sql`
    select d.id, d.status, d.buyer_id = ${userId} as buyer, r.title, r.cover,
      o.handle as other, o.avatar as other_avatar,
      lm.kind as last_kind, lm.body as last_body, lm.sender_id as last_sender, coalesce(lm.created_at, d.created_at) as last_at,
      (select count(*)::int from messages m where m.deal_id = d.id and m.kind = 'e2e' and m.sender_id <> ${userId}
        and m.created_at > coalesce(case when d.buyer_id = ${userId} then d.buyer_read_at else d.creator_read_at end, 'epoch')) as unread
    from deals d
    join requests r on r.id = d.request_id
    join users o on o.id = case when d.buyer_id = ${userId} then d.creator_id else d.buyer_id end
    left join lateral (select kind, body, sender_id, created_at from messages m where m.deal_id = d.id order by created_at desc limit 1) lm on true
    where d.buyer_id = ${userId} or d.creator_id = ${userId}
    order by last_at desc limit 60`);
  return rows.rows as { id: string; status: string; buyer: boolean; title: string; cover: string | null; other: string; other_avatar: unknown; last_kind: "e2e" | "system" | null; last_body: string | null; last_sender: string | null; last_at: string | Date; unread: number }[];
}

/* How many open requests fit each hot theme right now. */
export async function themeCounts() {
  const { THEMES } = await import("@/content/themes");
  const open = await db.select({ title: requests.title, details: requests.details }).from(requests).where(and(eq(requests.status, "open"), gt(requests.closesAt, new Date())));
  return Object.fromEntries(THEMES.map((x) => [x.k, open.filter((r) => x.match.test(`${r.title} ${r.details}`)).length])) as Record<string, number>;
}

/* The best paid open requests right now: real budgets, highest first. */
export async function topBudgets(limit = 6, viewerId?: string) {
  return db.select({ id: requests.id, title: requests.title, category: requests.category, amount: requests.amount, dealCents: requests.dealCents })
    .from(requests).where(and(eq(requests.status, "open"), gt(requests.closesAt, new Date()),
      viewerId ? sql`not exists (select 1 from blocks b where (b.blocker_id = ${viewerId} and b.blocked_id = ${requests.buyerId}) or (b.blocked_id = ${viewerId} and b.blocker_id = ${requests.buyerId}))` : undefined))
    .orderBy(desc(requests.dealCents)).limit(limit);
}

/* Live totals of the board: open requests and the budget waiting in them. */
export async function boardTotals() {
  const [r] = await db.select({ n: count(), cents: sql<number>`coalesce(sum(${requests.dealCents}),0)::int` }).from(requests).where(and(eq(requests.status, "open"), gt(requests.closesAt, new Date())));
  return { open: r.n, cents: r.cents };
}

/* Creators whose identity and age check passed. */
export async function verifiedCreators() {
  const [r] = await db.select({ n: count() }).from(schema.onboarding).where(eq(schema.onboarding.identity, "approved"));
  return r.n;
}
