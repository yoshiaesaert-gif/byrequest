import "server-only";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { createHash } from "crypto";

// The team secret keys are stored encrypted with a key derived from the server secret.
const box = () => new Uint8Array(createHash("sha256").update("team-chat:" + (process.env.SESSION_SECRET || "dev-secret")).digest());
const seal = (secretB64: string) => { const n = nacl.randomBytes(nacl.secretbox.nonceLength); return `${encodeBase64(n)}.${encodeBase64(nacl.secretbox(decodeUTF8(secretB64), n, box()))}`; };
const unseal = (v: string) => { const [n, c] = v.split("."); const o = nacl.secretbox.open(decodeBase64(c), decodeBase64(n), box()); if (!o) throw new Error("team key"); return encodeUTF8(o); };
import { RuleError } from "@/domain/rules";
import { notify } from "./deals";
import { log } from "./onboarding";

/* Staff answer as a team profile (a request posted by ByRequest itself). Team profiles have a key pair
   held by the server, so creators chat with them end to end like with anyone; only staff can open it. */
async function teamKeys(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(S.users.id, userId) });
  if (!u?.house) throw new RuleError("Only team profiles can be answered from the back office.");
  if (u.chatKey && u.publicKey) return { pub: u.publicKey, secret: decodeBase64(unseal(u.chatKey)) };
  const kp = nacl.box.keyPair();
  await db.update(S.users).set({ publicKey: encodeBase64(kp.publicKey), chatKey: seal(encodeBase64(kp.secretKey)) }).where(eq(S.users.id, userId));
  return { pub: encodeBase64(kp.publicKey), secret: kp.secretKey };
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
    let text = "(This message could not be opened: it was sent before the team key existed.)";
    try { const o = creator.publicKey ? nacl.box.open(decodeBase64(m.body), decodeBase64(m.nonce), decodeBase64(creator.publicKey), k.secret) : null; if (o) text = encodeUTF8(o); } catch { /* stays unreadable */ }
    return { id: m.id, mine: m.senderId === buyer.id, system: false, text, at: m.createdAt };
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
    await tx.insert(S.messages).values({ dealId, senderId: th.buyer.id, kind: "e2e", nonce: encodeBase64(nonce), body: encodeBase64(body) });
    await notify(tx, th.creator.id, "New message", "You have a new message.", `/deals/${dealId}`);
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
