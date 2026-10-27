/* Acceptance tests for creator onboarding and content availability, against a real Postgres. */
import { describe, it, expect, beforeAll } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DOCS } from "@/legal/documents";
import * as ob from "@/server/onboarding";
import * as deals from "@/server/deals";
import * as P from "@/server/participants";
import { identityAdapter, payoutAdapter, signTest, SignatureError } from "@/server/providers";
import { publicProfile, profileFor } from "@/server/queries";
import { RuleError } from "@/domain/rules";

const S = schema;
let n = 0;
const uid = () => `t${Date.now().toString(36)}${n++}`;

async function user(creator = false) {
  const h = uid();
  const [u] = await db.insert(S.users).values({ email: `${h}@test.local`, handle: h, birthYear: 1995, isCreator: creator }).returning();
  return u;
}

/* Simulates the provider: a signed raw body, verified by the adapter exactly like the webhook route does. */
function identityWebhook(ref: string, body: Record<string, unknown>, eventId = "evt_" + randomUUID(), at = new Date()) {
  const raw = JSON.stringify({ eventId, occurredAt: at.toISOString(), externalRef: ref, ...body });
  const e = identityAdapter()!.verifyWebhook(raw, new Headers({ "x-sandbox-signature": signTest(raw) }));
  return ob.applyIdentityEvent("sandbox", e);
}
function payoutWebhook(ref: string, body: Record<string, unknown>, eventId = "evt_" + randomUUID()) {
  const raw = JSON.stringify({ eventId, occurredAt: new Date().toISOString(), externalRef: ref, ...body });
  const e = payoutAdapter()!.verifyWebhook(raw, new Headers({ "x-sandbox-signature": signTest(raw) }));
  return ob.applyPayoutEvent("sandbox", e);
}
const adult = { decision: "approved", over18: true, documentChecked: true, livenessChecked: true, person: { legalName: "Robin Secretname", dateOfBirth: "1996-03-04", country: "BE" } };

async function startedIdentity(userId: string) {
  await ob.ensure(userId);
  await ob.startIdentity(userId, "http://x");
  return (await db.query.identityChecks.findFirst({ where: eq(S.identityChecks.userId, userId) }))!.externalRef;
}

async function activeCreator(opts: { payouts?: boolean; sales?: boolean } = {}) {
  const u = await user(true);
  await db.insert(S.creatorProfiles).values({ userId: u.id, visibility: "public", bio: "Hello" });
  await identityWebhook(await startedIdentity(u.id), adult);
  const r = await ob.startPayout(u.id, { mode: "create", country: "BE", accountType: "individual", fields: { account_holder: "Robin", iban: "BE00" }, returnUrl: "http://x" });
  expect(r.status).toBe("pending");
  const acc = (await db.query.payoutAccounts.findFirst({ where: eq(S.payoutAccounts.userId, u.id) }))!;
  await payoutWebhook(acc.externalRef, { status: "approved", canReceivePayouts: opts.payouts ?? true, canProcessSales: opts.sales ?? true });
  const doc = (await ob.currentDoc("creator_agreement"))!;
  await ob.acceptAgreement(u.id, doc.id, doc.sha256);
  return u;
}

async function openRequest(buyerId: string, category: "photos" | "video" = "photos", amount = 2) {
  const [r] = await db.insert(S.requests).values({ buyerId, title: "Test request", category, amount, dealCents: 4000, who: "Anyone", ageMin: 18, ageMax: 40, face: "not_needed", minVault: "7d", dueHours: 48, closesAt: new Date(Date.now() + 86400_000) }).returning();
  return r;
}
async function jpeg() {
  const buf = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#7a8" } }).jpeg().toBuffer();
  return new File([new Uint8Array(buf)], "p.jpg", { type: "image/jpeg" });
}

beforeAll(async () => {
  const have = await db.select().from(S.documents);
  if (!have.length) await db.insert(S.documents).values(DOCS.map((d) => ({ ...d, sha256: createHash("sha256").update(d.body).digest("hex"), status: "draft_pending_review" as const })));
});

describe("1. a minor or failed verification never activates a creator", () => {
  it("suspends an account when the provider reports under 18", async () => {
    const u = await user(true);
    expect(await identityWebhook(await startedIdentity(u.id), { decision: "approved", over18: false, person: { dateOfBirth: "2010-01-01" } })).toBe("applied");
    const a = await ob.access(u.id);
    expect(a.areas.identity).toBe("rejected");
    expect(a.status).toBe("suspended");
    expect(a.caps).toEqual({ prepareProfile: false, offer: false, upload: false, receivePayouts: false });
    expect((await db.query.users.findFirst({ where: eq(S.users.id, u.id) }))!.bannedAt).not.toBeNull();
  });
  it("keeps a declined verification out of active", async () => {
    const u = await user(true);
    await identityWebhook(await startedIdentity(u.id), { decision: "declined" });
    const a = await ob.access(u.id);
    expect(a.status).toBe("action_required");
    expect(a.caps.offer).toBe(false);
  });
});

describe("2. a forged client status gives no access", () => {
  it("rejects a webhook with a forged signature", () => {
    const raw = JSON.stringify({ eventId: "x", occurredAt: new Date().toISOString(), externalRef: "x", decision: "approved", over18: true });
    expect(() => identityAdapter()!.verifyWebhook(raw, new Headers({ "x-sandbox-signature": "t=1,v1=" + "0".repeat(64) }))).toThrow(SignatureError);
    expect(() => identityAdapter()!.verifyWebhook(raw, new Headers())).toThrow(SignatureError);
  });
  it("blocks offers and uploads for a creator whose checks are not approved, whatever the client claims", async () => {
    const c = await user(true);
    await ob.ensure(c.id);
    const b = await user();
    const r = await openRequest(b.id);
    await expect(deals.makeOffer(c.id, { requestId: r.id, showsFace: false, vault: "7d", etaHours: 24, note: "" })).rejects.toBeInstanceOf(RuleError);
  });
  it("does not let staff style direct writes stand in for a provider: only events change identity", async () => {
    const u = await user(true);
    const ref = await startedIdentity(u.id);
    expect((await ob.access(u.id)).areas.identity).toBe("pending");
    expect(await identityWebhook("unknown_ref_" + ref, adult)).toBe("unknown_ref");
    expect((await ob.access(u.id)).areas.identity).toBe("pending");
  });
});

describe("3. duplicate and delayed webhooks are safe", () => {
  it("applies the same event once", async () => {
    const u = await user(true);
    const ref = await startedIdentity(u.id);
    const id = "evt_dup_" + randomUUID();
    expect(await identityWebhook(ref, adult, id)).toBe("applied");
    expect(await identityWebhook(ref, adult, id)).toBe("duplicate");
    const results = await db.select().from(S.audit).where(and(eq(S.audit.subjectUserId, u.id), eq(S.audit.action, "identity.result")));
    expect(results).toHaveLength(1);
  });
  it("ignores an older event that arrives late", async () => {
    const u = await user(true);
    const ref = await startedIdentity(u.id);
    await identityWebhook(ref, adult, undefined, new Date());
    expect(await identityWebhook(ref, { decision: "declined" }, undefined, new Date(Date.now() - 60_000))).toBe("stale");
    expect((await ob.access(u.id)).areas.identity).toBe("approved");
  });
});

describe("4. confidential data never appears in public responses", () => {
  it("public profile has no legal name, email, birth date, keys or provider references", async () => {
    const c = await activeCreator();
    const viewer = await user();
    const full = (await db.query.users.findFirst({ where: eq(S.users.id, c.id) }))!;
    const p = (await db.query.creatorProfiles.findFirst({ where: eq(S.creatorProfiles.userId, c.id) }))!;
    const shown = JSON.stringify([publicProfile(full, p), await profileFor(c.handle, viewer.id)]);
    for (const secret of ["Robin Secretname", full.email, "1996-03-04", "sbx_", "birthYear", "publicKey", "email", "BE00"]) expect(shown).not.toContain(secret);
    const sealed = await db.query.confidentialIdentity.findFirst({ where: eq(S.confidentialIdentity.userId, c.id) });
    expect(sealed?.sealed).toBeTruthy();
    expect(sealed!.sealed).not.toContain("Robin");
  });
});

describe("5. missing participant verification blocks availability", () => {
  it("keeps a reviewed delivery out of the vault until every participant is verified and consents", async () => {
    const c = await activeCreator();
    const b = await user();
    const r = await openRequest(b.id, "photos", 2);
    const o = await deals.makeOffer(c.id, { requestId: r.id, showsFace: false, vault: "7d", etaHours: 24, note: "" });
    const d = await deals.acceptOffer(b.id, o.id);
    const { participant } = await P.addParticipant(c.id, "Partner");
    const res = await deals.deliver(c.id, d.id, [await jpeg(), await jpeg()], { onlyCreator: false, participantIds: [participant.id] });
    expect(res.ok).toBe(true);
    const dl = (await db.query.deliveries.findFirst({ where: eq(S.deliveries.dealId, d.id) }))!;
    await deals.reviewDelivery(dl.id, "approved", "staff:test");
    expect((await db.query.deliveries.findFirst({ where: eq(S.deliveries.id, dl.id) }))!.review).toBe("blocked_participants");
    expect(await db.select().from(S.vaultItems).where(eq(S.vaultItems.dealId, d.id))).toHaveLength(0);
    expect((await db.query.deals.findFirst({ where: eq(S.deals.id, d.id) }))!.status).toBe("reviewing");

    // a creator's own statement is not enough: consent before verification is refused
    const tokenRow = await db.query.participants.findFirst({ where: eq(S.participants.id, participant.id) });
    expect(tokenRow).toBeTruthy();
    await db.insert(S.identityChecks).values({ participantId: participant.id, provider: "sandbox", env: "test", externalRef: "sbx_part_" + participant.id, status: "pending" });
    await identityWebhook("sbx_part_" + participant.id, adult);
    await P.reevaluate(participant.id);
    expect(await db.select().from(S.vaultItems).where(eq(S.vaultItems.dealId, d.id))).toHaveLength(0);
    await db.insert(S.participantConsents).values({ participantId: participant.id, deliveryId: dl.id, depicted: true, distribution: true });
    expect(await deals.releaseToVault(dl.id)).toBe(true);
    expect(await db.select().from(S.vaultItems).where(eq(S.vaultItems.dealId, d.id))).toHaveLength(2);
    expect((await db.query.deals.findFirst({ where: eq(S.deals.id, d.id) }))!.status).toBe("delivered");
  });
  it("a technical pass alone never makes content available", async () => {
    const c = await activeCreator();
    const b = await user();
    const r = await openRequest(b.id, "photos", 1);
    const o = await deals.makeOffer(c.id, { requestId: r.id, showsFace: false, vault: "7d", etaHours: 24, note: "" });
    const d = await deals.acceptOffer(b.id, o.id);
    await deals.deliver(c.id, d.id, [await jpeg()], { onlyCreator: true, participantIds: [] });
    expect(await db.select().from(S.vaultItems).where(eq(S.vaultItems.dealId, d.id))).toHaveLength(0);
  });
});

describe("6. provider restrictions block the matching financial capabilities", () => {
  it("no payouts when the provider disables them, and the payout is held", async () => {
    const c = await activeCreator({ payouts: false });
    expect((await ob.access(c.id)).caps).toMatchObject({ offer: true, receivePayouts: false });
    const b = await user();
    const r = await openRequest(b.id, "photos", 1);
    const o = await deals.makeOffer(c.id, { requestId: r.id, showsFace: false, vault: "7d", etaHours: 24, note: "" });
    const d = await deals.acceptOffer(b.id, o.id);
    await deals.deliver(c.id, d.id, [await jpeg()], { onlyCreator: true, participantIds: [] });
    const dl = (await db.query.deliveries.findFirst({ where: eq(S.deliveries.dealId, d.id) }))!;
    await deals.reviewDelivery(dl.id, "approved", "staff:test");
    await deals.releaseNow(b.id, d.id);
    const entries = (await db.select().from(S.ledger).where(eq(S.ledger.dealId, d.id))).map((l) => l.entry);
    expect(entries).toContain("payout_on_hold");
    expect(entries).not.toContain("creator_payout");
  });
  it("no new offers when the provider disables sales", async () => {
    const c = await activeCreator({ sales: false });
    const b = await user();
    const r = await openRequest(b.id);
    await expect(deals.makeOffer(c.id, { requestId: r.id, showsFace: false, vault: "7d", etaHours: 24, note: "" })).rejects.toThrow(/onboarding/);
  });
  it("a later provider rejection removes access again", async () => {
    const c = await activeCreator();
    const acc = (await db.query.payoutAccounts.findFirst({ where: eq(S.payoutAccounts.userId, c.id) }))!;
    await payoutWebhook(acc.externalRef, { status: "rejected", canReceivePayouts: false, canProcessSales: false });
    expect((await ob.access(c.id)).caps).toMatchObject({ offer: false, upload: false, receivePayouts: false });
  });
});

describe("7. agreement acceptance is traceable to the exact version", () => {
  it("records version and text hash, and a new version needs a new acceptance", async () => {
    const c = await activeCreator();
    const doc = (await ob.currentDoc("creator_agreement"))!;
    const row = (await db.query.consents.findFirst({ where: and(eq(S.consents.userId, c.id), eq(S.consents.kind, "creator_agreement")) }))!;
    expect(row).toMatchObject({ documentId: doc.id, version: doc.version, sha256: createHash("sha256").update(doc.body).digest("hex"), method: "checkbox_and_button" });

    const body = doc.body + "\n13. New clause.";
    await db.update(S.documents).set({ current: false }).where(eq(S.documents.id, doc.id));
    const [v2] = await db.insert(S.documents).values({ kind: "creator_agreement", version: "test-v2-" + uid(), title: doc.title, summary: doc.summary, body, sha256: createHash("sha256").update(body).digest("hex"), status: "draft_pending_review" }).returning();
    try {
      const a = await ob.access(c.id);
      expect(a.areas.agreement).toBe("action_required");
      expect(a.caps.offer).toBe(false);
      await expect(ob.acceptAgreement(c.id, v2.id, doc.sha256)).rejects.toBeInstanceOf(RuleError);
      await ob.acceptAgreement(c.id, v2.id, v2.sha256);
      expect((await ob.access(c.id)).status).toBe("active");
    } finally {
      await db.update(S.documents).set({ current: false }).where(eq(S.documents.id, v2.id));
      await db.update(S.documents).set({ current: true }).where(eq(S.documents.id, doc.id));
    }
  });
});
