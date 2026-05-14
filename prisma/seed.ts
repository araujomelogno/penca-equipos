import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // Generar código de invitación activo (expira en 7 días)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.invitationCode.upsert({
    where: { code: "PENCACHI-001" },
    update: {},
    create: {
      code: "PENCACHI-001",
      isActive: true,
      expiresAt,
    },
  });
  console.log("Seeded invitation code: PENCACHI-001");

  // Crear usuario admin
  const bcrypt = await import("bcryptjs");
  const adminEmail = "admin@pencachi.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("admin123", 10),
        nickname: "Admin",
        isAdmin: true,
        isActive: true,
      },
    });
    console.log("Created admin user (admin@pencachi.com / admin123)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
