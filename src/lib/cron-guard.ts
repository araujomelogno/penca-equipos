import { NextResponse } from "next/server";

export function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return {
      error: NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { error: null };
}
