import { describe, it, expect } from "vitest";
import { fromAcceptLanguage, translator } from "./config";
import nl from "./nl";
import fr from "./fr";

describe("i18n", () => {
  it("picks the first supported language from the browser and falls back to Dutch", () => {
    expect(fromAcceptLanguage("fr-BE,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(fromAcceptLanguage("de-DE,de;q=0.9")).toBe("nl");
    expect(fromAcceptLanguage(null)).toBe("nl");
  });
  it("translates with placeholders and falls back to English for unknown text", () => {
    const t = translator(nl);
    expect(t("{n} offers", { n: 3 })).toBe("3 kandidaten");
    expect(t("Welcome, {name}.", { name: "Sam" })).toBe("Welkom, Sam.");
    expect(t("Something new")).toBe("Something new");
  });
  it("keeps every placeholder in every translation", () => {
    for (const d of [nl, fr]) for (const [k, v] of Object.entries(d)) {
      const want = (k.match(/\{\w+\}/g) ?? []).sort().join();
      expect((v.match(/\{\w+\}/g) ?? []).sort().join(), k).toBe(want);
    }
  });
});
