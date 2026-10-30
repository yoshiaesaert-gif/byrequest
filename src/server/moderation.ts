import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { screen } from "@/domain/screening";
import { RuleError } from "@/domain/rules";
import { log } from "./onboarding";
import { issueDecision } from "./decisions";
import { notify, refundRequest } from "./deals";

/* Request moderation. A new request waits in review, the automatic check adds a suggestion, staff
   approve or reject it, and staff can edit every request afterwards. Every step is in the audit log. */
const S = schema;
const AUTO_KEY = "auto_approve_clean";

/* Runs the automatic check and stores the result on the request. */
export async function screenRequest(id: string) {
  const r = await db.query.requests.findFirst({ where: eq(S.requests.id, id) });
  if (!r) return null;
  const week = new Date(Date.now() - 7 * 86_400_000);
  const [buyer, recent, [rej], [done]] = await Promise.all([
    db.query.users.findFirst({ where: eq(S.users.id, r.buyerId), columns: { ageVerifiedAt: true, house: true } }),
    db.select({ title: S.requests.title }).from(S.requests).where(and(eq(S.requests.buyerId, r.buyerId), ne(S.requests.id, id), gte(S.requests.createdAt, week))),
    db.select({ n: count() }).from(S.requests).where(and(eq(S.requests.buyerId, r.buyerId), eq(S.requests.status, "rejected"))),
    db.select({ n: count() }).from(S.deals).where(and(eq(S.deals.buyerId, r.buyerId), eq(S.deals.status, "released"))),
  ]);
  // The way the buyer wants to be addressed is checked together with the description.
  const out = screen({ ...r, details: r.callMe ? `${r.details}\n${r.callMe}` : r.details }, { recentTitles: recent.map((x) => x.title), buyerAgeVerified: !!buyer?.ageVerifiedAt, buyerRejected: rej.n, buyerDeals: done.n });
  await db.update(S.requests).set({ checkVerdict: out.verdict, checkFlags: out.flags }).where(eq(S.requests.id, id));
  return out;
}

/* Called right after a buyer posts. Clean requests can go live by themselves when staff turned that on. */
export async function queueNew(id: string) {
  const out = await screenRequest(id);
  if (out?.verdict === "approve" && (await autoApprove())) await approve(null, id, "Approved automatically: the check found nothing.");
}

export async function autoApprove() {
  const row = await db.query.settings.findFirst({ where: eq(S.settings.key, AUTO_KEY) });
  return row?.value === 1;
}
export async function setAutoApprove(staffId: string, on: boolean) {
  await db.insert(S.settings).values({ key: AUTO_KEY, value: on ? 1 : 0 }).onConflictDoUpdate({ target: S.settings.key, set: { value: on ? 1 : 0, updatedAt: new Date() } });
  await log(db, `staff:${staffId}`, "staff.auto_approve", null, { on });
}

/* Approving starts the request's own window from now, so time spent in review is not lost. */
export async function approve(staffId: string | null, id: string, note = "") {
  const r = await db.query.requests.findFirst({ where: eq(S.requests.id, id) });
  if (!r) throw new RuleError("Request not found.");
  if (r.status !== "in_review" && r.status !== "rejected") throw new RuleError("This request is not waiting for review.");
  const window = Math.max(2 * 3_600_000, r.closesAt.getTime() - r.createdAt.getTime());
  await db.transaction(async (tx) => {
    await tx.update(S.requests).set({ status: "open", closesAt: new Date(Date.now() + window), reviewedBy: staffId, reviewedAt: new Date(), reviewNote: note.slice(0, 300) || null }).where(eq(S.requests.id, id));
    await log(tx, staffId ? `staff:${staffId}` : "system:auto_review", "staff.request_approved", r.buyerId, { request: id, note: note.slice(0, 300) });
    await notify(tx, r.buyerId, "Your request is live", "Creators can now make offers.", `/requests/${id}/offers`);
  });
}

export async function reject(staffId: string, id: string, reason: string) {
  if (reason.trim().length < 5) throw new RuleError("Give a reason.");
  const r = await db.query.requests.findFirst({ where: eq(S.requests.id, id) });
  if (!r) throw new RuleError("Request not found.");
  if (r.status !== "in_review" && r.status !== "open") throw new RuleError("Only requests in review or open can be rejected.");
  await db.transaction(async (tx) => {
    await tx.update(S.requests).set({ status: "rejected", reviewedBy: staffId, reviewedAt: new Date(), reviewNote: reason.slice(0, 300) }).where(eq(S.requests.id, id));
    await tx.update(S.offers).set({ status: "declined" }).where(and(eq(S.offers.requestId, id), eq(S.offers.status, "pending")));
    await log(tx, `staff:${staffId}`, "staff.request_rejected", r.buyerId, { request: id, reason: reason.slice(0, 300) });
    await issueDecision(tx, { userId: r.buyerId, action: "request_rejected", ground: "terms", facts: reason, scope: `Your request "${r.title.slice(0, 80)}" was not published. Your account is not affected. You can post a new request that follows the rules.`, decidedBy: "staff" });
  });
  await refundRequest(id, "rejected in review");
}

/* ---------- lists ---------- */
const reqCols = {
  r: S.requests, buyer: S.users.handle, house: S.users.house, internal: sql<boolean>`(${S.users.house} or ${S.users.internal})`,
  offers: sql<number>`(select count(*)::int from offers o where o.request_id = "requests"."id" and o.status <> 'withdrawn')`,
};

export async function reviewQueue() {
  return db.select(reqCols).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId))
    .where(eq(S.requests.status, "in_review")).orderBy(S.requests.createdAt).limit(100);
}

export const STATUSES = ["in_review", "open", "matched", "closed", "expired", "rejected"] as const;
export async function listRequests(f: { q?: string; status?: string; category?: string; source?: string; page?: number }) {
  const t = f.q?.trim();
  const where: (SQL | undefined)[] = [
    t ? or(ilike(S.requests.title, `%${t}%`), ilike(S.requests.details, `%${t}%`), ilike(S.users.handle, `%${t}%`)) : undefined,
    f.status && (STATUSES as readonly string[]).includes(f.status) ? eq(S.requests.status, f.status as "open") : undefined,
    f.category ? eq(S.requests.category, f.category as "video") : undefined,
    f.source === "team" ? eq(S.users.house, true) : f.source === "internal" ? sql`(${S.users.house} or ${S.users.internal})` : f.source === "external" ? sql`not (${S.users.house} or ${S.users.internal})` : undefined,
  ];
  const page = Math.max(0, f.page ?? 0);
  const [rows, [total], byStatus] = await Promise.all([
    db.select(reqCols).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId)).where(and(...where)).orderBy(desc(S.requests.createdAt)).limit(50).offset(page * 50),
    db.select({ n: count() }).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId)).where(and(...where)),
    db.select({ status: S.requests.status, n: count() }).from(S.requests).groupBy(S.requests.status),
  ]);
  return { rows, total: total.n, byStatus: Object.fromEntries(byStatus.map((x) => [x.status, x.n])) as Record<string, number> };
}

export async function requestDetail(id: string) {
  const r = await db.query.requests.findFirst({ where: eq(S.requests.id, id) });
  if (!r) return null;
  const [buyer, offers, deal, history, reviewer] = await Promise.all([
    db.query.users.findFirst({ where: eq(S.users.id, r.buyerId), columns: { id: true, handle: true, house: true, buyerRatingSum: true, buyerRatingCount: true, ageVerifiedAt: true, createdAt: true } }),
    db.select({ o: S.offers, handle: S.users.handle }).from(S.offers).innerJoin(S.users, eq(S.users.id, S.offers.creatorId)).where(eq(S.offers.requestId, id)).orderBy(S.offers.createdAt),
    db.query.deals.findFirst({ where: eq(S.deals.requestId, id) }),
    db.select({ a: S.audit, by: S.users.handle }).from(S.audit).leftJoin(S.users, sql`${S.audit.actor} = 'staff:' || ${S.users.id}::text`)
      .where(sql`${S.audit.detail}->>'request' = ${id}`).orderBy(desc(S.audit.at)).limit(40),
    r.reviewedBy ? db.query.users.findFirst({ where: eq(S.users.id, r.reviewedBy), columns: { handle: true } }) : null,
  ]);
  return { r, buyer, offers, deal, history, reviewer: reviewer?.handle ?? null };
}

export async function counts() {
  const [[q]] = await Promise.all([db.select({ n: count() }).from(S.requests).where(eq(S.requests.status, "in_review"))]);
  return { inReview: q.n };
}

/* ---------- editing ---------- */
export const Edit = z.object({
  title: z.string().trim().min(3).max(70),
  details: z.string().trim().max(600),
  category: z.enum(["video", "photos", "voice", "custom", "worn"]),
  amount: z.coerce.number().int().min(1).max(120),
  budget: z.coerce.number().int().min(10).max(5000),
  who: z.enum(["Man", "Woman", "Anyone"]),
  ageMin: z.coerce.number().int().min(18).max(80),
  ageMax: z.coerce.number().int().min(18).max(99),
  face: z.enum(["not_needed", "optional", "required"]),
  minVault: z.enum(["7d", "30d", "1y", "forever"]),
  dueHours: z.coerce.number().int().min(12).max(336),
  lang: z.enum(["nl", "en", "fr"]),
  cover: z.string().trim().max(12).nullable(),
  status: z.enum(STATUSES),
  extendHours: z.coerce.number().int().min(0).max(720).default(0),
  reason: z.string().trim().max(300).default(""),
});
export type EditInput = z.input<typeof Edit>;

const LOCKED_AFTER_DEAL = ["category", "amount", "budget", "who", "ageMin", "ageMax", "face", "minVault", "dueHours"] as const;

export async function edit(staffId: string, id: string, input: EditInput) {
  const p = Edit.safeParse(input);
  if (!p.success) throw new RuleError(`${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}`);
  const v = p.data;
  if (v.ageMin > v.ageMax) throw new RuleError("Check the age range.");
  const r = await db.query.requests.findFirst({ where: eq(S.requests.id, id) });
  if (!r) throw new RuleError("Request not found.");
  const deal = await db.query.deals.findFirst({ where: eq(S.deals.requestId, id), columns: { id: true } });
  const before: Record<string, unknown> = { title: r.title, details: r.details, category: r.category, amount: r.amount, budget: r.dealCents / 100, who: r.who, ageMin: r.ageMin, ageMax: r.ageMax, face: r.face, minVault: r.minVault, dueHours: r.dueHours, lang: r.lang, cover: r.cover, status: r.status };
  const after: Record<string, unknown> = { ...before, ...Object.fromEntries(Object.entries(v).filter(([k]) => k in before)) };
  // The terms of an accepted deal are fixed; only the wording and the cover can still change.
  if (deal) for (const k of LOCKED_AFTER_DEAL) if (after[k] !== before[k]) throw new RuleError(`This request has a deal, so ${k} can no longer change.`);
  if (r.payRef && !r.refundedAt && after.budget !== before.budget) throw new RuleError("The buyer already paid this budget, so it can no longer change.");
  if (after.status !== before.status) {
    const ok: Record<string, string[]> = { open: ["closed"], closed: ["open"], expired: ["open", "closed"], in_review: [], rejected: [], matched: [] };
    if (!ok[r.status]?.includes(after.status as string)) throw new RuleError(`Status cannot go from ${r.status} to ${after.status} here. Use approve or reject for requests in review.`);
  }
  const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
  if (!changed.length && !v.extendHours) return { changed: [] };
  let closesAt = r.closesAt;
  if (v.extendHours) closesAt = new Date(Math.max(Date.now(), r.closesAt.getTime()) + v.extendHours * 3_600_000);
  if (after.status === "open" && closesAt < new Date()) closesAt = new Date(Date.now() + 24 * 3_600_000);
  await db.transaction(async (tx) => {
    await tx.update(S.requests).set({
      title: v.title, details: v.details, category: v.category, amount: v.amount, dealCents: v.budget * 100, who: v.who, ageMin: v.ageMin, ageMax: v.ageMax,
      face: v.face, minVault: v.minVault, dueHours: v.dueHours, lang: v.lang, cover: v.cover || null, status: v.status, closesAt, staffEditedAt: new Date(),
    }).where(eq(S.requests.id, id));
    if (after.status === "closed" && before.status === "open") await tx.update(S.offers).set({ status: "declined" }).where(and(eq(S.offers.requestId, id), eq(S.offers.status, "pending")));
    await log(tx, `staff:${staffId}`, "staff.request_edited", r.buyerId, {
      request: id, reason: v.reason || undefined, extendHours: v.extendHours || undefined,
      changes: Object.fromEntries(changed.map((k) => [k, { from: before[k], to: after[k] }])),
    });
    const buyer = await tx.query.users.findFirst({ where: eq(S.users.id, r.buyerId), columns: { house: true } });
    if (!buyer?.house && changed.some((k) => k !== "cover")) await notify(tx, r.buyerId, "The ByRequest team edited your request", "Open it to see the current version.", `/requests/${id}/offers`);
  });
  if (after.status === "closed" && before.status === "open" && !deal) await refundRequest(id, "closed by staff");
  if (changed.includes("title") || changed.includes("details")) await screenRequest(id);
  return { changed };
}

export async function bulk(staffId: string, ids: string[], action: "approve" | "close") {
  const rows = await db.select({ id: S.requests.id, status: S.requests.status }).from(S.requests).where(inArray(S.requests.id, ids.slice(0, 100)));
  let n = 0;
  for (const r of rows) {
    if (action === "approve" && r.status === "in_review") { await approve(staffId, r.id); n++; }
    if (action === "close" && r.status === "open") {
      await db.update(S.requests).set({ status: "closed", staffEditedAt: new Date() }).where(eq(S.requests.id, r.id));
      await db.update(S.offers).set({ status: "declined" }).where(and(eq(S.offers.requestId, r.id), eq(S.offers.status, "pending")));
      await log(db, `staff:${staffId}`, "staff.request_closed", null, { request: r.id }); n++;
      await refundRequest(r.id, "closed by staff");
    }
  }
  return n;
}
