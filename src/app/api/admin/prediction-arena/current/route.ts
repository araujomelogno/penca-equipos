import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminCurrentWeek } from "@/lib/queries/prediction-arena";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { week, matchCount } = await getAdminCurrentWeek();

  return NextResponse.json({ week, matchCount });
}
