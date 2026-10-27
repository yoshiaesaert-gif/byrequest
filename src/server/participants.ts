import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import { PROVIDER_ENV } from "@/config/compliance";
import { identityAdapter } from "./providers";
import { releaseToVault } from "./deals";
import { currentDoc, log } from "./onboarding";
import { seal } from "./seal";

const { participants, participantConsents, deliveries, identityChecks, vaultItems, removalRequests } = schema;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const appUrl = () => process.env.APP_URL || "http://localhost:3000";

/* A creator adds each other person who appears. That person verifies and consents through a
   private link, without needing a ByRequest account. */
export async function addParticipant(creatorId: string, label: string) {
  const token = randomBytes(24).toString("base64url");
  const [p] = await db.insert(participants).values({ creatorId, label: label.trim().slice(0, 40) || "Participant", inviteTokenHash: hash(token) }).returning();
  await log(db, `user:${creatorId}`, "participant.added", creatorId, { participantId: p.id });
  return { participant: p, link: `${appUrl()}/consent/${token}` };
}

export async function byToken(token: string) {
  return db.query.participants.findFirst({ where: eq(participants.inviteTokenHash, hash(token)) });
}

export async function startParticipantIdentity(token: string) {
  const p = await byToken(token);
  if (!p) throw new RuleError("This link is not valid.");
  if (p.identity === "approved") throw new RuleError("Already verified.");
  const ad = identityAdapter();
  if (!ad) throw new RuleError("Verification is not available yet.");
  const s = await ad.start({ subject: `participant:${p.id}`, returnUrl: `${appUrl()}/consent/${token}` });
  await db.insert(identityChecks).values({ participantId: p.id, provider: ad.id, env: PROVIDER_ENV, externalRef: s.externalRef, status: "pending" });
  await db.update(participants).set({ identity: "pending" }).where(eq(participants.id, p.id));
  return s.redirectUrl;
}

export async function pendingFor(participantId: string) {
  return db.select({ dl: deliveries, title: schema.requests.title, category: schema.requests.category, amount: schema.requests.amount, consent: participantConsents })
    .from(deliveries).innerJoin(schema.deals, eq(schema.deals.id, deliveries.dealId)).innerJoin(schema.requests, eq(schema.requests.id, schema.deals.requestId))
    .leftJoin(participantConsents, and(eq(participantConsents.deliveryId, deliveries.id), eq(participantConsents.participantId, participantId)))
    .where(sql`${deliveries.participantIds} @> ${JSON.stringify([participantId])}::jsonb`);
}

export async function consent(token: string, deliveryId: string, depicted: boolean, distribution: boolean) {
  const p = await byToken(token);
  if (!p) throw new RuleError("This link is not valid.");
  if (p.identity !== "approved") throw new RuleError("Verify your identity first.");
  const dl = await db.query.deliveries.findFirst({ where: eq(deliveries.id, deliveryId) });
  if (!dl || !dl.participantIds.includes(p.id)) throw new RuleError("Not found.");
  if (!depicted || !distribution) throw new RuleError("Both confirmations are needed to share this delivery. You can also decline.");
  const doc = await currentDoc("participant_consent");
  await db.insert(participantConsents).values({ participantId: p.id, deliveryId, depicted, distribution, documentId: doc?.id ?? null }).onConflictDoUpdate({ target: [participantConsents.participantId, participantConsents.deliveryId], set: { depicted, distribution, withdrawnAt: null, givenAt: new Date() } });
  await log(db, `participant:${p.id}`, "participant.consent", dl.creatorId, { deliveryId, documentVersion: doc?.version ?? null });
  await releaseToVault(deliveryId);
}

/* Declining or withdrawing removes the delivery from any vault right away. */
export async function withdraw(token: string, deliveryId: string) {
  const p = await byToken(token);
  if (!p) throw new RuleError("This link is not valid.");
  const dl = await db.query.deliveries.findFirst({ where: eq(deliveries.id, deliveryId) });
  if (!dl || !dl.participantIds.includes(p.id)) throw new RuleError("Not found.");
  await db.insert(participantConsents).values({ participantId: p.id, deliveryId, depicted: false, distribution: false, withdrawnAt: new Date() })
    .onConflictDoUpdate({ target: [participantConsents.participantId, participantConsents.deliveryId], set: { withdrawnAt: new Date() } });
  await hideDelivery(deliveryId, `participant:${p.id}`);
}

export async function hideDelivery(deliveryId: string, actor: string) {
  const dl = await db.query.deliveries.findFirst({ where: eq(deliveries.id, deliveryId) });
  if (!dl) return;
  const n = await db.delete(vaultItems).where(eq(vaultItems.deliveryId, deliveryId)).returning();
  if (n.length) await db.insert(schema.messages).values({ dealId: dl.dealId, kind: "system", body: "This delivery was removed from the vault after a removal request." });
  await log(db, actor, "delivery.hidden", dl.creatorId, { deliveryId, items: n.length });
}

/* Called after a participant's identity result arrives. */
export async function reevaluate(participantId: string) {
  const rows = await db.select({ id: deliveries.id }).from(deliveries).where(sql`${deliveries.participantIds} @> ${JSON.stringify([participantId])}::jsonb and ${deliveries.review} = 'blocked_participants'`);
  for (const r of rows) await releaseToVault(r.id);
}

export async function listFor(creatorId: string) {
  return db.select().from(participants).where(eq(participants.creatorId, creatorId));
}

/* Anyone, with or without an account, can ask for content they appear in to be removed. */
export async function fileRemoval(contact: string, reference: string, description: string) {
  if (contact.trim().length < 5 || description.trim().length < 10) throw new RuleError("Add a way to reach you and a short description.");
  const [r] = await db.insert(removalRequests).values({ contactSealed: seal(contact.trim().slice(0, 200)), reference: reference.trim().slice(0, 300), description: description.trim().slice(0, 2000) }).returning();
  await log(db, "public", "removal.requested", null, { removalId: r.id });
  return r.id;
}

export async function openRemovals() {
  return db.select().from(removalRequests).where(eq(removalRequests.status, "received"));
}
