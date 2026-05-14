import { describe, it, expect } from "vitest";
import { isValidEmail, isValidNickname, isValidScore, parseImageUrl } from "./validation";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user.name+tag@domain.org")).toBe(true);
  });

  it("rejects emails without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects emails without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects emails with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail(" user@example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidNickname", () => {
  it("accepts valid nicknames", () => {
    expect(isValidNickname("user123")).toBe(true);
    expect(isValidNickname("Player_1")).toBe(true);
    expect(isValidNickname("abc")).toBe(true);
  });

  it("rejects nicknames with special characters", () => {
    expect(isValidNickname("user@name")).toBe(false);
    expect(isValidNickname("user name")).toBe(false);
    expect(isValidNickname("user-name")).toBe(false);
  });

  it("rejects nicknames shorter than 3 chars", () => {
    expect(isValidNickname("ab")).toBe(false);
    expect(isValidNickname("a")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidNickname("")).toBe(false);
  });
});

describe("isValidScore", () => {
  it("accepts valid scores 0-20", () => {
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(3)).toBe(true);
    expect(isValidScore(20)).toBe(true);
  });

  it("rejects negative numbers", () => {
    expect(isValidScore(-1)).toBe(false);
  });

  it("rejects scores above 20", () => {
    expect(isValidScore(21)).toBe(false);
  });

  it("rejects decimals", () => {
    expect(isValidScore(1.5)).toBe(false);
  });

  it("rejects strings", () => {
    expect(isValidScore("3")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isValidScore(null)).toBe(false);
    expect(isValidScore(undefined)).toBe(false);
  });
});

describe("parseImageUrl", () => {
  it("accepts valid upload paths", () => {
    expect(parseImageUrl("/uploads/abc123.jpg")).toBe("/uploads/abc123.jpg");
    expect(parseImageUrl("/uploads/uuid.png")).toBe("/uploads/uuid.png");
  });

  it("rejects external URLs", () => {
    expect(parseImageUrl("https://evil.com/image.jpg")).toBeUndefined();
    expect(parseImageUrl("http://example.com/uploads/img.png")).toBeUndefined();
  });

  it("rejects javascript: and data: URIs", () => {
    expect(parseImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(parseImageUrl("data:image/png;base64,abc")).toBeUndefined();
  });

  it("rejects non-string values", () => {
    expect(parseImageUrl(null)).toBeUndefined();
    expect(parseImageUrl(undefined)).toBeUndefined();
    expect(parseImageUrl(123)).toBeUndefined();
  });

  it("rejects empty string", () => {
    expect(parseImageUrl("")).toBeUndefined();
  });
});
