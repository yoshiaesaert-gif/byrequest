import "server-only";
import { and, desc, eq, gt, count, inArray } from "drizzle-orm";
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

export async function openIssues() {
  return db.select({ i: techIssues, handle: users.handle }).from(techIssues).leftJoin(users, eq(users.id, techIssues.userId)).orderBy(desc(techIssues.createdAt)).limit(500);
}

export async function setIssue(id: string, status: "open" | "handling" | "done", by: string) {
  await db.update(techIssues).set({ status, handledBy: by, handledAt: status === "done" ? new Date() : null }).where(eq(techIssues.id, id));
}

/* Answer the person from ByRequest: it lands in their ByRequest messages. */
export async function answerIssue(id: string, text: string, by: string) {
  const i = await db.query.techIssues.findFirst({ where: eq(techIssues.id, id) });
  if (!i?.userId) throw new RuleError("This person has no account any more.");
  const body = text.trim().slice(0, 1500);
  if (!body) throw new RuleError("Write a short answer first.");
  await db.insert(notifications).values({ userId: i.userId, title: "About your report", body, href: TEAM_HREF });
  await setIssue(id, "done", by);
}

export async function setIssues(ids: string[], status: "open" | "handling" | "done", by: string) {
  if (!ids.length) return;
  await db.update(techIssues).set({ status, handledBy: by, handledAt: status === "done" ? new Date() : null }).where(inArray(techIssues.id, ids.slice(0, 200)));
}
