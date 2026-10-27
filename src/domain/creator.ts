/* Creator access rules. Pure functions, so every rule is unit tested and the server applies
   exactly the same logic everywhere. A status sent by the client is never an input here. */

export type Check = "not_started" | "pending" | "action_required" | "approved" | "rejected" | "expired";
export type Restriction = "none" | "restricted" | "suspended";
export type CreatorStatus = "draft" | "pending_verification" | "action_required" | "active" | "restricted" | "suspended";

export type Areas = { email: Check; identity: Check; payout: Check; agreement: Check; restriction: Restriction };
export type PayoutCaps = { status: Check; canReceivePayouts: boolean; canProcessSales: boolean } | null;

const NEEDS_ACTION: Check[] = ["action_required", "rejected", "expired"];

export function creatorStatus(a: Areas): CreatorStatus {
  if (a.restriction === "suspended") return "suspended";
  if (a.restriction === "restricted") return "restricted";
  const all = [a.email, a.identity, a.payout, a.agreement];
  if (all.every((c) => c === "approved")) return "active";
  if (all.some((c) => NEEDS_ACTION.includes(c))) return "action_required";
  if (all.some((c) => c === "pending")) return "pending_verification";
  return "draft";
}

export type Capabilities = { prepareProfile: boolean; offer: boolean; upload: boolean; receivePayouts: boolean };

/* First version: no uploads and no paid work until identity, agreement and payouts are approved,
   and no payouts without an active payout approval at the provider. */
export function capabilities(a: Areas, payout: PayoutCaps): Capabilities {
  const s = creatorStatus(a);
  const providerOk = !!payout && payout.status === "approved";
  const active = s === "active" && providerOk;
  return {
    prepareProfile: s !== "suspended",
    offer: active && payout!.canProcessSales,
    upload: active,
    receivePayouts: active && payout!.canReceivePayouts,
  };
}

/* What is still missing, in plain language, for the onboarding overview and the admin view. */
export function missing(a: Areas, payout: PayoutCaps): string[] {
  const out: string[] = [];
  const say: Record<Check, string> = { not_started: "not started", pending: "being reviewed", action_required: "needs your action", approved: "", rejected: "was not approved", expired: "has expired" };
  if (a.email !== "approved") out.push(`Email verification ${say[a.email]}`);
  if (a.identity !== "approved") out.push(`Identity verification ${say[a.identity]}`);
  if (a.payout !== "approved") out.push(`Payout setup ${say[a.payout]}`);
  else if (payout && !payout.canReceivePayouts) out.push("The payment provider has not enabled payouts yet");
  if (a.agreement !== "approved") out.push(`Creator agreement ${say[a.agreement]}`);
  if (a.restriction !== "none") out.push(a.restriction === "suspended" ? "Account suspended" : "Account restricted");
  return out;
}

/* Provider events can arrive twice or late. Apply an event only when it is newer than the last one applied. */
export function shouldApply(lastEventAt: Date | null | undefined, occurredAt: Date) {
  return !lastEventAt || occurredAt.getTime() > lastEventAt.getTime();
}

/* Maps an identity result to our status. A result below 18 can never become approved. */
export function identityOutcome(r: { decision: "approved" | "declined" | "resubmit" | "expired"; over18?: boolean | null }): { status: Check; suspend: boolean } {
  if (r.decision === "approved") return r.over18 === true ? { status: "approved", suspend: false } : { status: "rejected", suspend: r.over18 === false };
  if (r.decision === "resubmit") return { status: "action_required", suspend: false };
  if (r.decision === "expired") return { status: "expired", suspend: false };
  return { status: "rejected", suspend: false };
}
