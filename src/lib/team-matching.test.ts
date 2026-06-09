import { describe, it, expect } from "vitest";
import { resolveTeamCode } from "./team-matching";

// Minimal slice of the seeded teams (name as stored in DB + code).
const DB_TEAMS = [
  { name: "Argentina", code: "ARG" },
  { name: "Brazil", code: "BRA" },
  { name: "United States", code: "USA" },
  { name: "Czechia", code: "CZE" },
  { name: "Turkey", code: "TUR" },
  { name: "Bosnia and Herzegovina", code: "BIH" },
  { name: "Cape Verde", code: "CPV" },
  { name: "DR Congo", code: "COD" },
  { name: "Curaçao", code: "CUW" },
  { name: "South Korea", code: "KOR" },
];

describe("resolveTeamCode", () => {
  it("resolves an exact name match to its code", () => {
    expect(resolveTeamCode("Argentina", DB_TEAMS)).toBe("ARG");
    expect(resolveTeamCode("Brazil", DB_TEAMS)).toBe("BRA");
  });

  it("is case and whitespace insensitive", () => {
    expect(resolveTeamCode("  argentina  ", DB_TEAMS)).toBe("ARG");
    expect(resolveTeamCode("SOUTH KOREA", DB_TEAMS)).toBe("KOR");
  });

  it("resolves '&' vs 'and' without an explicit alias", () => {
    expect(resolveTeamCode("Bosnia & Herzegovina", DB_TEAMS)).toBe("BIH");
  });

  it("resolves diacritics without an explicit alias", () => {
    expect(resolveTeamCode("Curaçao", DB_TEAMS)).toBe("CUW");
  });

  it("resolves the known API-Football aliases", () => {
    expect(resolveTeamCode("USA", DB_TEAMS)).toBe("USA");
    expect(resolveTeamCode("Czech Republic", DB_TEAMS)).toBe("CZE");
    expect(resolveTeamCode("Türkiye", DB_TEAMS)).toBe("TUR");
    expect(resolveTeamCode("Cape Verde Islands", DB_TEAMS)).toBe("CPV");
    expect(resolveTeamCode("Congo DR", DB_TEAMS)).toBe("COD");
  });

  it("returns null for an unknown team", () => {
    expect(resolveTeamCode("Atlantis", DB_TEAMS)).toBeNull();
  });
});
