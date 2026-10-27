import "server-only";
import { and, eq, lte, ne, inArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { split, transition, checkDelivery, vaultAtLeast, vaultUntil, addHours, RuleError, type DealEvent, type Effect, type VaultPeriod } from "@/domain/rules";
import { payments, STATEMENT_NAME } from "./payments";
import { ingest, remove, type Stored } from "./media";
import { requireCap, access, log } from "./onboarding";
import { REVIEW_MODE } from "@/config/compliance";

const { deals, offers, requests, messages, notifications, ledger, users, vaultItems, media, disputes } = schema;

export async function notify(tx: Tx, userId: string, title: string, body: string, href: string) {
  await tx.insert(notifications).values({ userId, title, body, href });
}
async function system(tx: Tx, dealId: string, body: string) {
  await tx.insert(messages).values({ dealId, kind: "system", body });
}

/* ---------- offers ---------- */
export async function makeOffer(creatorId: string, input: { requestId: string; showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string }) {
  await requireCap(creatorId, "offer");
  const r = await db.query.requests.findFirst({ where: eq(requests.id, input.requestId) });
  if (!r || r.status !== "open" || r.closesAt < new Date()) throw new RuleError("This request is no longer open.");
  if (r.buyerId === creatorId) throw new RuleError("You cannot make an offer on your own request.");
  if (!vaultAtLeast(input.vault, r.minVault)) throw new RuleError("The buyer asked for a longer vault period.");
  if (r.face === "required" && !input.showsFace) throw new RuleError("The buyer asked for the face to be shown.");
  if (input.etaHours > r.dueHours) throw new RuleError(`The buyer needs it within ${r.dueHours} hours.`);
  return db.transaction(async (tx) => {
    const [o] = await tx.insert(offers).values({ ...input, creatorId, note: input.note.slice(0, 140) })
      .onConflictDoUpdate({ target: [offers.requestId, offers.creatorId], set: { showsFace: input.showsFace, vault: input.vault, etaHours: input.etaHours, note: input.note.slice(0, 140), status: "pending" } })
      .returning();
    await notify(tx, r.buyerId, "New offer", "You have a new offer on your request.", `/requests/${r.id}/offers`);
    return o;
  });
}

export async function acceptOffer(buyerId: string, offerId: string) {
  const o = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
  if (!o || o.status !== "pending") throw new RuleError("This offer is no longer available.");
  const r = await db.query.requests.findFirst({ where: eq(requests.id, o.requestId) });
  if (!r || r.buyerId !== buyerId) throw new RuleError("Not your request.");
  if (r.status !== "open") throw new RuleError("You already accepted an offer for this request.");
  if (!(await access(o.creatorId)).caps.offer) throw new RuleError("This creator cannot take new deals right now. Choose another offer.");
  const m = split(r.dealCents);
  const charge = await payments.charge({ buyerId, cents: m.buyerPays, descriptor: STATEMENT_NAME });
  return db.transaction(async (tx) => {
    const [d] = await tx.insert(deals).values({
      requestId: r.id, offerId: o.id, buyerId, creatorId: o.creatorId,
      dealCents: m.dealCents, feeCents: m.feeCents, creatorCents: m.creatorCents,
      paymentRef: charge.ref, dueAt: addHours(new Date(), o.etaHours),
    }).returning();
    await tx.update(offers).set({ status: "accepted" }).where(eq(offers.id, o.id));
    await tx.update(offers).set({ status: "declined" }).where(and(eq(offers.requestId, r.id), ne(offers.id, o.id)));
    await tx.update(requests).set({ status: "matched" }).where(eq(requests.id, r.id));
    await tx.insert(ledger).values([
      { dealId: d.id, userId: buyerId, entry: "buyer_charge", cents: m.buyerPays },
      { dealId: d.id, entry: "escrow_hold", cents: m.buyerPays },
    ]);
    await system(tx, d.id, `Offer accepted. €${(m.buyerPays / 100).toFixed(2)} is held by the payment partner until delivery.`);
    await notify(tx, o.creatorId, "You were chosen", "You have a new deal.", `/deals/${d.id}`);
    return d;
  });
}

/* ---------- delivery ----------
   Three separate gates: the technical check (here), content review, and participant verification
   and consent. Only when all pass does the content reach the buyer's vault. */
export type Declaration = { onlyCreator: boolean; participantIds: string[] };

export async function deliver(creatorId: string, dealId: string, files: File[], decl: Declaration) {
  await requireCap(creatorId, "upload");
  const d = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!d || d.creatorId !== creatorId) throw new RuleError("Not your deal.");
  if (d.status !== "held") throw new RuleError(d.status === "reviewing" ? "Your delivery is already being checked." : "This deal does not take a delivery now.");
  if (!decl.onlyCreator && !decl.participantIds.length) throw new RuleError("Add every other person who appears, or confirm it is only you.");
  if (decl.participantIds.length) {
    const own = await db.select({ id: schema.participants.id }).from(schema.participants).where(and(eq(schema.participants.creatorId, creatorId), inArray(schema.participants.id, decl.participantIds)));
    if (own.length !== new Set(decl.participantIds).size) throw new RuleError("Unknown participant.");
  }
  const r = (await db.query.requests.findFirst({ where: eq(requests.id, d.requestId) }))!;
  const stored: Stored[] = [];
  try {
    for (const f of files) stored.push(await ingest(f));
  } catch (e) {
    await Promise.all(stored.map((s) => remove(s.key)));
    throw new RuleError(e instanceof Error ? e.message : "Upload failed.");
  }
  const check = checkDelivery(r.category, r.amount, stored);
  if (!check.ok) {                                   // the upload never reaches the buyer
    await Promise.all(stored.map((s) => remove(s.key)));
    return { ok: false as const, lines: check.lines };
  }
  const next = transition(d, { type: "deliver", at: new Date() }).state;
  const deliveryId = await db.transaction(async (tx) => {
    const rows = await tx.insert(media).values(stored.map((s) => ({ ownerId: creatorId, storageKey: s.key, mime: s.mime, bytes: s.bytes, durationSec: s.durationSec ?? null, width: s.width ?? null, height: s.height ?? null }))).returning();
    const [dl] = await tx.insert(schema.deliveries).values({ dealId, creatorId, mediaIds: rows.map((m) => m.id), technical: check.lines, onlyCreator: decl.onlyCreator, participantIds: decl.onlyCreator ? [] : decl.participantIds }).returning();
    await tx.update(deals).set({ status: next.status }).where(eq(deals.id, dealId));
    await system(tx, dealId, "Delivered. It passed the automatic file check and is now being reviewed before it reaches the vault.");
    await log(tx, `user:${creatorId}`, "delivery.submitted", creatorId, { deliveryId: dl.id, dealId, participants: dl.participantIds.length });
    return dl.id;
  });
  if (REVIEW_MODE === "test_auto") await reviewDelivery(deliveryId, "approved", "system:test_auto");
  return { ok: true as const, lines: check.lines };
}

/* Content review result. A technical pass is never treated as content approval. */
export async function reviewDelivery(deliveryId: string, outcome: "approved" | "rejected", reviewer: string, note = "") {
  const dl = await db.query.deliveries.findFirst({ where: eq(schema.deliveries.id, deliveryId) });
  if (!dl || (dl.review !== "pending_review" && dl.review !== "blocked_participants")) throw new RuleError("This delivery is not waiting for review.");
  if (outcome === "rejected") {
    await db.transaction(async (tx) => {
      await tx.update(schema.deliveries).set({ review: "rejected", reviewedBy: reviewer, reviewNote: note.slice(0, 500), reviewedAt: new Date() }).where(eq(schema.deliveries.id, deliveryId));
      const [d] = await tx.select().from(deals).where(eq(deals.id, dl.dealId)).for("update");
      await tx.update(deals).set({ status: transition(d, { type: "review_failed", at: new Date() }).state.status }).where(eq(deals.id, d.id));
      await system(tx, d.id, "The delivery did not pass review and was not shared. The creator can deliver again before the deadline.");
      await log(tx, reviewer, "delivery.rejected", dl.creatorId, { deliveryId });
    });
    for (const id of dl.mediaIds) { const m = await db.query.media.findFirst({ where: eq(media.id, id) }); if (m) await remove(m.storageKey); }
    return;
  }
  await db.update(schema.deliveries).set({ review: "approved", reviewedBy: reviewer, reviewNote: note.slice(0, 500), reviewedAt: new Date() }).where(eq(schema.deliveries.id, deliveryId));
  await log(db, reviewer, "delivery.review_approved", dl.creatorId, { deliveryId });
  await releaseToVault(deliveryId);
}

/* Every other person shown must be verified as an adult and must have consented to this
   delivery being made available. A statement by the creator alone is not enough. */
export async function participantsReady(dl: { onlyCreator: boolean; participantIds: string[]; id: string }) {
  if (dl.onlyCreator) return true;
  if (!dl.participantIds.length) return false;
  for (const pid of dl.participantIds) {
    const p = await db.query.participants.findFirst({ where: eq(schema.participants.id, pid) });
    const c = await db.query.participantConsents.findFirst({ where: and(eq(schema.participantConsents.participantId, pid), eq(schema.participantConsents.deliveryId, dl.id)) });
    if (!p || p.identity !== "approved" || !c || !c.depicted || !c.distribution || c.withdrawnAt) return false;
  }
  return true;
}

export async function releaseToVault(deliveryId: string) {
  const dl = await db.query.deliveries.findFirst({ where: eq(schema.deliveries.id, deliveryId) });
  if (!dl || (dl.review !== "approved" && dl.review !== "blocked_participants")) return false;
  if (!(await participantsReady(dl))) {
    if (dl.review !== "blocked_participants") {
      await db.update(schema.deliveries).set({ review: "blocked_participants" }).where(eq(schema.deliveries.id, deliveryId));
      await db.insert(messages).values({ dealId: dl.dealId, kind: "system", body: "Reviewed. Waiting for verification and consent of everyone who appears before it reaches the vault." });
    }
    return false;
  }
  await db.transaction(async (tx) => {
    const [d] = await tx.select().from(deals).where(eq(deals.id, dl.dealId)).for("update");
    const o = (await tx.select().from(offers).where(eq(offers.id, d.offerId)))[0];
    const now = new Date();
    const st = transition(d, { type: "review_passed", at: now }).state;
    await tx.insert(vaultItems).values(dl.mediaIds.map((mid, i) => ({ dealId: d.id, buyerId: d.buyerId, mediaId: mid, deliveryId, position: i, availableUntil: vaultUntil(now, o.vault) })));
    await tx.update(deals).set({ status: st.status, deliveredAt: st.deliveredAt, objectUntil: st.objectUntil }).where(eq(deals.id, d.id));
    await tx.update(schema.deliveries).set({ review: "approved" }).where(eq(schema.deliveries.id, deliveryId));
    await system(tx, d.id, "It is in the buyer's vault. 24 hours to object, then the payment is released.");
    await notify(tx, d.buyerId, "Delivery ready", "Your delivery is in your vault.", `/deals/${d.id}`);
  });
  return true;
}

/* ---------- buyer actions ---------- */
export async function releaseNow(buyerId: string, dealId: string) { return apply(dealId, { type: "release_now", at: new Date() }, buyerId); }

export async function object(buyerId: string, dealId: string, reason: string, note: string) {
  await apply(dealId, { type: "object", at: new Date() }, buyerId, async (tx, d) => {
    await tx.insert(disputes).values({ dealId, reason, note: note.slice(0, 500) });
    await system(tx, dealId, "The buyer reported a problem. The money stays held while a person reviews the file against the offer terms.");
    await notify(tx, d.creatorId, "Delivery under review", "A buyer reported a problem with a delivery.", `/deals/${dealId}`);
  });
}

export async function rate(buyerId: string, dealId: string, stars: number) {
  const d = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!d || d.buyerId !== buyerId || d.status !== "released" || d.buyerRating) throw new RuleError("You cannot rate this deal.");
  const s = Math.max(1, Math.min(5, Math.round(stars)));
  await db.transaction(async (tx) => {
    await tx.update(deals).set({ buyerRating: s }).where(eq(deals.id, dealId));
    await tx.update(users).set({ ratingSum: sql`${users.ratingSum} + ${s}`, ratingCount: sql`${users.ratingCount} + 1` }).where(eq(users.id, d.creatorId));
  });
}

/* ---------- trust and safety ---------- */
export async function resolveDispute(disputeId: string, outcome: "upheld" | "rejected", reviewer: string) {
  const dp = await db.query.disputes.findFirst({ where: eq(disputes.id, disputeId) });
  if (!dp || dp.outcome !== "open") throw new RuleError("Dispute already decided.");
  await apply(dp.dealId, { type: "resolve", outcome, at: new Date() }, null, async (tx, d) => {
    await tx.update(disputes).set({ outcome, decidedBy: reviewer, decidedAt: new Date() }).where(eq(disputes.id, disputeId));
    await system(tx, d.id, outcome === "upheld"
      ? "Review finished: the delivery did not match the offer. The buyer is refunded."
      : "Review finished: the delivery matched the offer. The creator is paid.");
  });
}

/* Worker: releases deals whose objection window passed and refunds deals that missed the deadline. */
export async function runDue(now = new Date()) {
  const due = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.status, "delivered"), lte(deals.objectUntil, now)));
  const late = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.status, "held"), lte(deals.dueAt, now)));
  for (const d of due) await apply(d.id, { type: "window_passed", at: now }, null).catch(() => {});
  for (const d of late) await apply(d.id, { type: "deadline_passed", at: now }, null, async (tx, deal) => {
    await system(tx, deal.id, "No delivery before the deadline. The buyer is refunded in full.");
  }).catch(() => {});
  await expireVault(now);
  return { released: due.length, refunded: late.length };
}

async function expireVault(now: Date) {
  const gone = await db.select({ id: vaultItems.id, mediaId: vaultItems.mediaId }).from(vaultItems).where(lte(vaultItems.availableUntil, now));
  if (!gone.length) return;
  const rows = await db.select().from(media).where(inArray(media.id, gone.map((g) => g.mediaId)));
  await db.delete(vaultItems).where(inArray(vaultItems.id, gone.map((g) => g.id)));
  for (const m of rows) await remove(m.storageKey);
}

/* Applies one state machine event and its money and ban effects in a single transaction. */
async function apply(dealId: string, e: DealEvent, actorBuyerId: string | null, extra?: (tx: Tx, d: typeof deals.$inferSelect) => Promise<void>) {
  return db.transaction(async (tx) => {
    const [d] = await tx.select().from(deals).where(eq(deals.id, dealId)).for("update");
    if (!d) throw new RuleError("Deal not found.");
    if (actorBuyerId && d.buyerId !== actorBuyerId) throw new RuleError("Not your deal.");
    const { state, effects } = transition(d, e);
    await tx.update(deals).set({ status: state.status, settledAt: ["released", "refunded"].includes(state.status) ? new Date() : null }).where(eq(deals.id, dealId));
    for (const ef of effects) await effect(tx, d, ef);
    if (extra) await extra(tx, d);
    return state;
  });
}

async function effect(tx: Tx, d: typeof deals.$inferSelect, ef: Effect) {
  if (ef.kind === "pay_creator") {
    const a = await access(d.creatorId);
    if (!a.caps.receivePayouts) {                      // no payouts without an active payout approval
      await tx.insert(ledger).values([
        { dealId: d.id, userId: d.creatorId, entry: "payout_on_hold", cents: d.creatorCents },
        { dealId: d.id, entry: "platform_revenue", cents: d.dealCents + d.feeCents - d.creatorCents },
      ]);
      await log(tx, "system", "payout.on_hold", d.creatorId, { dealId: d.id, reason: a.missing });
      await notify(tx, d.creatorId, "Action needed to enable payouts", "A payment is waiting for your payout setup.", "/onboarding");
      return;
    }
    await payments.payout({ creatorId: d.creatorId, cents: d.creatorCents });
    await tx.insert(ledger).values([
      { dealId: d.id, userId: d.creatorId, entry: "creator_payout", cents: d.creatorCents },
      { dealId: d.id, entry: "platform_revenue", cents: d.dealCents + d.feeCents - d.creatorCents },
    ]);
    await tx.insert(messages).values({ dealId: d.id, kind: "system", body: `Payment released. €${(d.creatorCents / 100).toFixed(2)} goes to the creator.` });
    await notify(tx, d.creatorId, "You got paid", "A payment was added to your balance.", `/deals/${d.id}`);
  } else if (ef.kind === "refund_buyer") {
    await payments.refund({ ref: d.paymentRef, cents: d.dealCents + d.feeCents });
    await tx.insert(ledger).values({ dealId: d.id, userId: d.buyerId, entry: "buyer_refund", cents: d.dealCents + d.feeCents });
    await notify(tx, d.buyerId, "Refund on its way", "You were refunded in full.", `/deals/${d.id}`);
  } else {
    const uid = ef.kind === "ban_creator" ? d.creatorId : d.buyerId;
    await tx.update(users).set({ bannedAt: new Date(), banReason: ef.reason }).where(eq(users.id, uid));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, uid));
  }
}
