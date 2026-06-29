import { describe, it, expect } from "vitest";
import { pickAnalysis } from "./match-analysis";

const FALLBACK = "default text";

describe("pickAnalysis", () => {
  it("returns the Spanish text for an es locale", () => {
    expect(
      pickAnalysis("es", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hola");
  });

  it("returns the English text for an en locale", () => {
    expect(
      pickAnalysis("en", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hi");
  });

  it("handles region-suffixed locales like es-UY / en-US", () => {
    expect(pickAnalysis("es-UY", { es: "hola", en: "hi" }, null, FALLBACK)).toBe("hola");
    expect(pickAnalysis("en-US", { es: "hola", en: "hi" }, null, FALLBACK)).toBe("hi");
  });

  it("falls back to legacy when the locale text is null", () => {
    expect(
      pickAnalysis("es", { es: null, en: "hi" }, "legacy", FALLBACK),
    ).toBe("legacy");
  });

  it("falls back to legacy when the locale text is empty/whitespace", () => {
    expect(
      pickAnalysis("es", { es: "   ", en: "hi" }, "legacy", FALLBACK),
    ).toBe("legacy");
  });

  it("falls back to the default when both locale text and legacy are missing", () => {
    expect(
      pickAnalysis("en", { es: null, en: null }, null, FALLBACK),
    ).toBe(FALLBACK);
  });

  it("treats an unknown locale as English", () => {
    expect(
      pickAnalysis("fr", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hi");
  });
});
