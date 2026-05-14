import { describe, it, expect } from "vitest";
import { getPresetUrl, AVATAR_PRESETS } from "./avatarPresets";

describe("getPresetUrl", () => {
  it("returns URL for existing preset", () => {
    expect(getPresetUrl("octopus-gold")).toBe("/avatars/octopus-gold.svg");
  });

  it("returns null for non-existent preset", () => {
    expect(getPresetUrl("nonexistent")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getPresetUrl("")).toBeNull();
  });

  it("all presets have unique IDs", () => {
    const ids = AVATAR_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all presets have non-empty URLs", () => {
    for (const p of AVATAR_PRESETS) {
      expect(p.url.length).toBeGreaterThan(0);
    }
  });
});
