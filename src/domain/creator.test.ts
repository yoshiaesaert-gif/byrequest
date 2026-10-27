import { describe, it, expect } from "vitest";
import { creatorStatus, capabilities, identityOutcome, shouldApply, missing, type Areas } from "./creator";

const ok: Areas = { email: "approved", identity: "approved", payout: "approved", agreement: "approved", restriction: "none" };
const payout = { status: "approved" as const, canReceivePayouts: true, canProcessSales: true };

describe("creator status", () => {
  it("is active only when every area is approved", () => {
    expect(creatorStatus(ok)).toBe("active");
    expect(creatorStatus({ ...ok, payout: "pending" })).toBe("pending_verification");
    expect(creatorStatus({ ...ok, identity: "rejected" })).toBe("action_required");
    expect(creatorStatus({ ...ok, identity: "not_started", payout: "not_started", agreement: "not_started" })).toBe("draft");
  });
  it("restrictions win over approvals", () => {
    expect(creatorStatus({ ...ok, restriction: "restricted" })).toBe("restricted");
    expect(creatorStatus({ ...ok, restriction: "suspended" })).toBe("suspended");
  });
});

describe("capabilities", () => {
  it("allows a draft creator to prepare a profile but not to upload or offer", () => {
    const c = capabilities({ ...ok, identity: "pending", payout: "not_started", agreement: "not_started" }, null);
    expect(c).toEqual({ prepareProfile: true, offer: false, upload: false, receivePayouts: false });
  });
  it("blocks offers and payouts when the provider restricts the account", () => {
    expect(capabilities(ok, { ...payout, canReceivePayouts: false }).receivePayouts).toBe(false);
    expect(capabilities(ok, { ...payout, canProcessSales: false }).offer).toBe(false);
    expect(capabilities(ok, { ...payout, status: "action_required" })).toEqual({ prepareProfile: true, offer: false, upload: false, receivePayouts: false });
  });
  it("gives a suspended account nothing", () => {
    expect(capabilities({ ...ok, restriction: "suspended" }, payout)).toEqual({ prepareProfile: false, offer: false, upload: false, receivePayouts: false });
  });
  it("lists what is missing", () => {
    expect(missing({ ...ok, payout: "action_required" }, null)).toEqual(["Payout setup needs your action"]);
  });
});

describe("identity outcome", () => {
  it("never approves someone under 18, and suspends the account", () => {
    expect(identityOutcome({ decision: "approved", over18: false })).toEqual({ status: "rejected", suspend: true });
  });
  it("does not approve when age was not confirmed", () => {
    expect(identityOutcome({ decision: "approved", over18: null }).status).toBe("rejected");
  });
  it("maps provider decisions", () => {
    expect(identityOutcome({ decision: "approved", over18: true }).status).toBe("approved");
    expect(identityOutcome({ decision: "resubmit" }).status).toBe("action_required");
    expect(identityOutcome({ decision: "declined" }).status).toBe("rejected");
  });
});

describe("event ordering", () => {
  it("ignores delayed events older than the last applied one", () => {
    const last = new Date("2026-11-01T10:00:00Z");
    expect(shouldApply(last, new Date("2026-11-01T09:59:00Z"))).toBe(false);
    expect(shouldApply(last, new Date("2026-11-01T10:01:00Z"))).toBe(true);
    expect(shouldApply(null, last)).toBe(true);
  });
});
