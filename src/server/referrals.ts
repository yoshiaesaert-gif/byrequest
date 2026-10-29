import "server-only";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { makeCode, normalizeCode, validCode, allowedCustom, creatorReward, windowEnd, cleanConfig, weekStart, nextPayout, type RefConfig } from "@/domain/referral";
import { RuleError } from "@/domain/rules";
import { payments } from "./payments";
import { access, log } from "./onboarding";

const { users, referrals, referralRewards, referralEvents, ledger, notifications, deals, settings } = schema;
const KEY = "referral";

/* The numbers of the programme, set by staff. Every change is in the audit log with before and after. */
export async function getConfig(): Promise<RefConfig> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, KEY) });
  return cleanConfig(row?.value as Partial<RefConfig> | undefined);
}
export async function setConfig(staffId: string, v: Partial<RefConfig>) {
  const before = await getConfig();
  const next = cleanConfig({ ...before, ...v });
  await db.insert(settings).values({ key: KEY, value: next }).onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
  await log(db, `staff:${staffId}`, "referral.config", null, { before, after: next });
  await event(db, "-", "config_changed", null, { by: staffId, before, after: next });
  return next;
}

/* Referral programme. Every step lands in referral_events (the programme's own trail) and the
   money steps also in the ledger and the audit log, so any reward can be traced from the link that
   was opened to the payout that was made. */

async function event(tx: Tx | typeof db, code: string, ev: string, referralId: string | null, detail: Record<string, unknown> = {}) {
  await tx.insert(referralEvents).values({ code, event: ev, referralId, detail });
}

/* The personal code, made once and kept. */
export async function codeFor(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { refCode: true, handle: true } });
  if (!u) throw new Error("no user");
  if (u.refCode) return u.refCode;
  for (let i = 0; i < 8; i++) {
    const c = makeCode(u.handle);
    const [row] = await db.update(users).set({ refCode: c }).where(and(eq(users.id, userId), isNull(users.refCode))).returning({ c: users.refCode }).catch(() => []);
    if (row?.c) return row.c;
    const again = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { refCode: true } });
    if (again?.refCode) return again.refCode;
  }
  throw new Error("could not make a code");
}

/* A personal code people can say out loud. The old link stops working, which the page says first. */
export async function setCode(userId: string, raw: string) {
  const c = normalizeCode(raw);
  if (!allowedCustom(c)) throw new RuleError("Use 3 to 12 letters or numbers.");
  const taken = await db.query.users.findFirst({ where: eq(users.refCode, c), columns: { id: true } });
  if (taken && taken.id !== userId) throw new RuleError("That code is taken. Try another one.");
  const before = await codeFor(userId);
  await db.update(users).set({ refCode: c }).where(eq(users.id, userId));
  await event(db, c, "code_changed", null, { from: before });
  await log(db, `user:${userId}`, "referral.code_changed", userId, { from: before, to: c });
  return c;
}

/* Who owns a code, for the landing banner. Only the public username, never more. */
export async function owner(codeRaw: string) {
  const c = normalizeCode(codeRaw);
  if (!validCode(c)) return null;
  return db.query.users.findFirst({ where: and(eq(users.refCode, c), isNull(users.bannedAt), isNull(users.deletedAt)), columns: { id: true, handle: true } });
}

export async function linkOpened(codeRaw: string) {
  const o = await owner(codeRaw);
  if (o) await event(db, normalizeCode(codeRaw), "link_opened", null);
  return o;
}

/* At sign up: tie the new account to the code. Only new accounts, never yourself. An invited buyer
   gets their first service fee as a gift right away. */
export async function attach(newUserId: string, codeRaw: string | undefined, intent: "buy" | "earn") {
  if (!codeRaw) return;
  const code = normalizeCode(codeRaw);
  const o = await owner(code);
  if (!o || o.id === newUserId) { await event(db, code || "-", "signup_ignored", null, { reason: !o ? "unknown code" : "own code" }); return; }
  await db.transaction(async (tx) => {
    const [r] = await tx.insert(referrals).values({ referrerId: o.id, refereeId: newUserId, code, intent }).onConflictDoNothing().returning();
    if (!r) return;
    await event(tx, code, "signed_up", r.id, { intent });
    if (intent === "buy" && (await getConfig()).buyerGift) {
      await tx.update(users).set({ freeFees: sql`${users.freeFees} + 1` }).where(eq(users.id, newUserId));
      await event(tx, code, "fee_gift_granted", r.id, { to: "invited buyer" });
    }
    await log(tx, "system", "referral.signup", newUserId, { referrer: o.id, code, intent });
    await tx.insert(notifications).values({ userId: o.id, title: "A friend joined", body: "Someone signed up with your invite link.", href: "/invite" });
  });
}

/* Called when a deal is paid out to the creator (inside the same transaction). */
export async function onCreatorPaid(tx: Tx, d: typeof deals.$inferSelect, now = new Date()) {
  // 1. The creator was invited: 10% of their net amount to the person who invited them.
  const cfg = await getConfig();
  const rc = await tx.query.referrals.findFirst({ where: eq(referrals.refereeId, d.creatorId) });
  if (rc && rc.referrerId !== d.buyerId) {          // no reward on deals between the two of them
    let ends = rc.windowEndsAt;
    if (!rc.firstDealAt) {
      ends = windowEnd(now, cfg.windowDays);
      await tx.update(referrals).set({ firstDealAt: now, windowEndsAt: ends }).where(eq(referrals.id, rc.id));
      await event(tx, rc.code, "first_deal", rc.id, { dealId: d.id });
    }
    const cents = creatorReward(d.creatorCents, cfg.creatorPct, ends!, now);
    if (cents > 0) await reward(tx, rc, d.id, cents, cfg.creatorPct);
    else await event(tx, rc.code, "outside_window", rc.id, { dealId: d.id });
  } else if (rc) await event(tx, rc.code, "skipped_own_deal", rc.id, { dealId: d.id });
  // 2. The buyer was invited: their first paid out deal gives the inviter a service fee gift.
  const rb = await tx.query.referrals.findFirst({ where: eq(referrals.refereeId, d.buyerId) });
  if (rb && !rb.buyerRewardedAt && rb.referrerId !== d.creatorId && cfg.buyerGift) {
    await tx.update(referrals).set({ buyerRewardedAt: now }).where(eq(referrals.id, rb.id));
    await tx.update(users).set({ freeFees: sql`${users.freeFees} + 1` }).where(eq(users.id, rb.referrerId));
    await tx.insert(referralRewards).values({ referralId: rb.id, referrerId: rb.referrerId, dealId: d.id, kind: "free_fee", cents: 0, status: "granted" });
    await event(tx, rb.code, "fee_gift_granted", rb.id, { to: "inviter", dealId: d.id });
    await tx.insert(notifications).values({ userId: rb.referrerId, title: "Your friend's first deal is done", body: "Your next service fee is on us.", href: "/invite" });
  }
}

/* A bonus is put aside, quietly. No message per deal: it is bundled into the weekly payout, so a
   bonus never tells anyone what a friend earned on a single deal. */
async function reward(tx: Tx, rc: typeof referrals.$inferSelect, dealId: string, cents: number, pct: number) {
  const inserted = await tx.insert(referralRewards).values({ referralId: rc.id, referrerId: rc.referrerId, dealId, kind: "creator_share", cents, status: "on_hold" }).onConflictDoNothing().returning();
  if (!inserted.length) return;                     // this deal already earned its reward
  await tx.update(referrals).set({ earnedCents: sql`${referrals.earnedCents} + ${cents}` }).where(eq(referrals.id, rc.id));
  await event(tx, rc.code, "reward_earned", rc.id, { dealId, cents, pct });
  await log(tx, "system", "referral.reward", rc.referrerId, { dealId, cents, pct });
}

/* Worker: once a week, everything earned before this Monday is paid out as one amount per person,
   to their own verified payout account. Without an approved payout setup it waits. */
export async function payWeekly(now = new Date()) {
  const cut = weekStart(now);
  const due = await db.select({ referrerId: referralRewards.referrerId, cents: sql<number>`sum(${referralRewards.cents})::int`, ids: sql<string[]>`array_agg(${referralRewards.id})` })
    .from(referralRewards).where(and(eq(referralRewards.status, "on_hold"), eq(referralRewards.kind, "creator_share"), lt(referralRewards.createdAt, cut))).groupBy(referralRewards.referrerId);
  let paid = 0;
  for (const r of due) {
    if (!r.cents || !(await access(r.referrerId)).caps.receivePayouts) continue;
    await db.transaction(async (tx) => {
      const p = await payments.payout({ creatorId: r.referrerId, cents: r.cents });
      await tx.update(referralRewards).set({ status: "paid", payoutRef: p.ref, paidAt: now }).where(inArray(referralRewards.id, r.ids));
      await tx.insert(ledger).values({ userId: r.referrerId, entry: "referral_payout", cents: r.cents });
      await event(tx, "-", "weekly_payout", null, { referrer: r.referrerId, cents: r.cents, rewards: r.ids.length, ref: p.ref });
      await log(tx, "system", "referral.payout", r.referrerId, { cents: r.cents, rewards: r.ids.length });
      await tx.insert(notifications).values({ userId: r.referrerId, title: "Your weekly invite bonus is in", body: `€${(r.cents / 100).toFixed(2)} was added to your payout account.`, href: "/invite" });
    });
    paid++;
  }
  return paid;
}

/* A gifted service fee was used, or given back after a refund. */
export async function feeGiftUsed(tx: Tx, userId: string, requestId: string, cents: number) {
  await tx.update(users).set({ freeFees: sql`greatest(${users.freeFees} - 1, 0)` }).where(eq(users.id, userId));
  await tx.insert(ledger).values({ requestId, userId, entry: "fee_gift", cents });
  const r = await tx.query.referrals.findFirst({ where: eq(referrals.refereeId, userId) });
  await event(tx, r?.code ?? "-", "fee_gift_used", r?.id ?? null, { requestId, cents, userId });
}
export async function feeGiftReturned(tx: Tx, userId: string, requestId: string, cents: number) {
  await tx.update(users).set({ freeFees: sql`${users.freeFees} + 1` }).where(eq(users.id, userId));
  await tx.insert(ledger).values({ requestId, userId, entry: "fee_gift", cents: -cents });
  await event(tx, "-", "fee_gift_returned", null, { requestId, cents, userId });
}

/* Everything the invite page shows, discreet by design: friends by a shortened name and only
   "joined" or "active"; money only as weekly totals that were paid out. */
export async function overview(userId: string, now = new Date()) {
  const [code, cfg] = await Promise.all([codeFor(userId), getConfig()]);
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { freeFees: true } });
  const rows = await db.select({ r: referrals, handle: users.handle, isCreator: users.isCreator }).from(referrals).innerJoin(users, eq(users.id, referrals.refereeId)).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
  const rewards = await db.select({ status: referralRewards.status, cents: referralRewards.cents, paidAt: referralRewards.paidAt }).from(referralRewards).where(and(eq(referralRewards.referrerId, userId), eq(referralRewards.kind, "creator_share")));
  const opened = await db.select({ n: sql<number>`count(*)::int` }).from(referralEvents).where(and(eq(referralEvents.code, code), eq(referralEvents.event, "link_opened")));
  const friends = await Promise.all(rows.map(async ({ r, handle, isCreator }) => ({
    id: r.id, name: handle.slice(0, 2) + "•••", intent: r.intent, joined: r.createdAt,
    active: r.intent === "earn" ? isCreator && (await access(r.refereeId)).status === "active" : !!r.buyerRewardedAt,
  })));
  const paid = rewards.filter((x) => x.status === "paid");
  const last = paid.map((x) => x.paidAt!).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return {
    code, cfg, freeFees: u?.freeFees ?? 0, opened: opened[0]?.n ?? 0, friends,
    paidTotal: paid.reduce((s, x) => s + x.cents, 0),
    lastPaid: last ? { at: last, cents: paid.filter((x) => x.paidAt?.getTime() === last.getTime()).reduce((s, x) => s + x.cents, 0) } : null,
    waiting: rewards.some((x) => x.status === "on_hold"), payoutsReady: (await access(userId)).caps.receivePayouts,
    nextPayout: nextPayout(now),
  };
}

/* Back office: the whole programme, newest first. */
export async function adminList() {
  const ref = sql`(select handle from users where id = ${referrals.referrerId})`;
  const fr = sql`(select handle from users where id = ${referrals.refereeId})`;
  const rows = await db.select({ r: referrals, referrer: sql<string>`${ref}`, friend: sql<string>`${fr}` }).from(referrals).orderBy(desc(referrals.createdAt)).limit(200);
  const events = await db.select().from(referralEvents).orderBy(desc(referralEvents.createdAt)).limit(200);
  const totals = await db.select({ status: referralRewards.status, kind: referralRewards.kind, cents: sql<number>`coalesce(sum(${referralRewards.cents}),0)::int`, n: sql<number>`count(*)::int` }).from(referralRewards).groupBy(referralRewards.status, referralRewards.kind);
  return { rows, events, totals };
}
