import "server-only";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { makeCode, normalizeCode, validCode, creatorReward, windowEnd, cleanConfig, weekStart, nextPayout, WITHDRAW_MIN_CENTS, type RefConfig } from "@/domain/referral";
import { RuleError } from "@/domain/rules";
import { payments } from "./payments";
import { access, log } from "./onboarding";

const { users, referrals, referralRewards, referralEvents, ledger, notifications, deals, settings, walletEntries, requests } = schema;
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

/* The personal code: random, made once and kept. Codes from before (with a username in them) are
   replaced, so no code ever points to a person. */
export async function codeFor(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { refCode: true } });
  if (!u) throw new Error("no user");
  if (u.refCode && validCode(u.refCode)) return u.refCode;
  for (let i = 0; i < 8; i++) {
    const c = makeCode();
    const [row] = await db.update(users).set({ refCode: c }).where(and(eq(users.id, userId), u.refCode ? eq(users.refCode, u.refCode) : isNull(users.refCode))).returning({ c: users.refCode }).catch(() => []);
    if (row?.c) { if (u.refCode) await event(db, c, "code_replaced", null, { from: u.refCode }); return row.c; }
    const again = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { refCode: true } });
    if (again?.refCode && validCode(again.refCode)) return again.refCode;
  }
  throw new Error("could not make a code");
}

/* Who owns a code. Only used to check it; the person is never shown to the friend. */
export async function owner(codeRaw: string) {
  const c = normalizeCode(codeRaw);
  if (!validCode(c)) return null;
  return db.query.users.findFirst({ where: and(eq(users.refCode, c), isNull(users.bannedAt), isNull(users.deletedAt)), columns: { id: true } });
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
    // Quietly put aside as well; it is given with the weekly statement, never on the day itself.
    await tx.update(referrals).set({ buyerRewardedAt: now }).where(eq(referrals.id, rb.id));
    await tx.insert(referralRewards).values({ referralId: rb.id, referrerId: rb.referrerId, dealId: d.id, kind: "free_fee", cents: 0, status: "on_hold" }).onConflictDoNothing();
    await event(tx, rb.code, "fee_gift_earned", rb.id, { to: "inviter", dealId: d.id });
  }
}

/* A bonus is put aside, quietly. No message per deal: it is bundled into the weekly statement, so a
   bonus never tells anyone what a friend earned, or when. */
async function reward(tx: Tx, rc: typeof referrals.$inferSelect, dealId: string, cents: number, pct: number) {
  const inserted = await tx.insert(referralRewards).values({ referralId: rc.id, referrerId: rc.referrerId, dealId, kind: "creator_share", cents, status: "on_hold" }).onConflictDoNothing().returning();
  if (!inserted.length) return;                     // this deal already earned its reward
  await tx.update(referrals).set({ earnedCents: sql`${referrals.earnedCents} + ${cents}` }).where(eq(referrals.id, rc.id));
  await event(tx, rc.code, "reward_earned", rc.id, { dealId, cents, pct });
  await log(tx, "system", "referral.reward", rc.referrerId, { dealId, cents, pct });
}

/* Worker: once a week, everything set aside before this Monday lands on the bonus balance as one
   line per person: "week bonus". Free service fees earned that week are given at the same moment. */
export async function creditWeekly(now = new Date()) {
  const cut = weekStart(now), weekOf = new Date(cut.getTime() - 7 * 86400_000);
  const due = await db.select({ referrerId: referralRewards.referrerId, kind: referralRewards.kind, cents: sql<number>`sum(${referralRewards.cents})::int`, n: sql<number>`count(*)::int`, ids: sql<string[]>`array_agg(${referralRewards.id})` })
    .from(referralRewards).where(and(eq(referralRewards.status, "on_hold"), lt(referralRewards.createdAt, cut))).groupBy(referralRewards.referrerId, referralRewards.kind);
  let credited = 0;
  for (const r of due) {
    await db.transaction(async (tx) => {
      await tx.update(referralRewards).set({ status: "paid", paidAt: now }).where(inArray(referralRewards.id, r.ids));
      if (r.kind === "creator_share" && r.cents > 0) {
        await tx.insert(walletEntries).values({ userId: r.referrerId, kind: "week_bonus", cents: r.cents, weekOf });
        await tx.insert(ledger).values({ userId: r.referrerId, entry: "bonus_credited", cents: r.cents });
        await tx.insert(notifications).values({ userId: r.referrerId, title: "Your week bonus is in", body: `€${(r.cents / 100).toFixed(2)} was added to your bonus balance.`, href: "/invite" });
      } else if (r.kind === "free_fee") {
        await tx.update(users).set({ freeFees: sql`${users.freeFees} + ${r.n}` }).where(eq(users.id, r.referrerId));
        await tx.insert(walletEntries).values({ userId: r.referrerId, kind: "free_fee", cents: 0, weekOf, ref: String(r.n) });
      }
      await event(tx, "-", "week_credited", null, { referrer: r.referrerId, kind: r.kind, cents: r.cents, rewards: r.n });
      await log(tx, "system", "referral.credited", r.referrerId, { kind: r.kind, cents: r.cents, rewards: r.n });
    });
    credited++;
  }
  return credited;
}

export async function balance(userId: string, tx: Tx | typeof db = db) {
  const [b] = await tx.select({ c: sql<number>`coalesce(sum(${walletEntries.cents}),0)::int` }).from(walletEntries).where(eq(walletEntries.userId, userId));
  return b?.c ?? 0;
}

/* Transfer the balance to the person's own verified payout account, from €10. */
export async function withdraw(userId: string) {
  const a = await access(userId);
  if (!a.caps.receivePayouts) throw new RuleError("Set up your payouts first. Then you can transfer your balance.");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);   // one transfer at a time per person
    const cents = await balance(userId, tx);
    if (cents < WITHDRAW_MIN_CENTS) throw new RuleError("You can transfer from €10.");
    const p = await payments.payout({ creatorId: userId, cents });
    await tx.insert(walletEntries).values({ userId, kind: "withdrawal", cents: -cents, ref: p.ref });
    await tx.insert(ledger).values({ userId, entry: "referral_payout", cents });
    await log(tx, `user:${userId}`, "wallet.withdraw", userId, { cents, ref: p.ref });
    return cents;
  });
}

/* Paying (part of) a request with the balance, and giving it back if that request is refunded. */
export async function spend(tx: Tx, userId: string, requestId: string, cents: number) {
  if (cents <= 0) return;
  await tx.insert(walletEntries).values({ userId, kind: "spent", cents: -cents, ref: requestId });
  await tx.insert(ledger).values({ requestId, userId, entry: "credit_spent", cents });
}
export async function giveBack(tx: Tx, userId: string, requestId: string, cents: number) {
  if (cents <= 0) return;
  await tx.insert(walletEntries).values({ userId, kind: "spent_back", cents, ref: requestId });
  await tx.insert(ledger).values({ requestId, userId, entry: "credit_refunded", cents });
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

/* Everything the invite page shows. Discreet by design: nothing about friends at all, not who,
   not when, not how many. Only the balance and a statement of weekly lines. */
export async function overview(userId: string, now = new Date()) {
  const [code, cfg, bal] = await Promise.all([codeFor(userId), getConfig(), balance(userId)]);
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { freeFees: true } });
  const lines = await db.select().from(walletEntries).where(eq(walletEntries.userId, userId)).orderBy(desc(walletEntries.createdAt)).limit(30);
  return { code, cfg, balance: bal, freeFees: u?.freeFees ?? 0, lines, payoutsReady: (await access(userId)).caps.receivePayouts, nextCredit: nextPayout(now), minWithdraw: WITHDRAW_MIN_CENTS };
}

/* Back office: what the programme brings in. Per invited person: active or not, deals, money moved,
   what ByRequest kept and what the bonus cost. Per inviter: the same, added up. */
export async function adminList() {
  const rows = await db.execute(sql`
    select r.id, r.code, r.intent, r.created_at, r.first_deal_at, r.window_ends_at,
      ref.handle as referrer, fr.handle as friend,
      (select count(*)::int from deals d where d.status = 'released' and (d.creator_id = r.referee_id or d.buyer_id = r.referee_id)) as deals,
      (select coalesce(sum(d.deal_cents),0)::int from deals d where d.status = 'released' and (d.creator_id = r.referee_id or d.buyer_id = r.referee_id)) as gmv,
      (select coalesce(sum(d.deal_cents + d.fee_cents - d.creator_cents),0)::int from deals d where d.status = 'released' and (d.creator_id = r.referee_id or d.buyer_id = r.referee_id)) as revenue,
      (select coalesce(sum(w.cents),0)::int from referral_rewards w where w.referral_id = r.id and w.kind = 'creator_share') as bonus,
      (select coalesce(sum(q.fee_gift_cents),0)::int from requests q where q.buyer_id = r.referee_id) as gifts
    from referrals r join users ref on ref.id = r.referrer_id join users fr on fr.id = r.referee_id
    order by r.created_at desc limit 300`);
  type Row = { id: string; code: string; intent: string; created_at: Date; first_deal_at: Date | null; window_ends_at: Date | null; referrer: string; friend: string; deals: number; gmv: number; revenue: number; bonus: number; gifts: number };
  const list = (rows.rows ?? rows) as unknown as Row[];
  const by = new Map<string, { referrer: string; friends: number; active: number; deals: number; gmv: number; revenue: number; cost: number }>();
  for (const r of list) {
    const x = by.get(r.referrer) ?? { referrer: r.referrer, friends: 0, active: 0, deals: 0, gmv: 0, revenue: 0, cost: 0 };
    x.friends++; if (r.deals > 0) x.active++; x.deals += r.deals; x.gmv += r.gmv; x.revenue += r.revenue; x.cost += r.bonus + r.gifts;
    by.set(r.referrer, x);
  }
  const events = await db.select().from(referralEvents).orderBy(desc(referralEvents.createdAt)).limit(200);
  const [wallet] = await db.select({ c: sql<number>`coalesce(sum(${walletEntries.cents}),0)::int` }).from(walletEntries);
  const totals = list.reduce((t, r) => ({ friends: t.friends + 1, active: t.active + (r.deals > 0 ? 1 : 0), deals: t.deals + r.deals, gmv: t.gmv + r.gmv, revenue: t.revenue + r.revenue, cost: t.cost + r.bonus + r.gifts }), { friends: 0, active: 0, deals: 0, gmv: 0, revenue: 0, cost: 0 });
  return { rows: list, inviters: [...by.values()].sort((a, b) => b.revenue - a.revenue), events, totals, openBalances: wallet?.c ?? 0 };
}
