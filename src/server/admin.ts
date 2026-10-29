import "server-only";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "./auth";
import { access, log } from "./onboarding";
import { issueDecision } from "./decisions";
import { unseal } from "./seal";
import { RuleError } from "@/domain/rules";

const S = schema;

export async function requireStaff(min: "support" | "admin" = "support") {
  const u = await requireUser();
  const s = await db.query.staff.findFirst({ where: eq(S.staff.userId, u.id) });
  // Say why instead of silently sending someone home.
  if (!s || s.role === "none") redirect("/staff-only");
  if (min === "admin" && s.role !== "admin") redirect("/admin?need=admin");
  return { user: u, role: s.role };
}

export async function creatorsOverview() {
  const rows = await db.select({ o: S.onboarding, handle: S.users.handle, createdAt: S.users.createdAt }).from(S.onboarding).innerJoin(S.users, eq(S.users.id, S.onboarding.userId)).orderBy(desc(S.onboarding.updatedAt));
  return Promise.all(rows.map(async (r) => ({ ...r, access: await access(r.o.userId) })));
}

export async function creatorDetail(userId: string) {
  const [u, a, checks, payouts, consents, parts, auditRows, appeals] = await Promise.all([
    db.query.users.findFirst({ where: eq(S.users.id, userId), columns: { id: true, handle: true, createdAt: true, bannedAt: true, banReason: true } }),
    access(userId),
    db.select().from(S.identityChecks).where(eq(S.identityChecks.userId, userId)).orderBy(desc(S.identityChecks.createdAt)),
    db.select().from(S.payoutAccounts).where(eq(S.payoutAccounts.userId, userId)),
    db.select().from(S.consents).where(eq(S.consents.userId, userId)).orderBy(desc(S.consents.acceptedAt)),
    db.select({ id: S.participants.id, label: S.participants.label, identity: S.participants.identity, createdAt: S.participants.createdAt }).from(S.participants).where(eq(S.participants.creatorId, userId)),
    db.select().from(S.audit).where(eq(S.audit.subjectUserId, userId)).orderBy(desc(S.audit.at)).limit(80),
    db.select().from(S.appeals).where(eq(S.appeals.userId, userId)).orderBy(desc(S.appeals.createdAt)),
  ]);
  const partConsents = parts.length ? await db.select().from(S.participantConsents).where(inArray(S.participantConsents.participantId, parts.map((p) => p.id))) : [];
  return { u, a, checks, payouts, consents, parts, partConsents, audit: auditRows, appeals };
}

/* Staff can ask for more information. They cannot mark identity or payouts as approved: those
   statuses only change through signed provider events. */
export async function requestInfo(staffId: string, userId: string, area: "identity" | "payout" | "agreement", message: string) {
  await db.update(S.onboarding).set({ [area]: "action_required", updatedAt: new Date() }).where(eq(S.onboarding.userId, userId));
  await db.insert(S.notifications).values({ userId, title: "Action needed", body: "Your creator setup needs one more step.", href: "/onboarding" });
  await log(db, `staff:${staffId}`, "staff.request_info", userId, { area, message: message.slice(0, 500) });
}

export async function setRestriction(staffId: string, userId: string, level: "none" | "restricted" | "suspended", reason: string) {
  if (level !== "none" && reason.trim().length < 5) throw new RuleError("Give a reason.");
  const o = await db.query.onboarding.findFirst({ where: eq(S.onboarding.userId, userId) });
  if (level === "none" && o?.restrictionReason === "Age requirement not met") throw new RuleError("An age based suspension cannot be lifted here.");
  await db.update(S.onboarding).set({ restriction: level, restrictionReason: level === "none" ? null : reason, updatedAt: new Date() }).where(eq(S.onboarding.userId, userId));
  await log(db, `staff:${staffId}`, "staff.restriction", userId, { level, reason });
  await issueDecision(db, { userId, action: level === "none" ? "creator_restriction_lifted" : level === "restricted" ? "creator_restricted" : "creator_suspended", ground: "terms", facts: level === "none" ? "After review the restriction was lifted." : reason, scope: level === "suspended" ? "Selling: no offers, uploads or payouts. Buying stays possible." : level === "restricted" ? "Selling: no new offers until this is solved." : "Selling.", decidedBy: "staff" });
}

export async function answerAppeal(staffId: string, appealId: string, answer: string) {
  const a = await db.query.appeals.findFirst({ where: eq(S.appeals.id, appealId) });
  if (!a) throw new RuleError("Not found.");
  await db.update(S.appeals).set({ status: "answered", answer: answer.slice(0, 1000) }).where(eq(S.appeals.id, appealId));
  await db.insert(S.notifications).values({ userId: a.userId, title: "Reply from support", body: "There is a reply to your request.", href: "/onboarding" });
  await log(db, `staff:${staffId}`, "staff.appeal_answered", a.userId, { appealId });
}

/* Reading confidential identity data requires a purpose and is always logged. Admins only. */
export async function revealIdentity(staffId: string, userId: string, purpose: string) {
  if (purpose.trim().length < 8) throw new RuleError("State the purpose of this access.");
  const row = await db.query.confidentialIdentity.findFirst({ where: eq(S.confidentialIdentity.userId, userId) });
  await log(db, `staff:${staffId}`, "confidential.read", userId, { purpose: purpose.slice(0, 200), found: !!row });
  return row ? unseal<{ legalName?: string; dateOfBirth?: string; country?: string }>(row.sealed) : null;
}

export async function reviewQueue() {
  const dls = await db.select({ dl: S.deliveries, title: S.requests.title, category: S.requests.category, amount: S.requests.amount, creator: S.users.handle })
    .from(S.deliveries).innerJoin(S.deals, eq(S.deals.id, S.deliveries.dealId)).innerJoin(S.requests, eq(S.requests.id, S.deals.requestId)).innerJoin(S.users, eq(S.users.id, S.deliveries.creatorId))
    .where(inArray(S.deliveries.review, ["pending_review", "blocked_participants"])).orderBy(S.deliveries.createdAt);
  const albums = await db.select({ p: S.previewPhotos, creator: S.users.handle }).from(S.previewPhotos).innerJoin(S.users, eq(S.users.id, S.previewPhotos.creatorId)).where(eq(S.previewPhotos.status, "in_review"));
  const disputes = await db.select({ dp: S.disputes, title: S.requests.title }).from(S.disputes).innerJoin(S.deals, eq(S.deals.id, S.disputes.dealId)).innerJoin(S.requests, eq(S.requests.id, S.deals.requestId)).where(eq(S.disputes.outcome, "open"));
  const removals = await db.select().from(S.removalRequests).where(eq(S.removalRequests.status, "received"));
  const ids = [...dls.flatMap((d) => d.dl.mediaIds), ...albums.map((a) => a.p.mediaId)];
  const mimes = Object.fromEntries(ids.length ? (await db.select({ id: S.media.id, mime: S.media.mime }).from(S.media).where(inArray(S.media.id, ids))).map((m) => [m.id, m.mime]) : []);
  return { dls, albums, disputes, removals, mimes };
}

export async function setRemoval(staffId: string, id: string, status: "content_hidden" | "resolved" | "rejected") {
  await db.update(S.removalRequests).set({ status }).where(eq(S.removalRequests.id, id));
  await log(db, `staff:${staffId}`, "removal.status", null, { removalId: id, status });
}
