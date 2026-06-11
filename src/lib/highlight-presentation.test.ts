import { describe, it, expect } from "vitest";
import {
  HIGHLIGHT_TYPES,
  highlightIcon,
  highlightColor,
} from "./highlight-presentation";

describe("highlight-presentation", () => {
  it("every highlight type has both an icon and a color", () => {
    for (const type of HIGHLIGHT_TYPES) {
      expect(highlightIcon(type), `icon for ${type}`).not.toBe("info");
      expect(highlightColor(type), `color for ${type}`).toMatch(
        /^var\(--color-[a-z-]+\)$/,
      );
    }
  });

  it("colors are design tokens, never hardcoded hex", () => {
    for (const type of HIGHLIGHT_TYPES) {
      expect(highlightColor(type)).not.toMatch(/#[0-9a-fA-F]/);
    }
  });

  it("unknown types fall back to info icon and secondary text color", () => {
    expect(highlightIcon("nonexistent")).toBe("info");
    expect(highlightColor("nonexistent")).toBe("var(--color-text-secondary)");
  });

  it("covers the known highlight types", () => {
    expect(HIGHLIGHT_TYPES).toEqual(
      expect.arrayContaining([
        "rank_change",
        "exact_score",
        "streak",
        "global_stat",
        "day_leader",
        "all_predicted",
        "bold_call",
        "lone_wolf",
      ]),
    );
  });
});
