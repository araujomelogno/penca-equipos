import { describe, it, expect } from "vitest";
import {
  hostCountryForVenue,
  pickAdvantagedSide,
  matchProbabilities,
  getTier,
} from "./match-probabilities";

describe("hostCountryForVenue", () => {
  it("maps US stadiums/cities to USA", () => {
    expect(hostCountryForVenue("MetLife Stadium, East Rutherford")).toBe("USA");
    expect(hostCountryForVenue("SoFi Stadium, Inglewood")).toBe("USA");
    expect(hostCountryForVenue("SoFi Stadium, null")).toBe("USA");
  });

  it("maps Mexican and Canadian venues", () => {
    expect(hostCountryForVenue("Estadio Akron, Guadalajara")).toBe("MEX");
    expect(hostCountryForVenue("Estadio BBVA, Monterrey")).toBe("MEX");
    expect(hostCountryForVenue("BMO Field, Toronto")).toBe("CAN");
    expect(hostCountryForVenue("BC Place, Vancouver")).toBe("CAN");
  });

  it("returns null for unknown/missing venues", () => {
    expect(hostCountryForVenue(null)).toBeNull();
    expect(hostCountryForVenue(undefined)).toBeNull();
    expect(hostCountryForVenue("Some Stadium, Doha")).toBeNull();
  });
});

describe("pickAdvantagedSide", () => {
  it("boosts a co-host playing in its own country (home or away slot)", () => {
    expect(pickAdvantagedSide("USA", "BIH", "Lumen Field, Seattle")).toBe("home");
    expect(pickAdvantagedSide("MEX", "ECU", "Estadio Akron, Guadalajara")).toBe("home");
    // Co-host listed as the away side but playing at home → "away" advantaged.
    expect(pickAdvantagedSide("RSA", "CAN", "BC Place, Vancouver")).toBe("away");
  });

  it("gives NO advantage to a co-host playing in another country", () => {
    // South Africa vs Canada at SoFi (USA): Canada is away but NOT in Canada.
    expect(pickAdvantagedSide("RSA", "CAN", "SoFi Stadium, null")).toBeNull();
  });

  it("gives no advantage to non-co-hosts even at a host venue", () => {
    expect(pickAdvantagedSide("BRA", "JPN", "MetLife Stadium, East Rutherford")).toBeNull();
  });

  it("is neutral when the venue is unknown", () => {
    expect(pickAdvantagedSide("USA", "BIH", null)).toBeNull();
  });
});

describe("matchProbabilities", () => {
  it("is symmetric for equally-rated teams on a neutral venue", () => {
    const p = matchProbabilities("POR", "ARG", null); // both +1000
    expect(p.homeWin).toBe(p.awayWin);
    expect(p.homeWin + p.draw + p.awayWin).toBe(100);
  });

  it("always sums to 100", () => {
    for (const [h, a] of [["USA", "BIH"], ["BRA", "JPN"], ["MEX", "ECU"], ["RSA", "CAN"]]) {
      const p = matchProbabilities(h, a, null);
      expect(p.homeWin + p.draw + p.awayWin).toBe(100);
    }
  });

  it("home-nation advantage lifts the advantaged side's win probability", () => {
    const neutral = matchProbabilities("USA", "BIH", null);
    const boosted = matchProbabilities("USA", "BIH", "home");
    expect(boosted.homeWin).toBeGreaterThan(neutral.homeWin);
  });

  it("boosting the away side lifts the away win probability", () => {
    // Evenly-rated pair (SUI & MEX both +6500) so the boost is visible.
    const neutral = matchProbabilities("SUI", "MEX", null);
    const boosted = matchProbabilities("SUI", "MEX", "away");
    expect(boosted.awayWin).toBeGreaterThan(neutral.awayWin);
  });
});

describe("getTier", () => {
  it("classifies favoritism by win-probability spread", () => {
    expect(getTier(70, 15)).toBe("heavy_favorite");
    expect(getTier(55, 25)).toBe("clear_favorite");
    expect(getTier(45, 33)).toBe("slight_favorite");
    expect(getTier(40, 38)).toBe("balanced");
  });
});
