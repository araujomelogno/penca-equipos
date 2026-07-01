import { describe, it, expect } from "vitest";
import { mapApiStatus, mapApiStage } from "./api-football";

describe("mapApiStatus", () => {
  it("maps NS to SCHEDULED", () => {
    expect(mapApiStatus("NS")).toBe("SCHEDULED");
  });

  it("maps TBD to SCHEDULED", () => {
    expect(mapApiStatus("TBD")).toBe("SCHEDULED");
  });

  it("maps 1H/2H/ET/BT/P to LIVE", () => {
    for (const s of ["1H", "2H", "ET", "BT", "P"]) {
      expect(mapApiStatus(s)).toBe("LIVE");
    }
  });

  it("maps HT to HALFTIME", () => {
    expect(mapApiStatus("HT")).toBe("HALFTIME");
  });

  it("maps FT/AET/PEN/AWD/WO to FINISHED", () => {
    for (const s of ["FT", "AET", "PEN", "AWD", "WO"]) {
      expect(mapApiStatus(s)).toBe("FINISHED");
    }
  });

  it("maps PST to POSTPONED", () => {
    expect(mapApiStatus("PST")).toBe("POSTPONED");
  });

  it("maps CANC/ABD to CANCELLED", () => {
    expect(mapApiStatus("CANC")).toBe("CANCELLED");
    expect(mapApiStatus("ABD")).toBe("CANCELLED");
  });

  it("defaults unknown status to SCHEDULED", () => {
    expect(mapApiStatus("UNKNOWN")).toBe("SCHEDULED");
    expect(mapApiStatus("")).toBe("SCHEDULED");
  });
});

describe("mapApiStage", () => {
  it("maps group stage rounds", () => {
    expect(mapApiStage("Group A")).toBe("GROUP");
    expect(mapApiStage("Group B - 2")).toBe("GROUP");
    expect(mapApiStage("group c")).toBe("GROUP");
  });

  it("maps Round of 32 (48-team WC first knockout round)", () => {
    expect(mapApiStage("Round of 32")).toBe("R32");
    expect(mapApiStage("round of 32")).toBe("R32");
  });

  it("maps Round of 16", () => {
    expect(mapApiStage("Round of 16")).toBe("R16");
    expect(mapApiStage("round of 16")).toBe("R16");
  });

  it("does not confuse Round of 32 with Round of 16", () => {
    expect(mapApiStage("Round of 32")).not.toBe("R16");
    expect(mapApiStage("Round of 16")).not.toBe("R32");
  });

  it("maps real API-Football group matchday strings", () => {
    expect(mapApiStage("Group Stage - 1")).toBe("GROUP");
    expect(mapApiStage("Group Stage - 3")).toBe("GROUP");
  });

  it("maps Quarter Finals", () => {
    expect(mapApiStage("Quarter-finals")).toBe("QF");
    expect(mapApiStage("quarter finals")).toBe("QF");
  });

  it("maps Semi Finals", () => {
    expect(mapApiStage("Semi-finals")).toBe("SF");
    expect(mapApiStage("semi finals")).toBe("SF");
  });

  it("maps Final (but not Semi-final)", () => {
    expect(mapApiStage("Final")).toBe("FINAL");
    expect(mapApiStage("final")).toBe("FINAL");
  });

  it("does not map semi-final as FINAL", () => {
    expect(mapApiStage("Semi-finals")).toBe("SF");
  });

  it("maps the third-place play-off to THIRD, never FINAL", () => {
    expect(mapApiStage("3rd Place Final")).toBe("THIRD");
    expect(mapApiStage("Third Place Play-off")).toBe("THIRD");
    expect(mapApiStage("3rd place final")).not.toBe("FINAL");
  });

  it("defaults unknown rounds to GROUP", () => {
    expect(mapApiStage("unknown")).toBe("GROUP");
  });
});
