import "server-only";
import { mayView, inCircle, workedWith } from "./circle";
import { profileMissing } from "@/domain/looks-detail";
import { and, eq, lte, ne, inArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { quote, quoteFromTotal, split, transition, checkDelivery, vaultAtLeast, vaultUntil, addHours, RuleError, type DealEvent, type Effect, type VaultPeriod } from "@/domain/rules";
import { payments, STATEMENT_NAME } from "./payments";
import { ingest, remove, type Stored } from "./media";
import { issueDecision } from "./decisions";
import { requireCap, access, log, isAgeVerified } from "./onboarding";
import { REVIEW_MODE, BUYER_AGE_CHECK, vatRate } from "@/config/compliance";
import { blockedEither } from "./blocks";
import { onCreatorPaid, creditWeekly, feeGiftUsed, feeGiftReturned, getConfig as refConfig, balance as walletBalance, spend as spendCredit, giveBack as giveCreditBack } from "./referrals";
import { giftFee, tipSplit, TIP_MIN_CENTS, TIP_MAX_CENTS } from "@/domain/referral";

/* Shown next to the checkbox at "Accept" and stored in the audit log with the deal. */
export const WAIVER_TEXT = "I ask the creator to start now. I understand that I lose my 14 day right of withdrawal once the content is delivered to my vault. My rights when the delivery does not match the offer stay intact.";

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
  // Buyers choose on looks: an incomplete profile cannot apply.
  if (profileMissing(await db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, creatorId) })).length) throw new RuleError("Complete your public profile first, so buyers can picture you.");
  if (await blockedEither(creatorId, r.buyerId)) throw new RuleError("This request is no longer open.");   // silent: never reveals a block
  if (!mayView(r, creatorId, await inCircle(r.buyerId, creatorId))) throw new RuleError("This request is no longer open.");
  if (!vaultAtLeast(input.vault, r.minVault)) throw new RuleError("The buyer asked for a longer vault period.");
  if (r.face === "required" && !input.showsFace) throw new RuleError("The buyer asked for the face to be shown.");
  if (input.etaHours > r.dueHours) throw new RuleError(`The buyer needs it within ${r.dueHours} hours.`);
  // One application per request, and it stays as sent: the buyer compares what each creator promised.
  const before = await db.query.offers.findFirst({ where: and(eq(offers.requestId, r.id), eq(offers.creatorId, creatorId)), columns: { id: true } });
  if (before) throw new RuleError("You already applied for this request.");
  return db.transaction(async (tx) => {
    const [o] = await tx.insert(offers).values({ ...input, creatorId, note: input.note.slice(0, 140) }).returning();
    await notify(tx, r.buyerId, "New offer", "You have a new offer on your request.", `/requests/${r.id}/offers`);
    return o;
  });
}

/* ---------- paying at posting ----------
   The buyer pays when posting. The payment partner holds the money while the request is reviewed and
   open. Not approved, taken offline or nobody applied: a full refund. A creator chosen: the deal runs
   on the money already held. */
type NewRequest = Omit<typeof requests.$inferInsert, "buyerId" | "status" | "payRef" | "payTotalCents" | "payFeeCents" | "payVatCents" | "payVatRate" | "paidAt" | "refundedAt">;

export async function postPaid(buyerId: string, values: NewRequest, opts: { withdrawalWaiver: boolean; totalCents?: number; useCredit?: boolean }) {
  if (BUYER_AGE_CHECK && !(await isAgeVerified(buyerId))) throw new RuleError("Confirm your age once before you pay.");
  if (!opts.withdrawalWaiver) throw new RuleError("Confirm that the creator may start once chosen and that you lose the 14 day withdrawal right once it is delivered.");
  const buyer = await db.query.users.findFirst({ where: eq(users.id, buyerId), columns: { country: true, freeFees: true } });
  // An all in price is split backwards; otherwise the deal value is the base and fee and VAT come on top.
  const base = opts.totalCents ? quoteFromTotal(opts.totalCents, vatRate(buyer?.country ?? "BE")) : quote(values.dealCents, vatRate(buyer?.country ?? "BE"));
  // A service fee gift (referral programme) is used on the next request: ByRequest pays the fee.
  const m = !opts.totalCents && (buyer?.freeFees ?? 0) > 0 ? giftFee(base, (await refConfig()).feeGiftCapCents) : { ...base, giftCents: 0 };
  values = { ...values, dealCents: m.dealCents };
  return db.transaction(async (tx) => {
    // The bonus balance pays first when the buyer asks for it; the card pays the rest.
    let credit = 0;
    if (opts.useCredit) { await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${buyerId}))`); credit = Math.max(0, Math.min(m.total, await walletBalance(buyerId, tx))); }
    const card = m.total - credit;
    const charge = card > 0 ? await payments.charge({ buyerId, cents: card, descriptor: STATEMENT_NAME }) : { ref: "balance_" + crypto.randomUUID().slice(0, 12) };
    const [r] = await tx.insert(requests).values({ ...values, buyerId, status: "in_review", payRef: charge.ref, payTotalCents: m.total, payFeeCents: m.feeCents, payVatCents: m.vatCents, payVatRate: m.vatRate, feeGiftCents: m.giftCents, creditCents: credit, paidAt: new Date() }).returning();
    if (m.giftCents) await feeGiftUsed(tx, buyerId, r.id, m.giftCents);
    if (credit) await spendCredit(tx, buyerId, r.id, credit);
    await tx.insert(ledger).values([...(card > 0 ? [{ requestId: r.id, userId: buyerId, entry: "buyer_charge" as const, cents: card }] : []), { requestId: r.id, entry: "escrow_hold", cents: m.total }]);
    await log(tx, `user:${buyerId}`, "consumer.withdrawal_waived", buyerId, { request: r.id, text: WAIVER_TEXT });
    return r;
  });
}

/* Full refund of a paid request that did not become a deal. Safe to call twice. */
export async function refundRequest(requestId: string, why: string) {
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(requests).where(eq(requests.id, requestId)).for("update");
    if (!r?.payRef || r.refundedAt || !r.payTotalCents) return false;
    const deal = await tx.query.deals.findFirst({ where: eq(deals.requestId, requestId), columns: { id: true } });
    if (deal) return false;
    const card = r.payTotalCents - r.creditCents;   // the part paid from the bonus balance goes back to the balance
    if (card > 0) await payments.refund({ ref: r.payRef, cents: card });
    await tx.update(requests).set({ refundedAt: new Date() }).where(eq(requests.id, requestId));
    if (card > 0) await tx.insert(ledger).values({ requestId, userId: r.buyerId, entry: "buyer_refund", cents: card });
    await giveCreditBack(tx, r.buyerId, requestId, r.creditCents);
    if (r.feeGiftCents) await feeGiftReturned(tx, r.buyerId, requestId, r.feeGiftCents);   // the gift is not lost on a refund
    await log(tx, "system", "payment.request_refunded", r.buyerId, { request: requestId, why });
    await notify(tx, r.buyerId, "Refund on its way", "You were refunded in full.", `/requests/${requestId}/offers`);
    return true;
  });
}

export async function acceptOffer(buyerId: string, offerId: string, opts: { withdrawalWaiver: boolean; auto?: boolean }) {
  const o = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
  if (!o || o.status !== "pending") throw new RuleError("This offer is no longer available.");
  const r = await db.query.requests.findFirst({ where: eq(requests.id, o.requestId) });
  if (!r || r.buyerId !== buyerId) throw new RuleError("Not your request.");
  if (r.status !== "open") throw new RuleError("You already accepted an offer for this request.");
  if (await blockedEither(buyerId, o.creatorId)) throw new RuleError("This offer is no longer available.");
  if (!(await access(o.creatorId)).caps.offer) throw new RuleError("This creator cannot take new deals right now. Choose another offer.");
  const paid = !!r.payRef && !r.refundedAt;
  if (!paid && BUYER_AGE_CHECK && !(await isAgeVerified(buyerId))) throw new RuleError("Confirm your age once before you pay.");
  if (!paid && !opts.withdrawalWaiver) throw new RuleError("Confirm that the creator may start now and that you lose the 14 day withdrawal right once it is delivered.");
  // Paid at posting: the deal runs on the money already held. Older requests are charged now.
  const buyer = await db.query.users.findFirst({ where: eq(users.id, buyerId), columns: { country: true } });
  const fresh = quote(r.dealCents, vatRate(buyer?.country ?? "BE"));
  const m = paid ? { ...quote(r.dealCents, r.payVatRate ?? fresh.vatRate), total: r.payTotalCents!, feeCents: r.payFeeCents!, vatCents: r.payVatCents!, vatRate: r.payVatRate! } : fresh;
  const charge = paid ? { ref: r.payRef! } : await payments.charge({ buyerId, cents: m.total, descriptor: STATEMENT_NAME });
  // A returning buyer: the creator keeps a bigger share, the buyer pays the same.
  const repeat = await workedWith(buyerId, o.creatorId);
  return db.transaction(async (tx) => {
    const [d] = await tx.insert(deals).values({
      requestId: r.id, offerId: o.id, buyerId, creatorId: o.creatorId,
      dealCents: m.dealCents, feeCents: m.feeCents, creatorCents: split(m.dealCents, repeat).creatorCents,
      vatCents: m.vatCents, vatRate: m.vatRate, withdrawalWaivedAt: paid ? r.paidAt! : new Date(),
      paymentRef: charge.ref, dueAt: addHours(new Date(), o.etaHours),
    }).returning();
    await tx.update(offers).set({ status: "accepted" }).where(eq(offers.id, o.id));
    await tx.update(offers).set({ status: "declined" }).where(and(eq(offers.requestId, r.id), ne(offers.id, o.id)));
    await tx.update(requests).set({ status: "matched" }).where(eq(requests.id, r.id));
    if (!paid) {
      await tx.insert(ledger).values([
        { dealId: d.id, userId: buyerId, entry: "buyer_charge", cents: m.total },
        { dealId: d.id, entry: "escrow_hold", cents: m.total },
      ]);
      await log(tx, `user:${buyerId}`, "consumer.withdrawal_waived", buyerId, { dealId: d.id, text: WAIVER_TEXT });
    }
    await system(tx, d.id, `Offer accepted. €${(m.total / 100).toFixed(2)}, VAT included, is held by the payment partner until delivery.`);
    if (opts.auto) await notify(tx, buyerId, "We chose a creator for you", "Your request closed without a choice, so the best candidate was chosen. Your deal has started.", `/deals/${d.id}`);
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
      await issueDecision(tx, { userId: dl.creatorId, action: "content_rejected", ground: "terms", facts: note || "The delivery does not meet the content rules or the accepted offer.", scope: "This delivery only. You can upload a new one before the deadline.", decidedBy: reviewer.startsWith("staff:") ? "staff" : "automated", automated: !reviewer.startsWith("staff:") });
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
    await notify(tx, d.buyerId, "Delivery ready", "It is in your vault. How was it? Rate it, and leave a tip if they went the extra mile.", `/deals/${d.id}#rate`);
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

/* Ratings, both ways, with a few short questions. The buyer can rate once the content is in the vault,
   the creator once the deal is done. Each side rates once; stars feed the public average. */
export type BuyerReview = { stars: number; quality: number; communication: number; asAgreed: boolean; onTime: boolean; overDelivered: boolean; text?: string };
export type CreatorReview = { stars: number; clear: boolean; respectful: boolean; again: boolean };
const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)));

export async function rate(buyerId: string, dealId: string, rv: BuyerReview) {
  const d = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!d || d.buyerId !== buyerId || !["delivered", "released"].includes(d.status) || d.buyerRating) throw new RuleError("You cannot rate this deal.");
  const s = clamp(rv.stars);
  const text = (rv.text ?? "").trim().replace(/\s+/g, " ").slice(0, 280);
  // Reviews are public on the profile: no contact details, links or numbers.
  if (text && /@|https?:|www\.|\d{6,}/i.test(text)) throw new RuleError("Leave out contact details, links and numbers.");
  await db.transaction(async (tx) => {
    await tx.update(deals).set({ buyerRating: s, reviewText: text || null, buyerScores: { quality: clamp(rv.quality), communication: clamp(rv.communication), asAgreed: !!rv.asAgreed, onTime: !!rv.onTime, overDelivered: !!rv.overDelivered } }).where(eq(deals.id, dealId));
    await tx.update(users).set({ ratingSum: sql`${users.ratingSum} + ${s}`, ratingCount: sql`${users.ratingCount} + 1` }).where(eq(users.id, d.creatorId));
    await notify(tx, d.creatorId, "You got a new review", "Your buyer left a review. Have a look.", `/deals/${dealId}`);
  });
}

export async function rateBuyer(creatorId: string, dealId: string, rv: CreatorReview) {
  const d = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!d || d.creatorId !== creatorId || !["delivered", "released"].includes(d.status) || d.creatorRating) throw new RuleError("You cannot rate this deal.");
  const s = clamp(rv.stars);
  await db.transaction(async (tx) => {
    await tx.update(deals).set({ creatorRating: s, creatorScores: { clear: !!rv.clear, respectful: !!rv.respectful, again: !!rv.again } }).where(eq(deals.id, dealId));
    await tx.update(users).set({ buyerRatingSum: sql`${users.buyerRatingSum} + ${s}`, buyerRatingCount: sql`${users.buyerRatingCount} + 1` }).where(eq(users.id, d.buyerId));
  });
}

/* A tip, like a thank you after a ride. Once per deal, from delivery until 14 days after. The buyer
   pays exactly the amount picked; the creator gets the same share as on the deal. Paid out with the
   deal: straight away when the deal is already paid out, otherwise together with it. */
export const TIP_DAYS = 14;
export async function tip(buyerId: string, dealId: string, cents: number) {
  const d = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!d || d.buyerId !== buyerId) throw new RuleError("Not your deal.");
  if (!["delivered", "released"].includes(d.status)) throw new RuleError("You can tip once the content is in your vault.");
  if (d.tipCents) throw new RuleError("You already tipped for this deal. Thank you!");
  if (d.deliveredAt && Date.now() - d.deliveredAt.getTime() > TIP_DAYS * 86400_000) throw new RuleError("Tipping is open for 14 days after delivery.");
  if (!Number.isInteger(cents) || cents < TIP_MIN_CENTS || cents > TIP_MAX_CENTS) throw new RuleError("Pick a tip between €2 and €200.");
  if (await blockedEither(d.buyerId, d.creatorId)) throw new RuleError("This chat is closed.");
  const sp = tipSplit(cents, d.vatRate);
  const charge = await payments.charge({ buyerId, cents, descriptor: STATEMENT_NAME });
  await db.transaction(async (tx) => {
    await tx.update(deals).set({ tipCents: cents, tipCreatorCents: sp.creatorCents, tipVatCents: sp.vatCents, tipRef: charge.ref, tipAt: new Date() }).where(eq(deals.id, dealId));
    await tx.insert(ledger).values({ dealId, userId: buyerId, entry: "tip_charge", cents });
    await log(tx, `user:${buyerId}`, "deal.tip", d.creatorId, { dealId, cents, creatorCents: sp.creatorCents });
    await system(tx, dealId, `The buyer left a tip. €${(sp.creatorCents / 100).toFixed(2)} goes to the creator.`);
    await notify(tx, d.creatorId, "You got a tip", `€${(sp.creatorCents / 100).toFixed(2)} as a thank you from your buyer.`, `/deals/${dealId}`);
    if (d.status === "released") await payTip(tx, { ...d, tipCents: cents, tipCreatorCents: sp.creatorCents, tipVatCents: sp.vatCents });
  });
}

async function payTip(tx: Tx, d: typeof deals.$inferSelect) {
  if (!d.tipCents) return;
  const done = await tx.query.ledger.findFirst({ where: and(eq(ledger.dealId, d.id), inArray(ledger.entry, ["tip_payout", "tip_on_hold"])) });
  if (done) return;
  const platform = d.tipCents - d.tipCreatorCents - d.tipVatCents;
  if (!(await access(d.creatorId)).caps.receivePayouts) {
    await tx.insert(ledger).values([{ dealId: d.id, userId: d.creatorId, entry: "tip_on_hold", cents: d.tipCreatorCents }, { dealId: d.id, entry: "platform_revenue", cents: platform }, ...(d.tipVatCents ? [{ dealId: d.id, entry: "vat_payable" as const, cents: d.tipVatCents }] : [])]);
    return;
  }
  await payments.payout({ creatorId: d.creatorId, cents: d.tipCreatorCents });
  await tx.insert(ledger).values([{ dealId: d.id, userId: d.creatorId, entry: "tip_payout", cents: d.tipCreatorCents }, { dealId: d.id, entry: "platform_revenue", cents: platform }, ...(d.tipVatCents ? [{ dealId: d.id, entry: "vat_payable" as const, cents: d.tipVatCents }] : [])]);
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
/* A paid request that closes without a choice: the best candidate is chosen, so the buyer still gets
   what they paid for. Nobody applied: a full refund. */
async function closeRequests(now: Date) {
  const closing = await db.select().from(requests).where(and(eq(requests.status, "open"), lte(requests.closesAt, now), sql`${requests.payRef} is not null`, sql`${requests.refundedAt} is null`)).limit(50);
  let chosen = 0, refunded = 0;
  for (const r of closing) {
    const cands = await db.select({ o: offers, sum: users.ratingSum, n: users.ratingCount }).from(offers).innerJoin(users, eq(users.id, offers.creatorId))
      .where(and(eq(offers.requestId, r.id), eq(offers.status, "pending"))).orderBy(offers.createdAt);
    const ranked = cands.sort((a, b) => (b.n ? b.sum / b.n : 0) - (a.n ? a.sum / a.n : 0));
    let done = false;
    for (const c of ranked) {
      try { await acceptOffer(r.buyerId, c.o.id, { withdrawalWaiver: true, auto: true }); done = true; chosen++; break; } catch { /* next candidate */ }
    }
    if (!done) {
      await db.update(requests).set({ status: "expired" }).where(eq(requests.id, r.id));
      if (await refundRequest(r.id, "closed without candidates")) refunded++;
    }
  }
  return { chosen, refunded };
}

export async function runDue(now = new Date()) {
  const closed = await closeRequests(now);
  const due = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.status, "delivered"), lte(deals.objectUntil, now)));
  const late = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.status, "held"), lte(deals.dueAt, now)));
  for (const d of due) await apply(d.id, { type: "window_passed", at: now }, null).catch(() => {});
  for (const d of late) await apply(d.id, { type: "deadline_passed", at: now }, null, async (tx, deal) => {
    await system(tx, deal.id, "No delivery before the deadline. The buyer is refunded in full.");
  }).catch(() => {});
  await expireVault(now);
  const referralCredited = await creditWeekly(now);
  return { released: due.length, refunded: late.length, autoChosen: closed.chosen, requestsRefunded: closed.refunded, referralCredited };
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
        ...(d.vatCents ? [{ dealId: d.id, entry: "vat_payable" as const, cents: d.vatCents }] : []),
      ]);
      await log(tx, "system", "payout.on_hold", d.creatorId, { dealId: d.id, reason: a.missing });
      await notify(tx, d.creatorId, "Action needed to enable payouts", "A payment is waiting for your payout setup.", "/onboarding");
      await onCreatorPaid(tx, d);
      await payTip(tx, d);
      return;
    }
    await payments.payout({ creatorId: d.creatorId, cents: d.creatorCents });
    await tx.insert(ledger).values([
      { dealId: d.id, userId: d.creatorId, entry: "creator_payout", cents: d.creatorCents },
      { dealId: d.id, entry: "platform_revenue", cents: d.dealCents + d.feeCents - d.creatorCents },
      ...(d.vatCents ? [{ dealId: d.id, entry: "vat_payable" as const, cents: d.vatCents }] : []),
    ]);
    await tx.insert(messages).values({ dealId: d.id, kind: "system", body: `Payment released. €${(d.creatorCents / 100).toFixed(2)} goes to the creator.` });
    await notify(tx, d.creatorId, "You got paid", "A payment was added to your balance.", `/deals/${d.id}`);
    await onCreatorPaid(tx, d);
    await payTip(tx, d);
    if (!d.creatorRating) await notify(tx, d.creatorId, "How was this buyer?", "Rate them in a few taps. It helps every creator.", `/deals/${d.id}#rate`);
  } else if (ef.kind === "refund_buyer") {
    const rq = await tx.query.requests.findFirst({ where: eq(requests.id, d.requestId), columns: { creditCents: true } });
    const credit = rq?.creditCents ?? 0;
    const paid = d.dealCents + d.feeCents + d.vatCents - credit;
    if (paid > 0) { await payments.refund({ ref: d.paymentRef, cents: paid }); await tx.insert(ledger).values({ dealId: d.id, userId: d.buyerId, entry: "buyer_refund", cents: paid }); }
    await giveCreditBack(tx, d.buyerId, d.requestId, credit);
    if (d.tipCents && d.tipRef) {                       // a tip on a deal that is refunded goes back too
      await payments.refund({ ref: d.tipRef, cents: d.tipCents });
      await tx.insert(ledger).values({ dealId: d.id, userId: d.buyerId, entry: "buyer_refund", cents: d.tipCents });
    }
    await notify(tx, d.buyerId, "Refund on its way", "You were refunded in full.", `/deals/${d.id}`);
  } else {
    // A lost dispute alone never closes an account. It is logged; staff see repeated flags on the
    // account page and can decide to block, with a statement of reasons the person can appeal.
    const uid = ef.kind === "flag_creator" ? d.creatorId : d.buyerId;
    await log(tx, "system", "account.flagged", uid, { dealId: d.id, reason: ef.reason });
  }
}
