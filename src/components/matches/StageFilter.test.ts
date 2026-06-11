import { describe, it, expect } from "vitest";
import { shouldUseShortGroupLabels } from "./StageFilter";

const tab = (value: string) => ({ value, label: value });

describe("shouldUseShortGroupLabels", () => {
  it("keeps full group labels while only group-stage tabs exist", () => {
    const stages = [tab("ALL"), tab("GROUP_A"), tab("GROUP_B"), tab("GROUP_C")];
    expect(shouldUseShortGroupLabels(stages)).toBe(false);
  });

  it("switches to short group labels once any knockout stage tab appears", () => {
    const stages = [tab("ALL"), tab("GROUP_A"), tab("GROUP_B"), tab("R32")];
    expect(shouldUseShortGroupLabels(stages)).toBe(true);
  });

  it("detects later knockout rounds too", () => {
    const stages = [tab("ALL"), tab("GROUP_A"), tab("FINAL")];
    expect(shouldUseShortGroupLabels(stages)).toBe(true);
  });
});
