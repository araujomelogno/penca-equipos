import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { detectImageKind, extensionFor } from "@/lib/imageUpload";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const t = await getTranslations("api");
  const tU = await getTranslations("api.upload");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: tU("noFile") }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: tU("tooLarge5") }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectImageKind(buffer);
  if (!kind) {
    return NextResponse.json({ error: tU("invalidType") }, { status: 400 });
  }

  const filename = `${randomUUID()}${extensionFor(kind)}`;
  await writeFile(join(process.cwd(), "public", "uploads", filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
