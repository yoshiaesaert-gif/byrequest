import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema as S, type Tx } from "@/db";

/* A chat shows who looks at it right now. Someone who has the chat open is not notified (they see the
   message arrive), and a person who is away gets one notification per chat that counts up, never one per message. */
export const LIVE_MS = 12_000;
export const TYPING_MS = 5_000;
export const scopeOf = (kind: "deal" | "offer", id: string) => `${kind}:${id}`;

export async function isHere(scope: string, userId: string) {
  const r = await db.query.chatLive.findFirst({ where: and(eq(S.chatLive.scope, scope), eq(S.chatLive.userId, userId), gt(S.chatLive.seenAt, new Date(Date.now() - LIVE_MS))), columns: { userId: true } });
  return !!r;
}

export async function notifyChat(tx: Tx, p: { userId: string; scope: string; href: string; title: string }) {
  if (await isHere(p.scope, p.userId)) return;
  const [cur] = await tx.select().from(S.notifications).where(and(eq(S.notifications.userId, p.userId), eq(S.notifications.href, p.href), eq(S.notifications.title, p.title), isNull(S.notifications.readAt))).orderBy(desc(S.notifications.createdAt)).limit(1);
  if (cur) {
    const n = (Number(cur.body.match(/\d+/)?.[0]) || 1) + 1;
    await tx.update(S.notifications).set({ body: `You have ${n} new messages.`, createdAt: new Date() }).where(eq(S.notifications.id, cur.id));
  } else await tx.insert(S.notifications).values({ userId: p.userId, title: p.title, body: "You have a new message.", href: p.href });
}

/* Sending a message ends "typing…". */
export async function clearTyping(scope: string, userId: string) {
  await db.update(S.chatLive).set({ typingAt: null }).where(and(eq(S.chatLive.scope, scope), eq(S.chatLive.userId, userId)));
}
