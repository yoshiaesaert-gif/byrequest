"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/admin";
import * as A from "@/server/admin";
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
