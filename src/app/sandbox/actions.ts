"use server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PROVIDER_ENV } from "@/config/compliance";
import { signTest } from "@/server/providers";
import { internalUrl } from "@/server/url";

/* Test provider only. Builds a signed event exactly like a provider would and posts it to our own
   webhook endpoint, so the real verification and idempotency path is exercised. */
async function post(kind: "identity" | "payout", event: Record<string, unknown>, twice: boolean) {
  if (PROVIDER_ENV !== "test") throw new Error("The test provider is disabled in this environment.");
  const raw = JSON.stringify(event);
  const url = `${internalUrl()}/api/webhooks/${kind}/sandbox`;
  for (let i = 0; i < (twice ? 2 : 1); i++) await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-sandbox-signature": signTest(raw) }, body: raw });
}

export async function identityOutcome(ref: string, outcome: "adult" | "minor" | "resubmit" | "declined" | "expired", legalName: string, twice: boolean) {
  const chk = await db.query.identityChecks.findFirst({ where: eq(schema.identityChecks.externalRef, ref) });
  if (!chk) throw new Error("Unknown reference");
  const dob = outcome === "minor" ? `${new Date().getFullYear() - 16}-05-12` : "1998-05-12";
  await post("identity", {
    eventId: "evt_" + randomUUID(), occurredAt: new Date().toISOString(), externalRef: ref,
    decision: outcome === "adult" || outcome === "minor" ? "approved" : outcome,
    over18: outcome === "adult" ? true : outcome === "minor" ? false : null,
    documentChecked: outcome !== "declined", livenessChecked: outcome !== "declined",
    person: outcome === "adult" || outcome === "minor" ? { legalName: legalName || "Alex Example", dateOfBirth: dob, country: "BE" } : undefined,
    reason: outcome === "declined" ? "Document could not be verified" : undefined,
  }, twice);
  redirect(chk.participantId ? "/sandbox/done" : "/onboarding?step=identity");
}

export async function payoutOutcome(ref: string, outcome: "approved" | "no_payouts" | "needs_tax" | "rejected", twice: boolean) {
  const acc = await db.query.payoutAccounts.findFirst({ where: eq(schema.payoutAccounts.externalRef, ref) });
  if (!acc) throw new Error("Unknown reference");
  await post("payout", {
    eventId: "evt_" + randomUUID(), occurredAt: new Date().toISOString(), externalRef: ref,
    status: outcome === "approved" || outcome === "no_payouts" ? "approved" : outcome === "needs_tax" ? "action_required" : "rejected",
    canReceivePayouts: outcome === "approved", canProcessSales: outcome === "approved" || outcome === "no_payouts",
    missing: outcome === "needs_tax" ? ["tax_id"] : [], reason: outcome === "rejected" ? "Account holder does not match the verified identity" : undefined,
  }, twice);
  redirect("/onboarding?step=payouts");
}
