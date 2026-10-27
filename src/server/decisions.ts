import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";

/* DSA art. 17: a clear statement of reasons for every restriction: what was decided, on which
   ground, the facts, how far it reaches, whether it was automated, and how to appeal (art. 20).
   The person gets it in their inbox; a blocked account sees it when trying to sign in. */
export type Decision = { userId: string; action: string; ground: "illegal_content" | "terms"; facts: string; scope: string; automated?: boolean; decidedBy: string };

export const ACTION_LABEL: Record<string, string> = {
  account_blocked: "Your account was closed",
  account_unblocked: "Your account was reopened",
  creator_restricted: "Your creator account was restricted",
  creator_suspended: "Your creator account was suspended",
  creator_restriction_lifted: "The restriction on your creator account was lifted",
  content_rejected: "A delivery was not approved",
  age_closed: "Your account was closed because you are under 18",
};

export async function issueDecision(tx: Tx | typeof db, d: Decision) {
  const [row] = await tx.insert(schema.decisions).values({ ...d, facts: d.facts.slice(0, 1000), automated: d.automated ?? false }).returning();
  await tx.insert(schema.notifications).values({ userId: d.userId, title: ACTION_LABEL[d.action] ?? "A decision about your account", body: "Read why, and how to appeal.", href: `/decisions/${row.id}` });
  return row;
}

export async function decisionsFor(userId: string) {
  return db.select().from(schema.decisions).where(eq(schema.decisions.userId, userId)).orderBy(desc(schema.decisions.createdAt)).limit(20);
}
