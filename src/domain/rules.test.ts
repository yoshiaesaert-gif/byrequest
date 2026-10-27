import { describe, it, expect } from "vitest";
import { split, quote, transition, checkDelivery, vaultAtLeast, RuleError, addHours, type DealState } from "./rules";

const t0 = new Date("2026-11-01T12:00:00Z");
const held: DealState = { status: "held", dueAt: addHours(t0, 48) };

describe("money split", () => {
  it("takes 30% of deal value: 20% from the creator side and a 10% buyer fee", () => {
    expect(split(7500)).toEqual({ dealCents: 7500, feeCents: 750, buyerPays: 8250, creatorCents: 6000, platformCents: 2250 });
  });
  it("rejects zero or fractional cents", () => {
    expect(() => split(0)).toThrow();
    expect(() => split(10.5)).toThrow();
  });
});

describe("escrow", () => {
  it("a delivery first waits for review; the 24 hour window starts when it is available", () => {
    const r = transition(held, { type: "deliver", at: t0 }).state;
    expect(r.status).toBe("reviewing");
    expect(() => transition(r, { type: "object", at: t0 })).toThrow();
    const { state } = transition(r, { type: "review_passed", at: addHours(t0, 2) });
    expect(state.status).toBe("delivered");
    expect(state.objectUntil).toEqual(addHours(t0, 26));
  });
  it("a failed review sends the deal back to the creator", () => {
    const r = transition(held, { type: "deliver", at: t0 }).state;
    expect(transition(r, { type: "review_failed", at: t0 }).state.status).toBe("held");
  });
  it("releases automatically when the window passes", () => {
    const d = transition(transition(held, { type: "deliver", at: t0 }).state, { type: "review_passed", at: t0 }).state;
    expect(() => transition(d, { type: "window_passed", at: addHours(t0, 23) })).toThrow(RuleError);
    const r = transition(d, { type: "window_passed", at: addHours(t0, 24) });
    expect(r.state.status).toBe("released");
    expect(r.effects).toEqual([{ kind: "pay_creator" }]);
  });
  it("refuses an objection after the window", () => {
    const d = transition(transition(held, { type: "deliver", at: t0 }).state, { type: "review_passed", at: t0 }).state;
    expect(() => transition(d, { type: "object", at: addHours(t0, 25) })).toThrow(/window is over/);
  });
  it("upheld dispute refunds the buyer and bans the creator", () => {
    const d = transition(transition(transition(held, { type: "deliver", at: t0 }).state, { type: "review_passed", at: t0 }).state, { type: "object", at: addHours(t0, 2) }).state;
    const r = transition(d, { type: "resolve", outcome: "upheld", at: addHours(t0, 10) });
    expect(r.state.status).toBe("refunded");
    expect(r.effects.map((e) => e.kind)).toEqual(["refund_buyer", "flag_creator"]);
  });
  it("rejected dispute pays the creator and bans the buyer", () => {
    const d = transition(transition(transition(held, { type: "deliver", at: t0 }).state, { type: "review_passed", at: t0 }).state, { type: "object", at: addHours(t0, 2) }).state;
    const r = transition(d, { type: "resolve", outcome: "rejected", at: addHours(t0, 10) });
    expect(r.state.status).toBe("released");
    expect(r.effects.map((e) => e.kind)).toEqual(["pay_creator", "flag_buyer"]);
  });
  it("no delivery before the deadline refunds the buyer", () => {
    expect(() => transition(held, { type: "deadline_passed", at: addHours(t0, 47) })).toThrow();
    expect(transition(held, { type: "deadline_passed", at: addHours(t0, 49) }).effects).toEqual([{ kind: "refund_buyer" }]);
    expect(() => transition(held, { type: "deliver", at: addHours(t0, 49) })).toThrow(/deadline/);
  });
});

describe("technical delivery check", () => {
  it("blocks a 9:50 video when 10 minutes were agreed", () => {
    const r = checkDelivery("video", 10, [{ mime: "video/mp4", durationSec: 590, width: 1920, height: 1080 }]);
    expect(r.ok).toBe(false);
    expect(r.lines.find((l) => !l.ok)?.text).toBe("Length 9:50, agreed at least 10:00");
  });
  it("passes a 10:04 video in 1080p", () => {
    expect(checkDelivery("video", 10, [{ mime: "video/mp4", durationSec: 604, width: 1920, height: 1080 }]).ok).toBe(true);
  });
  it("needs the exact photo count in full resolution", () => {
    const big = { mime: "image/jpeg", width: 3000, height: 4000 };
    expect(checkDelivery("photos", 6, Array(6).fill(big)).ok).toBe(true);
    expect(checkDelivery("photos", 6, Array(5).fill(big)).ok).toBe(false);
    expect(checkDelivery("photos", 2, [big, { mime: "image/jpeg", width: 800, height: 600 }]).ok).toBe(false);
  });
  it("rejects a silent voice note", () => {
    expect(checkDelivery("voice", 2, [{ mime: "audio/mpeg", durationSec: 130, meanVolumeDb: -91 }]).ok).toBe(false);
    expect(checkDelivery("voice", 2, [{ mime: "audio/mpeg", durationSec: 130, meanVolumeDb: -22 }]).ok).toBe(true);
  });
});

describe("vault period", () => {
  it("compares periods", () => {
    expect(vaultAtLeast("1y", "30d")).toBe(true);
    expect(vaultAtLeast("7d", "30d")).toBe(false);
  });
});

describe("quote", () => {
  it("adds VAT on deal value plus fee and leaves the creator share alone", () => {
    const q = quote(7500, 2100);
    expect(q.vatCents).toBe(1733);
    expect(q.total).toBe(8250 + 1733);
    expect(q.creatorCents).toBe(6000);
  });
  it("rejects a rate that is not in basis points", () => {
    expect(() => quote(7500, 21.5)).toThrow();
    expect(() => quote(7500, 5000)).toThrow();
  });
});
