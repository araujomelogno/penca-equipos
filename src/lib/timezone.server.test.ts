import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { getTimeZone } from "./timezone.server";

const mockCookie = (value: string | undefined) => {
  (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) =>
      name === "pencachi_tz" && value ? { value } : undefined,
  });
};

describe("getTimeZone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the cookie TZ when valid", async () => {
    mockCookie("Asia/Tokyo");
    expect(await getTimeZone()).toBe("Asia/Tokyo");
  });

  it("falls back to default when cookie missing", async () => {
    mockCookie(undefined);
    expect(await getTimeZone()).toBe("America/Montevideo");
  });

  it("falls back to default when cookie is garbage", async () => {
    mockCookie("Not/AZone");
    expect(await getTimeZone()).toBe("America/Montevideo");
  });
});
