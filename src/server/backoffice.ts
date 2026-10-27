import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { log } from "./onboarding";
import { RuleError } from "@/domain/rules";

/* Read models and staff actions for the back office. Money figures mirror what the payment
   partner reports through signed events: ByRequest holds no funds and runs no wallet. */
const S = schema;
const OPEN_DEAL = ["held", "reviewing", "delivered", "disputed"] as const;
const days = (n: number) => new Date(Date.now() - n * 86_400_000);
const sum = (c: SQL | typeof S.ledger.cents) => sql<number>`coalesce(sum(${c}), 0)::int`;

export async function overview() {
  const d30 = days(30), d7 = days(7);
  const [[req], [dl], [held], money, [rev], [disp], [rem], [app], creators, recent, oldestReview] = await Promise.all([
    db.select({ open: sql<number>`count(*) filter (where ${S.requests.status} = 'open')::int`, week: sql<number>`count(*) filter (where ${S.requests.createdAt} >= ${d7})::int` }).from(S.requests),
    db.select({ active: sql<number>`count(*) filter (where ${S.deals.status} in ('held','reviewing','delivered','disputed'))::int`, week: sql<number>`count(*) filter (where ${S.deals.createdAt} >= ${d7})::int`, done30: sql<number>`count(*) filter (where ${S.deals.status} = 'released' and ${S.deals.settledAt} >= ${d30})::int` }).from(S.deals),
    db.select({ cents: sum(sql`${S.deals.dealCents} + ${S.deals.feeCents}`) }).from(S.deals).where(inArray(S.deals.status, [...OPEN_DEAL])),
    db.select({ entry: S.ledger.entry, cents: sum(S.ledger.cents) }).from(S.ledger).where(gte(S.ledger.createdAt, d30)).groupBy(S.ledger.entry),
    db.select({ n: count() }).from(S.deliveries).where(inArray(S.deliveries.review, ["pending_review", "blocked_participants"])),
    db.select({ n: count() }).from(S.disputes).where(eq(S.disputes.outcome, "open")),
    db.select({ n: count() }).from(S.removalRequests).where(eq(S.removalRequests.status, "received")),
    db.select({ n: count() }).from(S.appeals).where(eq(S.appeals.status, "open")),
    db.select({ identity: S.onboarding.identity, payout: S.onboarding.payout, restriction: S.onboarding.restriction }).from(S.onboarding),
    auditRows({ limit: 8 }),
    db.select({ at: S.deliveries.createdAt }).from(S.deliveries).where(eq(S.deliveries.review, "pending_review")).orderBy(S.deliveries.createdAt).limit(1),
  ]);
  const m = Object.fromEntries(money.map((x) => [x.entry, x.cents])) as Record<string, number>;
  return {
    requests: req, deals: dl, heldCents: held.cents,
    money30: { charged: m.buyer_charge ?? 0, revenue: m.platform_revenue ?? 0, payouts: m.creator_payout ?? 0, refunds: m.buyer_refund ?? 0, onHold: m.payout_on_hold ?? 0 },
    queues: {
      review: rev.n, disputes: disp.n, removals: rem.n, appeals: app.n,
      verifying: creators.filter((c) => c.identity === "pending" || c.payout === "pending").length,
      actionRequired: creators.filter((c) => c.identity === "action_required" || c.payout === "action_required").length,
      restricted: creators.filter((c) => c.restriction !== "none").length,
      oldestReview: oldestReview[0]?.at ?? null,
    },
    recent,
  };
}

/* ---------- users ---------- */
export async function searchUsers(q: string, kind: "all" | "creators" | "buyers" | "banned") {
  const t = q.trim();
  const where = and(
    t ? or(ilike(S.users.handle, `%${t}%`), ilike(S.users.email, `%${t}%`)) : undefined,
    kind === "creators" ? eq(S.users.isCreator, true) : kind === "buyers" ? eq(S.users.isCreator, false) : kind === "banned" ? sql`${S.users.bannedAt} is not null` : undefined,
  );
  return db.select({
    id: S.users.id, handle: S.users.handle, email: S.users.email, isCreator: S.users.isCreator, bannedAt: S.users.bannedAt, createdAt: S.users.createdAt, avatar: S.users.avatar,
    bought: sql<number>`(select count(*)::int from deals d where d.buyer_id = "users"."id")`,
    sold: sql<number>`(select count(*)::int from deals d where d.creator_id = "users"."id")`,
    staff: sql<string | null>`(select s.role::text from staff s where s.user_id = "users"."id")`,
  }).from(S.users).where(where).orderBy(desc(S.users.createdAt)).limit(60);
}

export async function userDetail(id: string) {
  const u = await db.query.users.findFirst({ where: eq(S.users.id, id) });
  if (!u) return null;
  const [reqs, deals, offers, staff, history, onb] = await Promise.all([
    db.select({ id: S.requests.id, title: S.requests.title, status: S.requests.status, dealCents: S.requests.dealCents, createdAt: S.requests.createdAt }).from(S.requests).where(eq(S.requests.buyerId, id)).orderBy(desc(S.requests.createdAt)).limit(20),
    db.select({ d: S.deals, title: S.requests.title }).from(S.deals).innerJoin(S.requests, eq(S.requests.id, S.deals.requestId)).where(or(eq(S.deals.buyerId, id), eq(S.deals.creatorId, id))).orderBy(desc(S.deals.createdAt)).limit(30),
    db.select({ n: count() }).from(S.offers).where(eq(S.offers.creatorId, id)),
    db.query.staff.findFirst({ where: eq(S.staff.userId, id) }),
    auditRows({ subject: id, limit: 40 }),
    db.query.onboarding.findFirst({ where: eq(S.onboarding.userId, id) }),
  ]);
  return { u, reqs, deals, offers: offers[0].n, staff: staff?.role ?? null, history, onboarding: onb ?? null };
}

/* Account level block. Separate from the creator restriction, which only covers selling. */
export async function setBan(staffId: string, userId: string, ban: boolean, reason: string) {
  if (staffId === userId) throw new RuleError("You cannot block your own account.");
  if (ban && reason.trim().length < 5) throw new RuleError("Give a reason.");
  await db.update(S.users).set({ bannedAt: ban ? new Date() : null, banReason: ban ? reason.slice(0, 300) : null }).where(eq(S.users.id, userId));
  if (ban) await db.delete(S.sessions).where(eq(S.sessions.userId, userId));
  await log(db, `staff:${staffId}`, ban ? "staff.account_blocked" : "staff.account_unblocked", userId, ban ? { reason: reason.slice(0, 300) } : {});
}

/* ---------- money ---------- */
export async function moneyView() {
  const d30 = days(30);
  const [byStatus, entries30, entriesAll, rows] = await Promise.all([
    db.select({ status: S.deals.status, n: count(), cents: sum(sql`${S.deals.dealCents} + ${S.deals.feeCents}`) }).from(S.deals).groupBy(S.deals.status),
    db.select({ entry: S.ledger.entry, cents: sum(S.ledger.cents), n: count() }).from(S.ledger).where(gte(S.ledger.createdAt, d30)).groupBy(S.ledger.entry),
    db.select({ entry: S.ledger.entry, cents: sum(S.ledger.cents), n: count() }).from(S.ledger).groupBy(S.ledger.entry),
    db.select({ l: S.ledger, handle: S.users.handle, title: S.requests.title }).from(S.ledger)
      .leftJoin(S.users, eq(S.users.id, S.ledger.userId)).leftJoin(S.deals, eq(S.deals.id, S.ledger.dealId)).leftJoin(S.requests, eq(S.requests.id, S.deals.requestId))
      .orderBy(desc(S.ledger.createdAt)).limit(40),
  ]);
  return { byStatus, entries30, entriesAll, rows };
}

/* ---------- team ---------- */
export async function team() {
  return db.select({ userId: S.staff.userId, role: S.staff.role, handle: S.users.handle, email: S.users.email }).from(S.staff).innerJoin(S.users, eq(S.users.id, S.staff.userId)).orderBy(S.users.handle);
}

export async function setStaffRole(staffId: string, who: string, role: "none" | "support" | "admin") {
  const t = who.trim().toLowerCase();
  if (!t) throw new RuleError("Enter a username or email.");
  const u = await db.query.users.findFirst({ where: or(eq(S.users.handle, t), eq(S.users.email, t)) });
  if (!u) throw new RuleError("No account with that username or email. They need to sign up first.");
  if (u.id === staffId && role !== "admin") throw new RuleError("You cannot lower your own role.");
  if (role === "none") await db.delete(S.staff).where(eq(S.staff.userId, u.id));
  else await db.insert(S.staff).values({ userId: u.id, role }).onConflictDoUpdate({ target: S.staff.userId, set: { role } });
  await log(db, `staff:${staffId}`, "staff.role_changed", u.id, { role });
  return u.handle;
}

/* ---------- audit ---------- */
export async function auditRows(f: { q?: string; subject?: string; limit?: number }) {
  const t = f.q?.trim();
  const rows = await db.select({ a: S.audit, handle: S.users.handle }).from(S.audit).leftJoin(S.users, eq(S.users.id, S.audit.subjectUserId))
    .where(and(f.subject ? eq(S.audit.subjectUserId, f.subject) : undefined, t ? or(ilike(S.audit.action, `%${t}%`), ilike(S.audit.actor, `%${t}%`), ilike(S.users.handle, `%${t}%`)) : undefined))
    .orderBy(desc(S.audit.at)).limit(f.limit ?? 100);
  // Resolve staff:<id> and user:<id> actors to a username, so the log reads without lookups.
  const ids = [...new Set(rows.map((r) => r.a.actor.match(/^(?:staff|user):([0-9a-f-]{36})$/)?.[1]).filter(Boolean) as string[])];
  const names = ids.length ? Object.fromEntries((await db.select({ id: S.users.id, handle: S.users.handle }).from(S.users).where(inArray(S.users.id, ids))).map((x) => [x.id, x.handle])) : {};
  return rows.map((r) => {
    const m = r.a.actor.match(/^(staff|user):([0-9a-f-]{36})$/);
    return { ...r.a, subject: r.handle, by: m ? `${m[1] === "staff" ? "staff " : ""}${names[m[2]] ?? "unknown"}` : r.a.actor };
  });
}
