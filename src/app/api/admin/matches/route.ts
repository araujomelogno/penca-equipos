import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const where = search
    ? {
        OR: [
          { homeTeam: { name: { contains: search, mode: "insensitive" as const } } },
          { awayTeam: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { kickoffTime: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        kickoffTime: true,
        homeScore: true,
        awayScore: true,
        status: true,
        scoreSource: true,
        homeTeam: { select: { name: true, code: true } },
        awayTeam: { select: { name: true, code: true } },
      },
    }),
    prisma.match.count({ where }),
  ]);

  return NextResponse.json({
    matches,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
