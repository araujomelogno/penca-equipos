/**
 * Update playoff placeholder teams with the actual qualified teams.
 *
 * UEFA Playoffs (March 31, 2026):
 *   Path A → Bosnia and Herzegovina (beat Italy)
 *   Path B → Sweden
 *   Path C → Turkey
 *   Path D → Czechia
 *
 * Intercontinental Playoffs (March 31, 2026):
 *   Pathway 1 → DR Congo (beat Jamaica 1-0)
 *   Pathway 2 → Iraq (beat Bolivia 2-1)
 *
 * Run:  npx tsx scripts/update-playoff-teams.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const flag = (iso2: string) =>
  `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;

const updates = [
  { oldCode: "UPD", name: "Czechia",                    code: "CZE", flagUrl: flag("cz") },
  { oldCode: "UPA", name: "Bosnia and Herzegovina",     code: "BIH", flagUrl: flag("ba") },
  { oldCode: "UPC", name: "Turkey",                     code: "TUR", flagUrl: flag("tr") },
  { oldCode: "UPB", name: "Sweden",                     code: "SWE", flagUrl: flag("se") },
  { oldCode: "IP2", name: "Iraq",                       code: "IRQ", flagUrl: flag("iq") },
  { oldCode: "IP1", name: "DR Congo",                   code: "COD", flagUrl: flag("cd") },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Updating playoff placeholder teams...\n");

  for (const u of updates) {
    const result = await prisma.team.updateMany({
      where: { code: u.oldCode },
      data: { name: u.name, code: u.code, flagUrl: u.flagUrl },
    });

    if (result.count === 0) {
      console.log(`  ! ${u.oldCode} not found (already updated?)`);
    } else {
      console.log(`  ✓ ${u.oldCode} → ${u.code} (${u.name})`);
    }
  }

  // Verify
  const placeholders = await prisma.team.findMany({
    where: { code: { in: ["UPD", "UPA", "UPC", "UPB", "IP1", "IP2"] } },
  });

  if (placeholders.length > 0) {
    console.log(`\n  ✗ ${placeholders.length} placeholder(s) still remain!`);
  } else {
    console.log("\n  All placeholders replaced successfully.");
  }

  // Show final state
  const teams = await prisma.team.findMany({
    where: { code: { in: updates.map((u) => u.code) } },
    select: { name: true, code: true, group: true, flagUrl: true },
    orderBy: { group: "asc" },
  });
  console.log("\nUpdated teams:");
  for (const t of teams) {
    console.log(`  Group ${t.group}: ${t.name} (${t.code}) — ${t.flagUrl}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
