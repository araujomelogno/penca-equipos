import { describe, it, expect } from "vitest";
import {
  isBoldCall,
  scorelineProbability,
  fitGoalExpectations,
  BOLD_CALL_THRESHOLD,
} from "./boldness";

// 1X2 probabilities (0-100) chosen to represent two archetypes:
const EVEN = { home: 37, draw: 26, away: 37 };
const DOMINANT = { home: 95, draw: 3, away: 2 };

describe("fitGoalExpectations", () => {
  it("recovers roughly symmetric expected goals for an even match", () => {
    const { home, away } = fitGoalExpectations(EVEN);
    expect(Math.abs(home - away)).toBeLessThan(0.4);
    expect(home).toBeGreaterThan(0.7);
    expect(home).toBeLessThan(2.2);
  });

  it("gives the favorite far higher expected goals when dominant", () => {
    const { home, away } = fitGoalExpectations(DOMINANT);
    expect(home).toBeGreaterThan(away + 1.5);
  });
});

describe("scorelineProbability", () => {
  it("is tiny for a blowout like 8-0", () => {
    expect(scorelineProbability(8, 0, EVEN)).toBeLessThan(0.001);
  });

  it("returns a real probability between 0 and 1", () => {
    const p = scorelineProbability(1, 1, EVEN);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe("isBoldCall (Poisson scoreline model)", () => {
  it("flags a blowout scoreline even if the winner is correct", () => {
    expect(isBoldCall(8, 0, EVEN)).toBe(true);
  });

  it("does NOT flag a 0-0 in an evenly matched game", () => {
    expect(isBoldCall(0, 0, EVEN)).toBe(false);
  });

  it("DOES flag a 0-0 when one team heavily dominates", () => {
    expect(isBoldCall(0, 0, DOMINANT)).toBe(true);
  });

  it("does NOT flag the likeliest scoreline for a strong favorite", () => {
    expect(isBoldCall(2, 0, DOMINANT)).toBe(false);
  });

  it("returns false when probabilities are missing", () => {
    expect(isBoldCall(3, 1, { home: null, draw: null, away: null })).toBe(false);
  });

  it("returns false when probabilities are all zero", () => {
    expect(isBoldCall(3, 1, { home: 0, draw: 0, away: 0 })).toBe(false);
  });

  it("exposes a tunable threshold", () => {
    expect(BOLD_CALL_THRESHOLD).toBeGreaterThan(0);
    expect(BOLD_CALL_THRESHOLD).toBeLessThan(1);
  });
});
