import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Bug: ScoreInput had onClick/onMouseDown handlers that called
 * stopPropagation + preventDefault. This caused two problems:
 * 1. preventDefault on mouseDown blocked the input from receiving focus
 * 2. stopPropagation prevented the click from reaching the parent Link,
 *    so the Link's "if (editing) e.preventDefault()" never ran,
 *    causing navigation away from the page on input click
 *
 * Fix: Remove all mouse event interception from ScoreInput. The Link's
 * onClick handler already prevents navigation when editing=true.
 */
describe("ScoreInput event handling", () => {
  const src = readFileSync(join(__dirname, "MatchCard.tsx"), "utf-8");

  // Extract only the ScoreInput function body
  const scoreInputStart = src.indexOf("function ScoreInput(");
  const nextFn = src.indexOf("\nfunction ", scoreInputStart + 1);
  const scoreInputSrc = src.slice(scoreInputStart, nextFn);

  it("should NOT have onClick/onMouseDown handlers that block focus or propagation", () => {
    // ScoreInput must not intercept mouse events — the parent Link
    // handles navigation prevention when editing
    expect(scoreInputSrc).not.toContain("onClick={");
    expect(scoreInputSrc).not.toContain("onMouseDown={");
  });

  it("should NOT call preventDefault or stopPropagation", () => {
    expect(scoreInputSrc).not.toContain("preventDefault");
    expect(scoreInputSrc).not.toContain("stopPropagation");
  });
});
