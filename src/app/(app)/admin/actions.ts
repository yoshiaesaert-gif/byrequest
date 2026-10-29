"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/admin";
import * as A from "@/server/admin";
import * as B from "@/server/backoffice";
import * as Rp from "@/server/reports";
import * as H from "@/server/house";
import * as M from "@/server/moderation";
import * as Ref from "@/server/referrals";
import type { RefConfig } from "@/domain/referral";
import { reviewDelivery, resolveDispute } from "@/server/deals";
import { reviewAlbum } from "@/server/albums";
import { hideDelivery } from "@/server/participants";
import { RuleError } from "@/domain/rules";

type R = { ok: true; data?: unknown } | { ok: false; error: string };
async function run(fn: (staffId: string) => Promise<unknown>, min: "support" | "admin" = "support"): Promise<R> {
  const { user } = await requireStaff(min);
  try { const data = await fn(user.id); revalidatePath("/admin", "layout"); return { ok: true, data }; }
  catch (e) { if (e instanceof RuleError) return { ok: false, error: e.message }; console.error("admin action failed", e instanceof Error ? e.name : "error"); return { ok: false, error: "Failed." }; }
}

export const reviewD = async (id: string, outcome: "approved" | "rejected", note: string) => run((s) => reviewDelivery(id, outcome, `staff:${s}`, note));
export const reviewA = async (id: string, outcome: "approved" | "rejected") => run((s) => reviewAlbum(id, outcome, `staff:${s}`));
export const decide = async (id: string, outcome: "upheld" | "rejected") => run((s) => resolveDispute(id, outcome, `staff:${s}`));
export const requestInfo = async (userId: string, area: "identity" | "payout" | "agreement", message: string) => run((s) => A.requestInfo(s, userId, area, message));
export const restrict = async (userId: string, level: "none" | "restricted" | "suspended", reason: string) => run((s) => A.setRestriction(s, userId, level, reason), "admin");
export const answer = async (appealId: string, text: string) => run((s) => A.answerAppeal(s, appealId, text));
export const reveal = async (userId: string, purpose: string) => run((s) => A.revealIdentity(s, userId, purpose), "admin");
export const removal = async (id: string, status: "content_hidden" | "resolved" | "rejected", deliveryId?: string) => run(async (s) => { if (deliveryId) await hideDelivery(deliveryId, `staff:${s}`); return A.setRemoval(s, id, status); });
export const block = async (userId: string, ban: boolean, reason: string) => run((s) => B.setBan(s, userId, ban, reason), "admin");
export const dropRequest = async (id: string, reason: string) => run((s) => B.removeRequest(s, id, reason));
export const staffRole = async (who: string, role: "none" | "support" | "admin") => run((s) => B.setStaffRole(s, who, role), "admin");
export const handleR = async (id: string, status: "reviewing" | "actioned" | "passed_to_police" | "rejected", note: string) => run((s) => Rp.handleReport(s, id, status, note));
export const supportOrg = async (userId: string, org: string | null) => run((s) => Rp.setSupportOrg(s, userId, org), "admin");
export const houseAccept = async (offerId: string) => run((s) => H.houseAccept(s, offerId));
export const houseRate = async (dealId: string, stars: number) => run((s) => H.houseRate(s, dealId, stars));
export const houseBudget = async (euros: number) => run((s) => H.setHouseBudget(s, euros), "admin");
export const reqApprove = async (id: string, note = "") => run((s) => M.approve(s, id, note));
export const reqReject = async (id: string, reason: string) => run((s) => M.reject(s, id, reason));
export const reqRescreen = async (id: string) => run(() => M.screenRequest(id));
export const reqEdit = async (id: string, input: M.EditInput) => run((s) => M.edit(s, id, input), "admin");
export const reqBulk = async (ids: string[], action: "approve" | "close") => run((s) => M.bulk(s, ids, action), "admin");
export const reqAuto = async (on: boolean) => run((s) => M.setAutoApprove(s, on), "admin");
export const testInbox = async () => run(async (s) => { const { fillTestInbox } = await import("@/server/testdata"); const r = await fillTestInbox(s); if (!r.ok) throw new RuleError(r.error); return r.made; });

export const referralConfig = async (v: Partial<RefConfig>) => run((s) => Ref.setConfig(s, v), "admin");
