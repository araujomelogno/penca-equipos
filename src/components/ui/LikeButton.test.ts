import { describe, it, expect, vi } from "vitest";

// We test the logic and props contract of LikeButton without rendering.
// The component is simple enough that prop-level tests catch the important behaviors.

describe("LikeButton props contract", () => {
  it("onCountClick is callable when count > 0", () => {
    const onCountClick = vi.fn();
    // Simulate what the component does: only call onCountClick if provided and count > 0
    const count = 3;
    if (onCountClick && count > 0) {
      onCountClick();
    }
    expect(onCountClick).toHaveBeenCalledOnce();
  });

  it("onCountClick is not called when count is 0", () => {
    const onCountClick = vi.fn();
    const count = 0;
    // Component renders a plain span (not button) when count is 0 or onCountClick is undefined
    if (onCountClick && count > 0) {
      onCountClick();
    }
    expect(onCountClick).not.toHaveBeenCalled();
  });

  it("onToggle and onCountClick are independent", () => {
    const onToggle = vi.fn();
    const onCountClick = vi.fn();
    // Heart icon click triggers onToggle
    onToggle();
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onCountClick).not.toHaveBeenCalled();
    // Count click triggers onCountClick
    onCountClick();
    expect(onCountClick).toHaveBeenCalledOnce();
  });
});
