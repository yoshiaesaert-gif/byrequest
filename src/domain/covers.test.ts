import { describe, it, expect } from "vitest";
import { family, pickCover, FAMILIES } from "./covers";

describe("cover selection", () => {
  it("matches the request to a mood family", () => {
    expect(family("video", "Shower video, calm and natural")).toBe("shower");
    expect(family("video", "After the gym, 10 minutes")).toBe("workout");
    expect(family("voice", "Say my name")).toBe("night");
    expect(family("photos", "Fit check, 5 photos")).toBe("outfit");
  });
  it("takes the least used photo and never a recent one", () => {
    const pool = FAMILIES.shower;
    const usage = { c01: 3, c02: 0, c03: 0, c04: 2, c05: 1 };
    expect(pickCover(pool, usage, ["c02"], () => 0)).toBe("c03");
  });
  it("spreads covers when many people post the same thing", () => {
    const usage: Record<string, number> = {}; const recent: string[] = [];
    for (let i = 0; i < 10; i++) { const c = pickCover(FAMILIES.workout, usage, recent.slice(-3)); usage[c] = (usage[c] ?? 0) + 1; recent.push(c); }
    expect(Object.values(usage)).toEqual([2, 2, 2, 2, 2]);
  });
});

import { chooseFor } from "./covers";
describe("no repeats on the board", () => {
  it("borrows from related moods before repeating a photo", () => {
    const usage: Record<string, number> = {}; const recent: string[] = [];
    for (let i = 0; i < 12; i++) { const c = chooseFor("video", "Shower video", usage, recent.slice(-3)); usage[c] = (usage[c] ?? 0) + 1; recent.push(c); }
    expect(Math.max(...Object.values(usage))).toBe(1);
    expect(Object.keys(usage)).toHaveLength(12);
  });
});
