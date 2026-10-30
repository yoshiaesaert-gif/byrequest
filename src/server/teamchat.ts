import "server-only";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { createHash } from "crypto";

// The team secret keys are stored encrypted with a key derived from the server secret.
const box = () => new Uint8Array(createHash("sha256").update("team-chat:" + (process.env.SESSION_SECRET || "dev-secret")).digest());
const seal = (secretB64: string) => { const n = nacl.randomBytes(nacl.secretbox.nonceLength); return `${encodeBase64(n)}.${encodeBase64(nacl.secretbox(decodeUTF8(secretB64), n, box()))}`; };
const unseal = (v: string) => { const [n, c] = v.split("."); const o = nacl.secretbox.open(decodeBase64(c), decodeBase64(n), box()); if (!o) throw new Error("team key"); return encodeUTF8(o); };
import { RuleError } from "@/domain/rules";
import { notify } from "./deals";
import { notifyChat, scopeOf, clearTyping } from "./chatnotify";
import { log } from "./onboarding";

/* Staff answer as a team profile (a request posted by ByRequest itself). Team profiles have a key pair
   held by the server, so creators chat with them end to end like with anyone; only staff can open it. */
export async function teamKeys(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(S.users.id, userId) });
  if (!u?.house) throw new RuleError("Only team profiles can be answered from the back office.");
  if (u.chatKey && u.publicKey) return { pub: u.publicKey, secret: decodeBase64(unseal(u.chatKey)) };
  const kp = nacl.box.keyPair();
  await db.update(S.users).set({ publicKey: encodeBase64(kp.publicKey), chatKey: seal(encodeBase64(kp.secretKey)) }).where(eq(S.users.id, userId));
  return { pub: encodeBase64(kp.publicKey), secret: kp.secretKey };
}

// Try the key the message was sealed with, then the person's current key.
export const LOST = "(Sent before they switched to another phone or browser. It can no longer be opened: send it again.)";
export function openWith(body: string, nonce: string, keys: (string | null | undefined)[], secret: Uint8Array) {
  for (const k of keys) { if (!k) continue; try { const o = nacl.box.open(decodeBase64(body), decodeBase64(nonce), decodeBase64(k), secret); if (o) return encodeUTF8(o); } catch { /* try the next key */ } }
  return null;
}

/* Give every team profile its key pair, so creators can write to them before staff ever open a chat. */
export async function ensureTeamKeys() {
  const team = await db.select({ id: S.users.id }).from(S.users).where(eq(S.users.house, true));
  for (const t of team) await teamKeys(t.id);
}

export async function teamThread(dealId: string) {
  const d = await db.query.deals.findFirst({ where: eq(S.deals.id, dealId) });
  if (!d) return null;
  const [buyer, creator, r] = await Promise.all([db.query.users.findFirst({ where: eq(S.users.id, d.buyerId) }), db.query.users.findFirst({ where: eq(S.users.id, d.creatorId) }), db.query.requests.findFirst({ where: eq(S.requests.id, d.requestId) })]);
  if (!buyer?.house || !creator || !r) return null;
  const k = await teamKeys(buyer.id);
  const rows = await db.select().from(S.messages).where(eq(S.messages.dealId, dealId)).orderBy(asc(S.messages.createdAt));
  const msgs = rows.map((m) => {
    if (m.kind !== "e2e" || !m.nonce) return { id: m.id, mine: false, system: true, text: m.body, at: m.createdAt };
    const text = openWith(m.body, m.nonce, [m.peerKey, creator.publicKey], k.secret) ?? LOST;
    return { id: m.id, mine: m.senderId === buyer.id, system: false, text, at: m.createdAt, read: !!d.creatorReadAt && d.creatorReadAt >= m.createdAt };
  });
  return { d, buyer, creator, title: r.title, msgs };
}

export async function teamSend(staffId: string, dealId: string, text: string) {
  const t = text.trim();
  if (!t || t.length > 2000) throw new RuleError("Write a message first.");
  const th = await teamThread(dealId);
  if (!th) throw new RuleError("Not a team chat.");
  if (!th.creator.publicKey) throw new RuleError("The creator has not opened ByRequest on a device yet.");
  const k = await teamKeys(th.buyer.id);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const body = nacl.box(decodeUTF8(t), nonce, decodeBase64(th.creator.publicKey), k.secret);
  await db.transaction(async (tx) => {
    await tx.insert(S.messages).values({ dealId, senderId: th.buyer.id, kind: "e2e", nonce: encodeBase64(nonce), body: encodeBase64(body), peerKey: th.creator.publicKey });
    await clearTyping(scopeOf("deal", dealId), th.buyer.id);
    await notifyChat(tx, { userId: th.creator.id, scope: scopeOf("deal", dealId), href: `/deals/${dealId}`, title: "New message" });
    await log(tx, `staff:${staffId}`, "house.chat_sent", th.creator.id, { dealId });
  });
}

/* Every application a creator sent, with the request and who posted it. */
export async function applicationsOf(creatorId: string) {
  return db.select({ o: S.offers, title: S.requests.title, requestId: S.requests.id, reqStatus: S.requests.status, dealCents: S.requests.dealCents, author: S.users.handle, authorHouse: S.users.house,
    dealId: S.deals.id, dealStatus: S.deals.status })
    .from(S.offers).innerJoin(S.requests, eq(S.requests.id, S.offers.requestId)).innerJoin(S.users, eq(S.users.id, S.requests.buyerId))
    .leftJoin(S.deals, and(eq(S.deals.offerId, S.offers.id)))
    .where(eq(S.offers.creatorId, creatorId)).orderBy(desc(S.offers.createdAt)).limit(100);
}

/* ---------- questions before a choice, on one application ---------- */
export async function offerParties(offerId: string) {
  const o = await db.query.offers.findFirst({ where: eq(S.offers.id, offerId) });
  const r = o ? await db.query.requests.findFirst({ where: eq(S.requests.id, o.requestId) }) : null;
  if (!o || !r) return null;
  const [buyer, creator] = await Promise.all([db.query.users.findFirst({ where: eq(S.users.id, r.buyerId) }), db.query.users.findFirst({ where: eq(S.users.id, o.creatorId) })]);
  return buyer && creator ? { o, r, buyer, creator } : null;
}

/* Staff side: the conversation as the team profile, decrypted on the server. */
export async function teamOfferThread(offerId: string) {
  const x = await offerParties(offerId);
  if (!x?.buyer.house) return null;
  const k = await teamKeys(x.buyer.id);
  const rows = await db.select().from(S.offerMessages).where(eq(S.offerMessages.offerId, offerId)).orderBy(asc(S.offerMessages.createdAt));
  await db.update(S.offerMessages).set({ readAt: new Date() }).where(and(eq(S.offerMessages.offerId, offerId), eq(S.offerMessages.senderId, x.creator.id), isNull(S.offerMessages.readAt)));
  const msgs = rows.map((m) => {
    const text = openWith(m.body, m.nonce, [m.peerKey, x.creator.publicKey], k.secret) ?? LOST;
    return { id: m.id, mine: m.senderId === x.buyer.id, system: false, text, at: m.createdAt, read: !!m.readAt };
  });
  return { ...x, msgs };
}

export async function teamOfferSend(staffId: string, offerId: string, text: string) {
  const t = text.trim();
  if (!t || t.length > 2000) throw new RuleError("Write a message first.");
  const x = await offerParties(offerId);
  if (!x?.buyer.house) throw new RuleError("Only team requests can be answered from the back office.");
  if (!x.creator.publicKey) throw new RuleError("The creator has not opened ByRequest on a device yet.");
  const k = await teamKeys(x.buyer.id);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const body = nacl.box(decodeUTF8(t), nonce, decodeBase64(x.creator.publicKey), k.secret);
  await db.transaction(async (tx) => {
    await tx.insert(S.offerMessages).values({ offerId, senderId: x.buyer.id, nonce: encodeBase64(nonce), body: encodeBase64(body), peerKey: x.creator.publicKey });
    await clearTyping(scopeOf("offer", offerId), x.buyer.id);
    await notifyChat(tx, { userId: x.creator.id, scope: scopeOf("offer", offerId), href: `/requests/${x.r.id}#talk`, title: "A question about your application" });
    await log(tx, `staff:${staffId}`, "house.offer_message", x.creator.id, { offerId });
  });
}

/* Either party, from the app: the ciphertexts and the other side's public key. Only buyer and candidate. */
export async function offerThreadFor(userId: string, offerId: string) {
  const x = await offerParties(offerId);
  if (!x || (x.buyer.id !== userId && x.creator.id !== userId)) return null;
  const other = x.buyer.id === userId ? x.creator : x.buyer;
  if (other.house) await teamKeys(other.id);
  const fresh = other.house ? await db.query.users.findFirst({ where: eq(S.users.id, other.id) }) : other;
  if (other.house && x.creator.publicKey) { const k = await teamKeys(other.id); await reseal(await db.select().from(S.offerMessages).where(eq(S.offerMessages.offerId, offerId)), x.creator.publicKey, k.secret, "offer"); }
  const rows = await db.select().from(S.offerMessages).where(eq(S.offerMessages.offerId, offerId)).orderBy(asc(S.offerMessages.createdAt));
  await db.update(S.offerMessages).set({ readAt: new Date() }).where(and(eq(S.offerMessages.offerId, offerId), eq(S.offerMessages.senderId, other.id), isNull(S.offerMessages.readAt)));
  return { other: { id: other.id, handle: other.handle, publicKey: fresh?.publicKey ?? null }, msgs: rows.map((m) => ({ id: m.id, mine: m.senderId === userId, nonce: m.nonce, body: m.body, at: m.createdAt.toISOString(), read: !!m.readAt })) };
}

export async function offerSendFrom(userId: string, offerId: string, sealed: { nonce: string; body: string }) {
  const x = await offerParties(offerId);
  if (!x || (x.buyer.id !== userId && x.creator.id !== userId)) throw new RuleError("Not found.");
  if (x.r.status !== "open" && x.o.status !== "accepted") throw new RuleError("This request is closed.");
  if (sealed.body.length > 6000) throw new RuleError("That message is too long.");
  const toBuyer = x.creator.id === userId;
  await db.transaction(async (tx) => {
    await tx.insert(S.offerMessages).values({ offerId, senderId: userId, nonce: sealed.nonce, body: sealed.body, peerKey: x.creator.id === userId ? x.creator.publicKey : null });
    if (toBuyer && x.buyer.house) {
      // Team requests: the staff hear about it, with a link straight to the conversation.
      for (const st of await tx.select({ userId: S.staff.userId }).from(S.staff)) await notify(tx, st.userId, `${x.creator.handle} replied`, `About "${x.r.title}" (${x.buyer.handle}).`, `/admin/offer-chat/${offerId}`);
    } else await notify(tx, toBuyer ? x.buyer.id : x.creator.id, toBuyer ? "A candidate replied" : "A question about your application", "You have a new message.", toBuyer ? `/requests/${x.r.id}/offers` : `/requests/${x.r.id}#talk`);
  });
}

export async function offerUnread(offerIds: string[], from: string) {
  if (!offerIds.length) return {} as Record<string, number>;
  const rows = await db.select({ id: S.offerMessages.offerId, n: sql<number>`count(*)::int` }).from(S.offerMessages).where(and(inArray(S.offerMessages.offerId, offerIds), isNull(S.offerMessages.readAt), eq(S.offerMessages.senderId, from))).groupBy(S.offerMessages.offerId);
  return Object.fromEntries(rows.map((r) => [r.id, r.n])) as Record<string, number>;
}

/* A creator who switches phone or browser gets a new key. Messages between them and a team profile
   are sealed again for the new key, so both sides keep the whole conversation. (Between two real
   people this cannot be done: nobody but them holds the keys.) */
async function reseal(rows: { id: string; nonce: string | null; body: string; peerKey: string | null }[], creatorPub: string, secret: Uint8Array, table: "messages" | "offer") {
  for (const m of rows) {
    if (!m.nonce || !m.peerKey || m.peerKey === creatorPub) continue;
    const text = openWith(m.body, m.nonce, [m.peerKey], secret);
    if (text === null) continue;
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const set = { nonce: encodeBase64(nonce), body: encodeBase64(nacl.box(decodeUTF8(text), nonce, decodeBase64(creatorPub), secret)), peerKey: creatorPub };
    if (table === "messages") await db.update(S.messages).set(set).where(eq(S.messages.id, m.id));
    else await db.update(S.offerMessages).set(set).where(eq(S.offerMessages.id, m.id));
  }
}
export async function resealTeamDeal(dealId: string) {
  const d = await db.query.deals.findFirst({ where: eq(S.deals.id, dealId) });
  const [buyer, creator] = d ? await Promise.all([db.query.users.findFirst({ where: eq(S.users.id, d.buyerId) }), db.query.users.findFirst({ where: eq(S.users.id, d.creatorId) })]) : [];
  if (!buyer?.house || !creator?.publicKey) return;
  const k = await teamKeys(buyer.id);
  await reseal(await db.select().from(S.messages).where(and(eq(S.messages.dealId, dealId), eq(S.messages.kind, "e2e"))), creator.publicKey, k.secret, "messages");
}
