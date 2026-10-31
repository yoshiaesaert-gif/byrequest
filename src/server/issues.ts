import "server-only";
import { and, desc, eq, gt, count, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import { TEAM_HREF } from "./queries";

const { techIssues, notifications, users } = schema;

/* A technical problem from a signed in person. Five an hour is plenty; it shows up in the back office (menu badge and overview), never in anyone's notifications. */
export async function reportIssue(userId: string, handle: string, input: { message: string; page: string; context: Record<string, unknown> }) {
  const message = input.message.trim().slice(0, 2000);
  if (message.length < 5) throw new RuleError("Tell us a little more about what went wrong.");
  const [recent] = await db.select({ n: count() }).from(techIssues).where(and(eq(techIssues.userId, userId), gt(techIssues.createdAt, new Date(Date.now() - 3600_000))));
  if (recent.n >= 5) throw new RuleError("You already sent a few reports. We are on it.");
  const [row] = await db.insert(techIssues).values({ userId, message, page: input.page.slice(0, 300), context: input.context }).returning({ id: techIssues.id });
  return row.id;
}

/* Each ticket keeps its own conversation in context.thread: replies from the team (with the notification they became,
   so we can show when it was read), internal notes only the team sees, replies from the person, and status events. */
export type Entry = { at: string; kind: "reply" | "note" | "event" | "customer"; by?: string; text: string; nid?: string };
type Ctx = Record<string, unknown> & { thread?: Entry[]; answers?: { at: string; by: string; text: string }[] };

async function push(id: string, e: Omit<Entry, "at">, set: Partial<typeof techIssues.$inferInsert> = {}) {
  const i = await db.query.techIssues.findFirst({ where: eq(techIssues.id, id) });
  if (!i) throw new RuleError("This ticket no longer exists.");
  const ctx = (i.context ?? {}) as Ctx;
  await db.update(techIssues).set({ ...set, context: { ...ctx, thread: [...(ctx.thread ?? []), { ...e, at: new Date().toISOString() }] } }).where(eq(techIssues.id, id));
  return i;
}

export async function openIssues() {
  const rows = await db.select({ i: techIssues, handle: users.handle, isCreator: users.isCreator, joined: users.createdAt, avatar: users.avatar, banned: users.bannedAt,
    identity: sql<string | null>`(select o.identity from creator_onboarding o where o.user_id = ${techIssues.userId})`,
    lastSeen: sql<Date | null>`(select max(v.last_at) from visits v where v.user_id = ${techIssues.userId})`,
    tickets: sql<number>`(select count(*)::int from tech_issues t where t.user_id = ${techIssues.userId})` })
    .from(techIssues).leftJoin(users, eq(users.id, techIssues.userId)).orderBy(desc(techIssues.createdAt)).limit(500);
  // Read receipts: a reply is read once the person opened their ByRequest messages.
  const nids = rows.flatMap((r) => ((r.i.context as Ctx).thread ?? []).map((e) => e.nid).filter((x): x is string => !!x));
  const read = new Map<string, Date | null>();
  if (nids.length) for (const n of await db.select({ id: notifications.id, readAt: notifications.readAt }).from(notifications).where(inArray(notifications.id, nids))) read.set(n.id, n.readAt);
  // Answers sent before tickets kept a thread: found back as the notification sent when the ticket was closed.
  const legacy = rows.filter((r) => r.i.userId && r.i.handledAt && !(r.i.context as Ctx).thread?.length);
  const old = legacy.length ? await db.select().from(notifications).where(and(inArray(notifications.userId, legacy.map((r) => r.i.userId!)), eq(notifications.title, "About your report"))) : [];
  return rows.map((r) => {
    const ctx = r.i.context as Ctx;
    let thread = (ctx.thread ?? []).map((e) => ({ ...e, readAt: e.nid ? read.get(e.nid)?.toISOString() ?? null : null }));
    if (!thread.length && r.i.handledAt) {
      const n = old.find((x) => x.userId === r.i.userId && Math.abs(+x.createdAt - +r.i.handledAt!) < 120_000);
      if (n) thread = [{ at: n.createdAt.toISOString(), kind: "reply", by: r.i.handledBy ?? undefined, text: n.body, nid: n.id, readAt: n.readAt?.toISOString() ?? null }];
    }
    return { ...r, thread };
  });
}

export async function setIssue(id: string, status: "open" | "handling" | "done", by: string) {
  const i = await db.query.techIssues.findFirst({ where: eq(techIssues.id, id), columns: { status: true } });
  if (!i || i.status === status) return;
  await push(id, { kind: "event", by, text: status === "done" ? "Closed the ticket" : status === "handling" ? "Took the ticket" : "Reopened the ticket" },
    { status, handledBy: by, handledAt: status === "done" ? new Date() : null });
}

/* Answer the person from ByRequest: it lands in their ByRequest messages, and the ticket shows when they read it. */
export async function answerIssue(id: string, text: string, by: string, close = true) {
  const i = await db.query.techIssues.findFirst({ where: eq(techIssues.id, id) });
  if (!i?.userId) throw new RuleError("This person has no account any more.");
  const body = text.trim().slice(0, 1500);
  if (!body) throw new RuleError("Write a short answer first.");
  const [n] = await db.insert(notifications).values({ userId: i.userId, title: "About your report", body, href: TEAM_HREF }).returning({ id: notifications.id });
  await push(id, { kind: "reply", by, text: body, nid: n.id }, { status: close ? "done" : "handling", handledBy: by, handledAt: close ? new Date() : null });
}

export async function noteIssue(id: string, text: string, by: string) {
  const body = text.trim().slice(0, 1500);
  if (!body) throw new RuleError("Write the note first.");
  await push(id, { kind: "note", by, text: body });
}

export async function assignIssue(id: string, by: string) {
  await push(id, { kind: "event", by, text: "Assigned the ticket to themselves" }, { handledBy: by, status: "handling" });
}

/* The person answers back from their ByRequest messages: it joins their latest ticket of the last 30 days and opens
   it again, or starts a new one. */
export async function customerReply(userId: string, text: string) {
  const body = text.trim().slice(0, 2000);
  if (body.length < 2) throw new RuleError("Write a message first.");
  const [recent] = await db.select({ n: count() }).from(techIssues).where(and(eq(techIssues.userId, userId), gt(techIssues.createdAt, new Date(Date.now() - 3600_000))));
  const last = await db.query.techIssues.findFirst({ where: and(eq(techIssues.userId, userId), gt(techIssues.createdAt, new Date(Date.now() - 30 * 86400_000))), orderBy: desc(techIssues.createdAt) });
  if (last) { await push(last.id, { kind: "customer", text: body }, { status: "open" }); return; }
  if (recent.n >= 5) throw new RuleError("You already sent a few messages. We are on it.");
  await db.insert(techIssues).values({ userId, message: body, kind: "message", topic: "question", page: TEAM_HREF });
}

export async function setIssues(ids: string[], status: "open" | "handling" | "done", by: string) {
  for (const id of ids.slice(0, 200)) await setIssue(id, status, by);
}

/* The contact form: open to everyone, lands in the back office. Nothing is sent by mail. */
const TOPICS = ["question", "problem", "payment", "account", "partnership", "other"] as const;
const hits = new Map<string, number[]>();
export async function sendContact(input: { message: string; topic: string; contact: string }, who: { userId: string | null; ip: string }) {
  const message = input.message.trim().slice(0, 3000);
  if (message.length < 10) throw new RuleError("Tell us a little more, so we can help.");
  const now = Date.now(); const key = who.userId ?? who.ip ?? "x";
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5) throw new RuleError("You already sent a few messages. We will get back to you.");
  hits.set(key, [...recent, now]); if (hits.size > 5000) hits.clear();
  const topic = (TOPICS as readonly string[]).includes(input.topic) ? input.topic : "other";
  await db.insert(techIssues).values({ userId: who.userId, message, kind: "message", topic, contact: input.contact.trim().slice(0, 200) || null, page: "/contact", context: {} });
}
