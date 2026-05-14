import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

const PAGE_SIZE = 3;

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const where = search
    ? { code: { contains: search, mode: "insensitive" as const } }
    : {};

  const [codes, total] = await Promise.all([
    prisma.invitationCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invitationCode.count({ where }),
  ]);

  return NextResponse.json({
    codes,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const digits = String(Math.floor(Math.random() * 900) + 100);
  const code = `PENCACHI-${digits}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitationCode.create({
    data: { code, expiresAt },
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
