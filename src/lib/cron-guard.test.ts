import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireCronSecret } from "./cron-guard";

describe("requireCronSecret", () => {
  const originalEnv = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it("returns error 500 when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const request = new Request("http://localhost/api/cron/highlights", {
      method: "POST",
    });

    const result = requireCronSecret(request);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(500);
  });

  it("returns error 401 when no Authorization header", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/highlights", {
      method: "POST",
    });

    const result = requireCronSecret(request);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);
  });

  it("returns error 401 when secret does not match", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/highlights", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });

    const result = requireCronSecret(request);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);
  });

  it("returns null error when secret matches", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/highlights", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
    });

    const result = requireCronSecret(request);
    expect(result.error).toBeNull();
  });
});
