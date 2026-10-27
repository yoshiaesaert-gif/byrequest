import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import type { DocKind } from "@/db/compliance";
import { capabilities, creatorStatus, identityOutcome, missing, shouldApply, type Areas, type Check } from "@/domain/creator";
import { RuleError } from "@/domain/rules";
import { PROVIDER_ENV, RETENTION, activeProvider } from "@/config/compliance";
import { identityAdapter, payoutAdapter, type IdentityEvent, type PayoutEvent } from "./providers";
import { seal } from "./seal";

const { onboarding, identityChecks, payoutAccounts, documents, consents, providerEvents, audit, confidentialIdentity, users, participants, sessions } = schema;

export async function log(tx: Tx | typeof db, actor: string, action: string, subjectUserId: string | null, detail: Record<string, unknown> = {}) {
  await tx.insert(audit).values({ actor, action, subjectUserId, detail });
}

/* ---------- state ---------- */
export async function ensure(userId: string) {
  // Sign in requires an emailed code, so the address is verified for every account.
  await db.insert(onboarding).values({ userId, email: "approved" }).onConflictDoNothing();
  await db.update(users).set({ isCreator: true }).where(eq(users.id, userId));
  return (await db.query.onboarding.findFirst({ where: eq(onboarding.userId, userId) }))!;
}

export async function currentDoc(kind: DocKind) {
  return db.query.documents.findFirst({ where: and(eq(documents.kind, kind), eq(documents.current, true)) });
}

/* The agreement area is approved only for a consent to the exact current version and text hash. */
async function agreementStatus(userId: string, stored: Check): Promise<Check> {
  const doc = await currentDoc("creator_agreement");
  if (!doc) return "not_started";
  const c = await db.query.consents.findFirst({ where: and(eq(consents.userId, userId), eq(consents.documentId, doc.id), eq(consents.sha256, doc.sha256)) });
  if (c) return "approved";
  return stored === "approved" ? "action_required" : stored;   // a newer version needs a new acceptance
}

export async function bestPayout(userId: string) {
  const rows = await db.select().from(payoutAccounts).where(and(eq(payoutAccounts.userId, userId), eq(payoutAccounts.env, PROVIDER_ENV))).orderBy(desc(payoutAccounts.updatedAt));
  const active = activeProvider("payout")?.id;
  return rows.find((r) => r.provider === active) ?? null;
}

export async function access(userId: string) {
  const o = await db.query.onboarding.findFirst({ where: eq(onboarding.userId, userId) });
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!o || !u) {
    const areas: Areas = { email: "approved", identity: "not_started", payout: "not_started", agreement: "not_started", restriction: u?.bannedAt ? "suspended" : "none" };
    return { areas, status: creatorStatus(areas), caps: capabilities(areas, null), missing: missing(areas, null), payout: null, onboarding: null };
  }
  const p = await bestPayout(userId);
  const areas: Areas = {
    email: o.email, identity: o.identity, agreement: await agreementStatus(userId, o.agreement),
    payout: p ? p.status : o.payout,
    restriction: u.bannedAt ? "suspended" : o.restriction,
  };
  const caps = p ? { status: p.status, canReceivePayouts: p.canReceivePayouts, canProcessSales: p.canProcessSales } : null;
  return { areas, status: creatorStatus(areas), caps: capabilities(areas, caps), missing: missing(areas, caps), payout: p, onboarding: o };
}

export async function requireCap(userId: string, cap: "offer" | "upload" | "receivePayouts") {
  const a = await access(userId);
  if (!a.caps[cap]) {
    const what = cap === "offer" ? "make offers" : cap === "upload" ? "upload content" : "receive payouts";
    throw new RuleError(`Finish creator onboarding to ${what}. Missing: ${a.missing.join(", ") || "approval"}.`);
  }
  return a;
}

/* ---------- A. account ---------- */
export async function acceptDocs(userId: string, kinds: ("terms" | "privacy")[]) {
  for (const k of kinds) {
    const d = await currentDoc(k);
    if (!d) throw new RuleError("Document not available.");
    await db.insert(consents).values({ userId, documentId: d.id, kind: k, version: d.version, sha256: d.sha256, method: k === "privacy" ? "acknowledged_link" : "checkbox_and_button" });
    await log(db, `user:${userId}`, `consent.${k}`, userId, { version: d.version, sha256: d.sha256 });
  }
}
export async function hasCurrent(userId: string, kind: DocKind) {
  const d = await currentDoc(kind);
  if (!d) return false;
  return !!(await db.query.consents.findFirst({ where: and(eq(consents.userId, userId), eq(consents.documentId, d.id), eq(consents.sha256, d.sha256)) }));
}

/* ---------- B. identity ---------- */
export async function startIdentity(userId: string, returnUrl: string) {
  const ad = identityAdapter();
  if (!ad) throw new RuleError("Identity verification is not available yet in this environment.");
  const o = await db.query.onboarding.findFirst({ where: eq(onboarding.userId, userId) });
  if (o?.identity === "approved") throw new RuleError("Your identity is already verified.");
  if (o?.restriction === "suspended") throw new RuleError("This account is suspended.");
  const s = await ad.start({ subject: userId, returnUrl });
  await db.transaction(async (tx) => {
    await tx.insert(identityChecks).values({ userId, provider: ad.id, env: PROVIDER_ENV, externalRef: s.externalRef, status: "pending" });
    await tx.update(onboarding).set({ identity: "pending", lastStep: "identity", updatedAt: new Date() }).where(eq(onboarding.userId, userId));
    await log(tx, `user:${userId}`, "identity.started", userId, { provider: ad.id, env: PROVIDER_ENV });
  });
  return s.redirectUrl;
}

/* Webhook handler. Signature is verified by the adapter before this runs. Duplicates are ignored by
   the unique event key; delayed events older than the last applied one are recorded as stale. */
export async function applyIdentityEvent(provider: string, e: IdentityEvent) {
  return db.transaction(async (tx) => {
    const [ins] = await tx.insert(providerEvents).values({ provider, eventId: e.eventId, type: "identity", externalRef: e.externalRef, occurredAt: e.occurredAt }).onConflictDoNothing().returning();
    if (!ins) return "duplicate" as const;
    const [chk] = await tx.select().from(identityChecks).where(and(eq(identityChecks.provider, provider), eq(identityChecks.externalRef, e.externalRef))).for("update");
    if (!chk) { await tx.update(providerEvents).set({ outcome: "unknown_ref" }).where(eq(providerEvents.id, ins.id)); return "unknown_ref" as const; }
    if (!shouldApply(chk.lastEventAt, e.occurredAt)) { await tx.update(providerEvents).set({ outcome: "stale" }).where(eq(providerEvents.id, ins.id)); return "stale" as const; }
    const out = identityOutcome({ decision: e.decision, over18: e.over18 });
    await tx.update(identityChecks).set({ status: out.status, over18: e.over18 ?? null, documentChecked: e.documentChecked ?? null, livenessChecked: e.livenessChecked ?? null, missing: e.missing ?? [], reason: e.reason ?? (out.suspend ? "Age requirement not met" : null), expiresAt: e.expiresAt ?? null, lastEventAt: e.occurredAt, updatedAt: new Date() }).where(eq(identityChecks.id, chk.id));
    await tx.update(providerEvents).set({ outcome: "applied" }).where(eq(providerEvents.id, ins.id));
    if (chk.participantId) {
      await tx.update(participants).set({ identity: out.status }).where(eq(participants.id, chk.participantId));
      await log(tx, `provider:${provider}`, "participant.identity", null, { participantId: chk.participantId, status: out.status });
      return "applied" as const;
    }
    const userId = chk.userId!;
    await tx.update(onboarding).set({ identity: out.status, updatedAt: new Date() }).where(eq(onboarding.userId, userId));
    if (out.status === "approved" && e.person) {
      const retain = new Date(); retain.setFullYear(retain.getFullYear() + RETENTION.confidentialIdentityYears);
      const sealed = seal(e.person);
      await tx.insert(confidentialIdentity).values({ userId, sealed, source: provider, retainUntil: retain }).onConflictDoUpdate({ target: confidentialIdentity.userId, set: { sealed, source: provider, retainUntil: retain, updatedAt: new Date() } });
      const y = Number(e.person.dateOfBirth?.slice(0, 4));
      if (y) await tx.update(users).set({ birthYear: y }).where(eq(users.id, userId)); // shown age follows the verified year
    }
    if (out.suspend) {
      await tx.update(onboarding).set({ restriction: "suspended", restrictionReason: "Age requirement not met" }).where(eq(onboarding.userId, userId));
      await tx.update(users).set({ bannedAt: new Date(), banReason: "Age requirement not met" }).where(eq(users.id, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    }
    await log(tx, `provider:${provider}`, "identity.result", userId, { status: out.status, env: chk.env, suspend: out.suspend });
    await tx.insert(schema.notifications).values({ userId, title: "Verification update", body: "There is an update on your creator setup.", href: "/onboarding" });
    return "applied" as const;
  });
}

/* ---------- C. payouts ---------- */
export async function payoutRequirements(country: string, accountType: "individual" | "business") {
  const ad = payoutAdapter();
  if (!ad) throw new RuleError("Payout setup is not available yet in this environment.");
  return { provider: ad.id, fields: await ad.requirements(country, accountType) };
}

export async function startPayout(userId: string, input: { mode: "link" | "create"; country: string; accountType: "individual" | "business"; fields: Record<string, string>; returnUrl: string }) {
  const ad = payoutAdapter();
  if (!ad) throw new RuleError("Payout setup is not available yet in this environment.");
  const a = await access(userId);
  if (a.areas.identity !== "approved") throw new RuleError("Verify your identity first. The provider checks that payouts go to you.");
  let externalRef: string, status: PayoutEvent["status"] = "pending", miss: string[] = [], actionUrl: string | null = null;
  if (input.mode === "link") ({ externalRef, redirectUrl: actionUrl } = await ad.link({ subject: userId, returnUrl: input.returnUrl }));
  else ({ externalRef, status, missing: miss, actionUrl } = await ad.create({ subject: userId, country: input.country, accountType: input.accountType, fields: input.fields }));
  await db.transaction(async (tx) => {
    // Field values (IBAN, tax ids) go to the provider only. We keep the reference and the status.
    await tx.insert(payoutAccounts).values({ userId, provider: ad.id, env: PROVIDER_ENV, externalRef, accountType: input.accountType, country: input.country, status, missing: miss, actionUrl })
      .onConflictDoUpdate({ target: [payoutAccounts.userId, payoutAccounts.provider], set: { externalRef, accountType: input.accountType, country: input.country, status, missing: miss, actionUrl, canReceivePayouts: false, canProcessSales: false, updatedAt: new Date() } });
    await tx.update(onboarding).set({ payout: status, accountType: input.accountType, country: input.country, lastStep: "payouts", updatedAt: new Date() }).where(eq(onboarding.userId, userId));
    await log(tx, `user:${userId}`, "payout.started", userId, { provider: ad.id, mode: input.mode, country: input.country, accountType: input.accountType, fieldsSent: Object.keys(input.fields) });
  });
  return { status, missing: miss, actionUrl };
}

export async function applyPayoutEvent(provider: string, e: PayoutEvent) {
  return db.transaction(async (tx) => {
    const [ins] = await tx.insert(providerEvents).values({ provider, eventId: e.eventId, type: "payout", externalRef: e.externalRef, occurredAt: e.occurredAt }).onConflictDoNothing().returning();
    if (!ins) return "duplicate" as const;
    const [acc] = await tx.select().from(payoutAccounts).where(and(eq(payoutAccounts.provider, provider), eq(payoutAccounts.externalRef, e.externalRef))).for("update");
    if (!acc) { await tx.update(providerEvents).set({ outcome: "unknown_ref" }).where(eq(providerEvents.id, ins.id)); return "unknown_ref" as const; }
    if (!shouldApply(acc.lastEventAt, e.occurredAt)) { await tx.update(providerEvents).set({ outcome: "stale" }).where(eq(providerEvents.id, ins.id)); return "stale" as const; }
    const approved = e.status === "approved";
    await tx.update(payoutAccounts).set({ status: e.status, canReceivePayouts: approved && e.canReceivePayouts, canProcessSales: approved && e.canProcessSales, missing: e.missing ?? [], actionUrl: e.actionUrl ?? acc.actionUrl, reason: e.reason ?? null, lastEventAt: e.occurredAt, updatedAt: new Date() }).where(eq(payoutAccounts.id, acc.id));
    await tx.update(onboarding).set({ payout: e.status, updatedAt: new Date() }).where(eq(onboarding.userId, acc.userId));
    await tx.update(providerEvents).set({ outcome: "applied" }).where(eq(providerEvents.id, ins.id));
    await log(tx, `provider:${provider}`, "payout.result", acc.userId, { status: e.status, canReceivePayouts: e.canReceivePayouts, canProcessSales: e.canProcessSales, env: acc.env });
    await tx.insert(schema.notifications).values({ userId: acc.userId, title: "Payout update", body: "There is an update on your creator setup.", href: "/onboarding" });
    return "applied" as const;
  });
}

/* ---------- D. agreement ---------- */
export async function acceptAgreement(userId: string, documentId: string, sha256: string) {
  const d = await currentDoc("creator_agreement");
  if (!d || d.id !== documentId || d.sha256 !== sha256) throw new RuleError("The agreement was updated. Please read the current version.");
  await db.transaction(async (tx) => {
    await tx.insert(consents).values({ userId, documentId: d.id, kind: "creator_agreement", version: d.version, sha256: d.sha256, method: "checkbox_and_button" });
    await tx.update(onboarding).set({ agreement: "approved", lastStep: "done", updatedAt: new Date() }).where(eq(onboarding.userId, userId));
    await log(tx, `user:${userId}`, "consent.creator_agreement", userId, { version: d.version, sha256: d.sha256 });
  });
}
