import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, code: true, flagUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ teams });
}
