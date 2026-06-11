import { describe, it, expect } from "vitest";
import { calculatePoints } from "./scoring";

describe("calculatePoints", () => {
  it("returns 5 for exact score match", () => {
    expect(calculatePoints(2, 1, 2, 1)).toBe(5);
  });

  it("returns 5 for exact 0-0 draw", () => {
    expect(calculatePoints(0, 0, 0, 0)).toBe(5);
  });

  it("returns 3 for correct winner (home) but wrong score", () => {
    expect(calculatePoints(3, 0, 2, 1)).toBe(3);
  });

  it("returns 3 for correct winner (away) but wrong score", () => {
    expect(calculatePoints(0, 2, 1, 3)).toBe(3);
  });

  it("returns 3 for correct draw but wrong scores", () => {
    expect(calculatePoints(1, 1, 2, 2)).toBe(3);
  });

  it("returns 0 for wrong winner", () => {
    expect(calculatePoints(2, 0, 0, 1)).toBe(0);
  });

  it("returns 0 when predicted draw but actual had a winner", () => {
    expect(calculatePoints(1, 1, 2, 0)).toBe(0);
  });

  it("returns 0 when predicted winner but actual was draw", () => {
    expect(calculatePoints(2, 0, 1, 1)).toBe(0);
  });

  it("handles high scores correctly", () => {
    expect(calculatePoints(7, 1, 7, 1)).toBe(5);
    expect(calculatePoints(5, 0, 7, 1)).toBe(3);
  });
});

describe("calculatePoints — knockout (goals only, penalties ignored)", () => {
  it("a 1-1 prediction is exact when the cruce ends 1-1 (decided on penalties)", () => {
    // Knockout match stored as its goal score (1-1); penalty shootout is not a goal.
    expect(calculatePoints(1, 1, 1, 1)).toBe(5);
  });

  it("predicting a winner scores 0 when the cruce is a goals draw", () => {
    expect(calculatePoints(2, 1, 1, 1)).toBe(0);
  });
});
