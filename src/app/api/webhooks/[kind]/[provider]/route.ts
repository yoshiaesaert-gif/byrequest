import { adapterById, SignatureError, type IdentityAdapter, type PayoutAdapter } from "@/server/providers";
import { applyIdentityEvent, applyPayoutEvent } from "@/server/onboarding";
import { reevaluate } from "@/server/participants";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";

/* Provider webhooks. The signature is checked on the raw body before anything is parsed or applied.
   The outcome of the external flow is decided here, never by the page the user returns to.
   Responses and logs carry no personal data. */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/[kind]/[provider]">) {
  const { kind, provider } = await ctx.params;
  if (kind !== "identity" && kind !== "payout") return new Response("Not found", { status: 404 });
  const ad = adapterById(kind, provider);
  if (!ad) return new Response("Unknown provider", { status: 404 });
  const raw = await req.text();
  try {
    if (kind === "identity") {
      const e = (ad as IdentityAdapter).verifyWebhook(raw, req.headers);
      const result = await applyIdentityEvent(provider, e);
      if (result === "applied") {
        const chk = await db.query.identityChecks.findFirst({ where: and(eq(schema.identityChecks.provider, provider), eq(schema.identityChecks.externalRef, e.externalRef)) });
        if (chk?.participantId) await reevaluate(chk.participantId);
      }
      return Response.json({ result });
    }
    const e = (ad as PayoutAdapter).verifyWebhook(raw, req.headers);
    return Response.json({ result: await applyPayoutEvent(provider, e) });
  } catch (err) {
    if (err instanceof SignatureError) return new Response("Invalid signature", { status: 401 });
    console.error("webhook failed", kind, provider, err instanceof Error ? err.name : "error");
    return new Response("Error", { status: 500 });   // the provider retries; duplicates are safe
  }
}
