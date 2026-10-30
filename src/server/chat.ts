import "server-only";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64 } from "tweetnacl-util";
import { and, asc, eq, inArray, isNull, gt } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { RuleError } from "@/domain/rules";
import { blockedEither } from "./blocks";
import { teamKeys, openWith, LOST, offerParties, teamThread, teamOfferThread } from "./teamchat";
import { notifyChat, scopeOf, TYPING_MS } from "./chatnotify";

/* One place for both kinds of chat: the chat of a deal and the questions around an application.
   Chats with a team profile are readable on every device: the team profile is ByRequest itself, so the
   server opens those messages and hands the text to the person who writes with it. Chats between two
   real people stay end to end encrypted: only their own devices can open them. */
export type Kind = "deal" | "offer";
type User = NonNullable<Awaited<ReturnType<typeof db.query.users.findFirst>>>;
type Ctx = { kind: Kind; id: string; scope: string; me: User; other: User; buyer: User; creator: User; href: string; status: string | null; readAt: Date | null; closed: boolean; requestId: string | null };

async function resolve(userId: string, kind: Kind, id: string): Promise<Ctx | null> {
  if (kind === "deal") {
    const d = await db.query.deals.findFirst({ where: eq(S.deals.id, id) });
    if (!d || (d.buyerId !== userId && d.creatorId !== userId)) return null;
    const [buyer, creator] = await Promise.all([db.query.users.findFirst({ where: eq(S.users.id, d.buyerId) }), db.query.users.findFirst({ where: eq(S.users.id, d.creatorId) })]);
    if (!buyer || !creator) return null;
    const isBuyer = buyer.id === userId, other = isBuyer ? creator : buyer;
    return { kind, id, scope: scopeOf(kind, id), me: isBuyer ? buyer : creator, other, buyer, creator, href: `/deals/${id}`, status: d.status, readAt: isBuyer ? d.creatorReadAt : d.buyerReadAt, closed: await blockedEither(buyer.id, creator.id), requestId: d.requestId };
  }
  const x = await offerParties(id);
  if (!x || (x.buyer.id !== userId && x.creator.id !== userId)) return null;
  const isBuyer = x.buyer.id === userId;
  return { kind, id, scope: scopeOf(kind, id), me: isBuyer ? x.buyer : x.creator, other: isBuyer ? x.creator : x.buyer, buyer: x.buyer, creator: x.creator, href: isBuyer ? `/requests/${x.r.id}/offers/${id}` : `/requests/${x.r.id}/talk`,
    status: null, readAt: null, closed: x.r.status !== "open" && x.o.status !== "accepted", requestId: x.r.id };
}

/* The person opening or watching the chat has now seen what the other wrote. */
async function markRead(c: Ctx, now: Date) {
  if (c.kind === "deal") {
    await db.update(S.deals).set(c.me.id === c.buyer.id ? { buyerReadAt: now } : { creatorReadAt: now }).where(eq(S.deals.id, c.id));
    await db.update(S.notifications).set({ readAt: now }).where(and(eq(S.notifications.userId, c.me.id), eq(S.notifications.href, c.href), isNull(S.notifications.readAt)));
  } else {
    await db.update(S.offerMessages).set({ readAt: now }).where(and(eq(S.offerMessages.offerId, c.id), eq(S.offerMessages.senderId, c.other.id), isNull(S.offerMessages.readAt)));
    await db.update(S.notifications).set({ readAt: now }).where(and(eq(S.notifications.userId, c.me.id), isNull(S.notifications.readAt), eq(S.notifications.href, c.href), inArray(S.notifications.title, ["A candidate replied", "A question about your application"])));
  }
}

export type ChatMsg = { id: string; kind: "e2e" | "system"; mine: boolean; text: string | null; nonce: string | null; body: string; at: string; read: boolean };
export type ChatState = { v: string; status: string | null; typing: boolean; otherKey: string | null; closed: boolean; msgs: ChatMsg[] } | { same: true };

/* Called every couple of seconds by the open chat. Marks it as seen, so the other side's ticks turn green. */
export async function chatState(userId: string, kind: Kind, id: string, have?: string): Promise<ChatState | null> {
  const c = await resolve(userId, kind, id);
  if (!c) return null;
  const now = new Date();
  await db.insert(S.chatLive).values({ scope: c.scope, userId, seenAt: now }).onConflictDoUpdate({ target: [S.chatLive.scope, S.chatLive.userId], set: { seenAt: now } });
  await markRead(c, now);
  type Row = { id: string; kind: string; sender: string | null; nonce: string | null; body: string; peer: string | null; at: Date; readAt: Date | null };
  const load = async (): Promise<Row[]> => c.kind === "deal"
    ? (await db.select({ id: S.messages.id, kind: S.messages.kind, sender: S.messages.senderId, nonce: S.messages.nonce, body: S.messages.body, peer: S.messages.peerKey, at: S.messages.createdAt }).from(S.messages).where(eq(S.messages.dealId, c.id)).orderBy(asc(S.messages.createdAt))).map((m) => ({ ...m, readAt: null }))
    : (await db.select({ id: S.offerMessages.id, sender: S.offerMessages.senderId, nonce: S.offerMessages.nonce, body: S.offerMessages.body, peer: S.offerMessages.peerKey, at: S.offerMessages.createdAt, readAt: S.offerMessages.readAt }).from(S.offerMessages).where(eq(S.offerMessages.offerId, c.id)).orderBy(asc(S.offerMessages.createdAt))).map((m) => ({ ...m, kind: "e2e" }));
  const [rows, live] = await Promise.all([
    load(),
    db.query.chatLive.findFirst({ where: and(eq(S.chatLive.scope, c.scope), eq(S.chatLive.userId, c.other.id), gt(S.chatLive.typingAt, new Date(Date.now() - TYPING_MS))) }),
  ]);
  const typing = !!live;
  const readCount = c.kind === "deal" ? rows.filter((m) => m.sender === userId && c.readAt && c.readAt >= m.at).length : rows.filter((m) => m.sender === userId && m.readAt).length;
  const v = `${rows.length}:${rows[rows.length - 1]?.id ?? ""}:${readCount}:${typing ? 1 : 0}:${c.status ?? ""}:${c.closed ? 1 : 0}:${c.other.publicKey ?? ""}`;
  if (have && have === v) return { same: true };
  const secret = c.other.house ? (await teamKeys(c.other.id)).secret : null;
  const msgs: ChatMsg[] = rows.map((m) => {
    const mine = m.sender === userId;
    const system = c.kind === "deal" && m.kind === "system";
    const read = mine && (c.kind === "deal" ? !!c.readAt && c.readAt >= m.at : !!m.readAt);
    if (system) return { id: m.id, kind: "system", mine: false, text: m.body, nonce: null, body: m.body, at: m.at.toISOString(), read: false };
    // A team profile is ByRequest itself: the server opens its messages, so they show on every device.
    const text = secret && m.nonce ? (openWith(m.body, m.nonce, [m.peer, c.me.publicKey, c.other.publicKey], secret) ?? LOST) : null;
    return { id: m.id, kind: "e2e", mine, text, nonce: secret ? null : m.nonce, body: secret ? "" : m.body, at: m.at.toISOString(), read };
  });
  return { v, status: c.status, typing, otherKey: c.other.publicKey, closed: c.closed, msgs };
}

export async function setTyping(userId: string, kind: Kind, id: string) {
  const c = await resolve(userId, kind, id);
  if (!c) return;
  const now = new Date();
  await db.insert(S.chatLive).values({ scope: c.scope, userId, typingAt: now }).onConflictDoUpdate({ target: [S.chatLive.scope, S.chatLive.userId], set: { typingAt: now } });
}

/* Send a message. To a team profile the server seals it itself, so it works on any device; between two
   people the sender's device already sealed it. */
export async function postMessage(userId: string, kind: Kind, id: string, input: { text?: string; nonce?: string; body?: string }) {
  const c = await resolve(userId, kind, id);
  if (!c) throw new RuleError("Not found.");
  if (c.closed) throw new RuleError(c.kind === "deal" ? "This chat is closed." : "This request is closed.");
  let nonce: string, body: string, peerKey: string | null;
  if (c.other.house) {
    const t = (input.text ?? "").trim();
    if (!t || t.length > 2000) throw new RuleError("Write a message first.");
    const k = await teamKeys(c.other.id);
    const to = c.me.publicKey ?? k.pub;
    const n = nacl.randomBytes(nacl.box.nonceLength);
    nonce = encodeBase64(n); body = encodeBase64(nacl.box(decodeUTF8(t), n, decodeBase64(to), k.secret)); peerKey = to;
  } else {
    if (!input.nonce || !input.body || !/^[A-Za-z0-9+/=]{20,64}$/.test(input.nonce) || input.body.length > 8000) throw new RuleError("Invalid message.");
    nonce = input.nonce; body = input.body; peerKey = c.me.publicKey;
  }
  const at = new Date();
  const msg = await db.transaction(async (tx) => {
    const [m] = c.kind === "deal"
      ? await tx.insert(S.messages).values({ dealId: c.id, senderId: userId, kind: "e2e", nonce, body, peerKey }).returning({ id: S.messages.id })
      : await tx.insert(S.offerMessages).values({ offerId: c.id, senderId: userId, nonce, body, peerKey }).returning({ id: S.offerMessages.id });
    await tx.update(S.chatLive).set({ typingAt: null }).where(and(eq(S.chatLive.scope, c.scope), eq(S.chatLive.userId, userId)));
    if (c.other.house) {
      // The team answers from the back office: tell the staff, one line per conversation.
      const link = c.kind === "deal" ? `/admin/chat/${c.id}` : `/admin/offer-chat/${c.id}`;
      for (const st of await tx.select({ userId: S.staff.userId }).from(S.staff)) await notifyChat(tx, { userId: st.userId, scope: c.scope + ":staff", href: link, title: `${c.me.handle} replied` });
    } else if (c.kind === "deal") await notifyChat(tx, { userId: c.other.id, scope: c.scope, href: c.href, title: "New message" });
    else await notifyChat(tx, { userId: c.other.id, scope: c.scope, href: c.other.id === c.buyer.id ? `/requests/${c.requestId}/offers/${c.id}` : `/requests/${c.requestId}/talk`, title: c.other.id === c.buyer.id ? "A candidate replied" : "A question about your application" });
    return m;
  });
  return { id: msg.id, at: at.toISOString() };
}

/* Back office: who is typing in a team conversation right now (the creator), for the admin pages. */
export async function creatorTyping(kind: Kind, id: string, creatorId: string) {
  const r = await db.query.chatLive.findFirst({ where: and(eq(S.chatLive.scope, scopeOf(kind, id)), eq(S.chatLive.userId, creatorId), gt(S.chatLive.typingAt, new Date(Date.now() - TYPING_MS))) });
  return !!r;
}
export async function teamTyping(kind: Kind, id: string) {
  const team = kind === "deal"
    ? (await db.query.deals.findFirst({ where: eq(S.deals.id, id), columns: { buyerId: true } }))?.buyerId
    : (await offerParties(id))?.buyer.id;
  if (!team) return;
  const now = new Date();
  await db.insert(S.chatLive).values({ scope: scopeOf(kind, id), userId: team, typingAt: now }).onConflictDoUpdate({ target: [S.chatLive.scope, S.chatLive.userId], set: { typingAt: now } });
}

/* Back office: the same state as the creator sees, as the team profile, with the text opened on the server. */
export async function staffState(staffUserId: string, kind: Kind, id: string, have?: string): Promise<ChatState | null> {
  const th = kind === "deal" ? await teamThread(id) : await teamOfferThread(id);
  if (!th) return null;
  if (kind === "deal") await db.update(S.deals).set({ buyerReadAt: new Date() }).where(eq(S.deals.id, id));
  const href = kind === "deal" ? `/admin/chat/${id}` : `/admin/offer-chat/${id}`;
  await db.update(S.notifications).set({ readAt: new Date() }).where(and(eq(S.notifications.userId, staffUserId), eq(S.notifications.href, href), isNull(S.notifications.readAt)));
  const typing = await creatorTyping(kind, id, th.creator.id);
  const msgs: ChatMsg[] = th.msgs.map((m) => ({ id: m.id, kind: "system" in m && m.system ? "system" : "e2e", mine: m.mine, text: m.text, nonce: null, body: "", at: m.at.toISOString(), read: "read" in m ? !!m.read : false }));
  const v = `${msgs.length}:${msgs[msgs.length - 1]?.id ?? ""}:${msgs.filter((m) => m.read).length}:${typing ? 1 : 0}`;
  return have && have === v ? { same: true } : { v, status: null, typing, otherKey: null, closed: false, msgs };
}
