import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { log } from "./onboarding";
import { seal } from "./seal";
import { RuleError } from "@/domain/rules";

/* Reports of abuse. Anyone can file one, with or without an account (Belgian Criminal Code
   art. 433quater/2 and its royal decree of 18 May 2024 ask a clear way to report exploitation and
   trafficking; DSA art. 16 asks a notice mechanism for illegal content). Exploitation, trafficking and
   minors come first. A report from an account staff marked as a recognised organisation (trusted
   flagger, DSA art. 22) jumps the queue. */
const S = schema;
export const REPORT_KINDS = {
  trafficking: "Someone is forced, exploited or controlled by someone else",
  minor: "Someone may be under 18",
  non_consensual: "Content shared or made without consent",
  meeting: "Someone asks to meet in person",
  off_platform: "Someone asks to pay or talk outside ByRequest",
  other: "Something else that breaks the rules",
} as const;
export type ReportKind = keyof typeof REPORT_KINDS;
const PRIORITY: Record<ReportKind, number> = { trafficking: 0, minor: 0, non_consensual: 1, meeting: 2, off_platform: 3, other: 3 };
const TARGETS = ["profile", "request", "deal", "content", "url", "none"] as const;

export async function fileReport(input: { kind: string; details: string; contact?: string; targetType?: string; targetRef?: string }, reporterId: string | null) {
  if (!(input.kind in REPORT_KINDS)) throw new RuleError("Choose what you want to report.");
  const details = input.details.trim();
  if (details.length < 10) throw new RuleError("Describe what happened in a few words.");
  const kind = input.kind as ReportKind;
  const targetType = (TARGETS as readonly string[]).includes(input.targetType ?? "") ? (input.targetType as (typeof TARGETS)[number]) : "none";
  const reporter = reporterId ? await db.query.users.findFirst({ where: eq(S.users.id, reporterId), columns: { supportOrg: true } }) : null;
  const trusted = reporter?.supportOrg ?? null;
  const [r] = await db.insert(S.reports).values({
    kind, details: details.slice(0, 4000), targetType, targetRef: (input.targetRef ?? "").slice(0, 300),
    contactSealed: input.contact?.trim() ? seal({ contact: input.contact.trim().slice(0, 200) }) : null,
    reporterId, trustedFlagger: trusted, priority: trusted ? Math.max(0, PRIORITY[kind] - 1) : PRIORITY[kind],
  }).returning();
  await log(db, reporterId ? `user:${reporterId}` : "public", "report.filed", null, { reportId: r.id, kind, trusted: !!trusted });
  return r.id;
}

export async function openReports() {
  return db.select({ r: S.reports, by: S.users.handle }).from(S.reports).leftJoin(S.users, eq(S.users.id, S.reports.reporterId))
    .where(inArray(S.reports.status, ["received", "reviewing"])).orderBy(asc(S.reports.priority), asc(S.reports.createdAt)).limit(100);
}

/* Passing a report to the police is a separate, logged outcome: the decree asks platforms to hand
   suspected abuse and trafficking to the police and judicial authorities without delay. */
export async function handleReport(staffId: string, id: string, status: "reviewing" | "actioned" | "passed_to_police" | "rejected", note: string) {
  const r = await db.query.reports.findFirst({ where: eq(S.reports.id, id) });
  if (!r) throw new RuleError("Report not found.");
  if (status !== "reviewing" && note.trim().length < 5) throw new RuleError("Add a short note on what was done.");
  await db.update(S.reports).set({ status, note: note.slice(0, 1000), handledBy: `staff:${staffId}`, handledAt: status === "reviewing" ? null : new Date() }).where(and(eq(S.reports.id, id)));
  await log(db, `staff:${staffId}`, `report.${status}`, null, { reportId: id, kind: r.kind });
}

/* Staff mark an account as a recognised support organisation (specialised centre, sex worker
   organisation or trusted flagger). It gets priority on reports and can contact creators. */
export async function setSupportOrg(staffId: string, userId: string, org: string | null) {
  await db.update(S.users).set({ supportOrg: org?.trim() ? org.trim().slice(0, 120) : null }).where(eq(S.users.id, userId));
  await log(db, `staff:${staffId}`, org ? "staff.support_org_set" : "staff.support_org_removed", userId, org ? { org } : {});
}

/* A recognised support organisation can write to a creator. The message lands in the creator's
   inbox, marked with the organisation's name, so a creator always knows who is writing. */
export async function contactCreator(orgUserId: string, creatorHandle: string, text: string) {
  const org = await db.query.users.findFirst({ where: eq(S.users.id, orgUserId), columns: { supportOrg: true } });
  if (!org?.supportOrg) throw new RuleError("Only recognised support organisations can do this.");
  const c = await db.query.users.findFirst({ where: eq(S.users.handle, creatorHandle), columns: { id: true, isCreator: true } });
  if (!c?.isCreator) throw new RuleError("Creator not found.");
  const body = text.trim();
  if (body.length < 10) throw new RuleError("Write a short message.");
  await db.insert(S.notifications).values({ userId: c.id, title: `Message from ${org.supportOrg}, a support organisation`, body: body.slice(0, 1000), href: "/inbox" });
  await log(db, `user:${orgUserId}`, "support_org.contacted_creator", c.id, { org: org.supportOrg });
}
