import { describe, expect, it } from "vitest";
import { screen } from "./screening";

const base = { category: "video", amount: 10, dealCents: 12000, ageMin: 25, ageMax: 40 };
const codes = (r: ReturnType<typeof screen>) => r.flags.map((f) => f.code);

describe("request screening", () => {
  it("suggests approval for an ordinary request", () => {
    const r = screen({ ...base, title: "lange douche, geen haast", details: "Warm licht, stoom, geen haast. Kind, quick and discreet." });
    expect(r.verdict).toBe("approve");
  });
  it("rejects keyboard mash", () => {
    expect(screen({ ...base, title: "TFKGJLKJSFLGJ" }).verdict).toBe("reject");
  });
  it("blocks anything that may involve a minor, in three languages", () => {
    for (const title of ["schoolgirl outfit", "voor een 16 jaar oude", "une ado timide", "barely legal look"]) expect(screen({ ...base, title }).verdict).toBe("reject");
  });
  it("does not mistake ordinary words for hard lines", () => {
    for (const title of ["I adore your voice", "Kind words before bed", "The song she sang"]) expect(screen({ ...base, title }).verdict).not.toBe("reject");
  });
  it("blocks missing consent and prohibited acts", () => {
    expect(codes(screen({ ...base, title: "filmpje van mijn ex" }))).toContain("consent");
    expect(codes(screen({ ...base, title: "verborgen camera in de douche" }))).toContain("consent");
    expect(codes(screen({ ...base, title: "step family incest roleplay" }))).toContain("illegal");
  });
  it("flags contact details, payment and meeting for a human check", () => {
    const r = screen({ ...base, title: "Douchevideo", details: "stuur via whatsapp 0470 12 34 56, betaal met tikkie, daarna afspreken?" });
    expect(r.verdict).toBe("check");
    expect(codes(r)).toEqual(expect.arrayContaining(["contact", "payment", "meet"]));
  });
  it("uses account context", () => {
    const r = screen({ ...base, title: "Douchevideo, rustig" }, { recentTitles: ["douchevideo, rustig"], buyerRejected: 3, buyerAgeVerified: false });
    expect(codes(r)).toEqual(expect.arrayContaining(["duplicate", "repeat_rejected", "age_unverified"]));
    expect(r.verdict).toBe("check");
  });
});
