import { describe, expect, it } from "vitest";
import { parseAsk } from "./ask-parse";

const q = (s: string) => Object.fromEntries(new URL(parseAsk(s), "http://x").searchParams);

describe("parseAsk", () => {
  it("reads a theme in Dutch and fills the request", () => {
    const r = q("aftrekken met witte sokken");
    expect(r.c).toBe("video");
    expect(r.budget).toBeTruthy();
    expect(r.d?.length).toBeGreaterThan(40);
  });
  it("keeps numbers and euros from the sentence and clamps to the maximum", () => {
    expect(q("a 10 minute shower video for €80")).toMatchObject({ c: "video", amount: "10", budget: "80" });
    expect(q("douche video 15 min").amount).toBe("10");
  });
  it("recognises voice notes in three languages", () => {
    for (const s of ["voice note good night", "spraakbericht", "vocal de 3 min"]) expect(q(s).c).toBe("voice");
  });
  it("falls back to a video with the sentence as title", () => {
    expect(q("iets anders")).toMatchObject({ c: "video", title: "Iets anders" });
  });
});
