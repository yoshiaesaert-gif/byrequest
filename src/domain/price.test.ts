import { describe, expect, it } from "vitest";
import { quoteFromTotal, suggestPrice } from "./rules";

describe("all in price", () => {
  it("splits a total so the parts add up exactly", () => {
    for (const [t, vat] of [[10000, 2100], [4500, 2100], [12345, 1900], [9999, 0]]) {
      const q = quoteFromTotal(t, vat);
      expect(q.dealCents + q.feeCents + q.vatCents).toBe(t);
      expect(q.creatorCents).toBe(Math.round(q.dealCents * 0.8));
    }
  });
  it("suggests more for longer vault access, a face and speed", () => {
    const base = { category: "video" as const, amount: 5, face: "not_needed" as const, minVault: "30d" as const, dueHours: 72 };
    const p = suggestPrice(base);
    expect(p % 5).toBe(0);
    expect(suggestPrice({ ...base, minVault: "forever" })).toBeGreaterThan(p);
    expect(suggestPrice({ ...base, face: "required" })).toBeGreaterThan(p);
    expect(suggestPrice({ ...base, dueHours: 24 })).toBeGreaterThan(p);
  });
});
