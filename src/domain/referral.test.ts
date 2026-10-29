import { describe, expect, it } from "vitest";
import { creatorReward, giftFee, makeCode, tipSplit, validCode, windowEnd, normalizeCode, cleanConfig, weekStart, nextPayout, allowedCustom } from "./referral";
import { quote } from "./rules";

describe("referral", () => {
  it("keeps staff settings inside safe bounds", () => {
    expect(cleanConfig({ creatorPct: 5 }).creatorPct).toBe(5);
    expect(cleanConfig({ creatorPct: 80, windowDays: 2 })).toMatchObject({ creatorPct: 30, windowDays: 7 });
    expect(cleanConfig(null)).toMatchObject({ creatorPct: 10, windowDays: 30, buyerGift: true });
  });
  it("bundles bonuses per week, paid on Monday", () => {
    expect(weekStart(new Date("2026-11-05T15:00:00Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(weekStart(new Date("2026-11-02T00:00:00Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(nextPayout(new Date("2026-11-08T23:00:00Z")).toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });
  it("accepts short personal codes and refuses reserved ones", () => {
    for (const c of ["SAM", "LUCA10", "MILO-VPWU"]) expect(validCode(c)).toBe(true);
    for (const c of ["A", "SA M", "-SAM", "TOOLONGCODE12345"]) expect(validCode(c)).toBe(false);
    expect(allowedCustom("BYREQUEST1")).toBe(false);
  });
  it("makes readable codes that validate", () => {
    const c = makeCode("milo.v", () => 0.5);
    expect(validCode(c)).toBe(true);
    expect(c.startsWith("MILOV-")).toBe(true);
    expect(validCode(normalizeCode(" milov-q8kt "))).toBe(true);
  });
  it("pays 10% of the creator net amount inside the 30 day window only", () => {
    const first = new Date("2026-11-01T10:00:00Z"), end = windowEnd(first, 30);
    expect(creatorReward(6400, 10, end, new Date("2026-11-20T10:00:00Z"))).toBe(640);
    expect(creatorReward(6400, 5, end, new Date("2026-11-20T10:00:00Z"))).toBe(320);
    expect(creatorReward(6400, 10, end, new Date("2026-12-02T10:00:00Z"))).toBe(0);
  });
  it("a gifted fee removes the fee and its VAT, never the creator budget", () => {
    const m = quote(9000, 2100), g = giftFee(m);
    expect(g.dealCents).toBe(9000);
    expect(g.feeCents).toBe(0);
    expect(g.total).toBe(9000 + Math.round(9000 * 0.21));
    expect(g.giftCents).toBe(m.feeCents);
  });
  it("caps a gifted fee at €20", () => {
    const g = giftFee(quote(50000, 2100), 2000);
    expect(g.giftCents).toBe(2000);
    expect(g.feeCents).toBe(3000);
  });
  it("splits a tip all in: VAT out, 80% to the creator, the rest to ByRequest", () => {
    const s = tipSplit(1000, 2100);
    expect(s.vatCents + s.creatorCents + s.platformCents).toBe(1000);
    expect(s.creatorCents).toBe(Math.round(Math.round(1000 / 1.21) * 0.8));
  });
});
