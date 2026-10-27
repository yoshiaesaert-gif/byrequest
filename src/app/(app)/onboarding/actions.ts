"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser, issueCode, verifyCode, markStepUp, stepUpFresh } from "@/server/auth";
import * as ob from "@/server/onboarding";
import { RuleError } from "@/domain/rules";
import { PAYOUT_COUNTRIES, STEP_UP_MINUTES } from "@/config/compliance";
import { appUrl } from "@/server/url";

type R = { ok: true; msg?: string; fields?: string[]; devCode?: string | null } | { ok: false; error: string };
async function run(fn: () => Promise<R | void>): Promise<R> {
  try { return (await fn()) ?? { ok: true }; }
  catch (e) { unstable_rethrow(e); if (e instanceof RuleError) return { ok: false, error: e.message }; console.error("onboarding action failed", e instanceof Error ? e.name : "error"); return { ok: false, error: "Something went wrong. Your progress is saved; try again." }; }
}

export async function acceptAccountDocs(): Promise<R> {
  return run(async () => {
    const u = await requireUser(); await ob.ensure(u.id);
    const missing: ("terms" | "privacy")[] = [];
    for (const k of ["terms", "privacy"] as const) if (!(await ob.hasCurrent(u.id, k))) missing.push(k);
    if (missing.length) await ob.acceptDocs(u.id, missing);
    await db.update(schema.onboarding).set({ lastStep: "identity", updatedAt: new Date() }).where(eq(schema.onboarding.userId, u.id));
    revalidatePath("/onboarding");
  });
}

export async function startIdentity(): Promise<R> {
  return run(async () => {
    const u = await requireUser(); await ob.ensure(u.id);
    const url = await ob.startIdentity(u.id, `${appUrl()}/onboarding?step=identity`);
    redirect(url);
  });
}

export async function sendStepUp(): Promise<R> {
  return run(async () => { const u = await requireUser(); const { code } = await issueCode(u.email); return { ok: true, devCode: code, msg: "We sent a code to your email." }; });
}
export async function confirmStepUp(code: string): Promise<R> {
  return run(async () => {
    const u = await requireUser();
    if (!(await verifyCode(u.email, code))) return { ok: false, error: "That code is not right or has expired." };
    await markStepUp(); revalidatePath("/onboarding");
  });
}

export async function payoutFields(country: string, accountType: "individual" | "business"): Promise<R> {
  return run(async () => {
    await requireUser();
    if (!PAYOUT_COUNTRIES.some((c) => c.code === country)) return { ok: false, error: "Payouts are not offered in that country yet." };
    const r = await ob.payoutRequirements(country, accountType);
    return { ok: true, fields: r.fields };
  });
}

const Payout = z.object({ mode: z.enum(["link", "create"]), country: z.string().length(2), accountType: z.enum(["individual", "business"]), fields: z.record(z.string(), z.string().max(120)) });

export async function submitPayout(input: z.input<typeof Payout>): Promise<R> {
  return run(async () => {
    const u = await requireUser();
    if (!(await stepUpFresh(STEP_UP_MINUTES))) return { ok: false, error: "Confirm it is you with the email code first." };
    const p = Payout.safeParse(input);
    if (!p.success) return { ok: false, error: "Check the details." };
    if (!PAYOUT_COUNTRIES.some((c) => c.code === p.data.country)) return { ok: false, error: "Payouts are not offered in that country yet." };
    const r = await ob.startPayout(u.id, { ...p.data, returnUrl: `${appUrl()}/onboarding?step=payouts` });
    revalidatePath("/onboarding");
    if (p.data.mode === "link" && r.actionUrl) redirect(r.actionUrl);
    return { ok: true, msg: r.status === "action_required" ? "Saved. The provider needs a few more details." : "Sent to the payment provider for review." };
  });
}

export async function acceptAgreement(documentId: string, sha256: string): Promise<R> {
  return run(async () => { const u = await requireUser(); await ob.acceptAgreement(u.id, documentId, sha256); revalidatePath("/onboarding"); });
}

export async function appeal(area: "identity" | "payout" | "restriction", message: string): Promise<R> {
  return run(async () => {
    const u = await requireUser();
    if (message.trim().length < 10) return { ok: false, error: "Tell us briefly what happened." };
    await db.insert(schema.appeals).values({ userId: u.id, area, message: message.trim().slice(0, 1000) });
    await ob.log(db, `user:${u.id}`, "appeal.filed", u.id, { area });
    return { ok: true, msg: "Sent. Support replies in your inbox." };
  });
}
