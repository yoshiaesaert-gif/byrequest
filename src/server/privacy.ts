import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { log } from "./onboarding";
import { RuleError } from "@/domain/rules";
import { RETENTION } from "@/config/compliance";
import { lt, isNotNull, sql } from "drizzle-orm";

/* GDPR art. 15 and 20: everything ByRequest holds about you, in one file. Chats are exported as
   stored: encrypted. Only your devices hold the keys. Provider results stay summarised. */
const S = schema;
export async function exportData(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(S.users.id, userId) });
  if (!u) throw new RuleError("Not found.");
  const [reqs, offers, deals, consents, notifications, decisions, appeals, checks, msgs] = await Promise.all([
    db.select().from(S.requests).where(eq(S.requests.buyerId, userId)),
    db.select().from(S.offers).where(eq(S.offers.creatorId, userId)),
    db.select().from(S.deals).where(or(eq(S.deals.buyerId, userId), eq(S.deals.creatorId, userId))),
    db.select().from(S.consents).where(eq(S.consents.userId, userId)),
    db.select().from(S.notifications).where(eq(S.notifications.userId, userId)),
    db.select().from(S.decisions).where(eq(S.decisions.userId, userId)),
    db.select().from(S.appeals).where(eq(S.appeals.userId, userId)),
    db.select({ purpose: S.identityChecks.purpose, provider: S.identityChecks.provider, status: S.identityChecks.status, over18: S.identityChecks.over18, at: S.identityChecks.updatedAt }).from(S.identityChecks).where(eq(S.identityChecks.userId, userId)),
    db.select({ dealId: S.messages.dealId, kind: S.messages.kind, mine: S.messages.senderId, at: S.messages.createdAt, body: S.messages.body }).from(S.messages).where(eq(S.messages.senderId, userId)),
  ]);
  await log(db, `user:${userId}`, "privacy.export", userId);
  return {
    exportedAt: new Date().toISOString(),
    account: { handle: u.handle, email: u.email, birthYear: u.birthYear, country: u.country, createdAt: u.createdAt, marketingOptIn: u.marketingOptIn, sensitiveConsentAt: u.sensitiveConsentAt, ageVerifiedAt: u.ageVerifiedAt, prefs: u.prefs },
    requests: reqs, offers, deals, consents, notifications, decisions, appeals, verificationChecks: checks,
    messagesYouSent: { note: "End to end encrypted. Only your devices can decrypt them.", items: msgs },
  };
}

/* GDPR art. 17. The account is erased and the username freed. What the law makes us keep stays,
   separately and locked: payment and tax records (bookkeeping), and for creators the verification
   result for the statutory period. Open deals must finish first, so nobody loses money. */
export async function deleteAccount(userId: string) {
  const open = await db.select({ id: S.deals.id }).from(S.deals).where(and(or(eq(S.deals.buyerId, userId), eq(S.deals.creatorId, userId)), inArray(S.deals.status, ["held", "reviewing", "delivered", "disputed"]))).limit(1);
  if (open.length) throw new RuleError("Finish or cancel your open deals first. Then you can delete your account.");
  const tag = userId.slice(0, 8);
  await db.transaction(async (tx) => {
    await tx.delete(S.sessions).where(eq(S.sessions.userId, userId));
    await tx.delete(S.notifications).where(eq(S.notifications.userId, userId));
    await tx.delete(S.saves).where(eq(S.saves.userId, userId));
    await tx.update(S.requests).set({ status: "closed" }).where(and(eq(S.requests.buyerId, userId), eq(S.requests.status, "open")));
    await tx.update(S.offers).set({ status: "withdrawn" }).where(and(eq(S.offers.creatorId, userId), eq(S.offers.status, "pending")));
    await tx.update(S.vaultItems).set({ availableUntil: new Date() }).where(eq(S.vaultItems.buyerId, userId));
    await tx.update(S.creatorProfiles).set({ visibility: "offer_only", bio: "", makes: [], never: [] }).where(eq(S.creatorProfiles.userId, userId));
    await tx.update(S.users).set({ email: `deleted+${tag}@invalid.byrequest`, handle: `deleted_${tag}`, avatar: null, publicKey: null, marketingOptIn: false, deletedAt: new Date(), bannedAt: new Date(), banReason: "Deleted by the user" }).where(eq(S.users.id, userId));
    await tx.insert(S.audit).values({ actor: `user:${userId}`, action: "privacy.account_deleted", subjectUserId: userId });
  });
}

/* Storage limitation (GDPR art. 5(1)(e)). Runs with the minute scheduler; each step is cheap. */
export async function purgeExpired() {
  const months = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
  const chats = await db.delete(S.messages).where(and(eq(S.messages.kind, "e2e"), sql`${S.messages.dealId} in (select id from deals where status in ('released','refunded') and settled_at < ${months(RETENTION.chatMonthsAfterDeal)})`)).returning({ id: S.messages.id });
  const notes = await db.delete(S.notifications).where(lt(S.notifications.createdAt, months(RETENTION.notificationMonths))).returning({ id: S.notifications.id });
  const contacts = await db.update(S.reports).set({ contactSealed: null }).where(and(isNotNull(S.reports.contactSealed), isNotNull(S.reports.handledAt), lt(S.reports.handledAt, months(RETENTION.reportContactMonths)))).returning({ id: S.reports.id });
  const codes = await db.delete(S.loginCodes).where(lt(S.loginCodes.expiresAt, new Date())).returning({ email: S.loginCodes.email });
  return { chats: chats.length, notifications: notes.length, reportContacts: contacts.length, loginCodes: codes.length };
}
