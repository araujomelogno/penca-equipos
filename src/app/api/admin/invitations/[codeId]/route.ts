import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codeId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { codeId } = await params;

  const code = await prisma.invitationCode.findUnique({
    where: { id: codeId },
  });

  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ invitation: code });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ codeId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { codeId } = await params;

  const code = await prisma.invitationCode.findUnique({
    where: { id: codeId },
  });

  if (!code) {
    return NextResponse.json(
      { error: "Invitation code not found" },
      { status: 404 },
    );
  }

  const updated = await prisma.invitationCode.update({
    where: { id: codeId },
    data: { isActive: false, deactivatedAt: new Date() },
  });

  return NextResponse.json({ invitation: updated });
}
