/**
 * DEV-ONLY seed: populate several Prediction Arena weeks so the week selector
 * has something to show — two past RESOLVED weeks (with results, predictions,
 * points and a Nostradamus) plus the current OPEN week.
 *
 * Safety: refuses to run unless DATABASE_URL points at localhost / 127.0.0.1.
 * Wipes all WeeklyHits* rows first, then reseeds.
 *
 *   npx tsx scripts/dev-seed-arenas.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_WEEKLY_EVENTS } from "../src/lib/prediction-arena-defaults";
import { calculateEventPoints } from "../src/lib/prediction-arena-scoring";

function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Refusing to run: DATABASE_URL host is "${host}", not localhost. This seed wipes arena data.`);
  }
}

// Monday 00:00 UTC of the week containing `date`.
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const url = process.env.DATABASE_URL!;
  assertLocal(url);

  const locale = process.env.DEFAULT_LOCALE || "en";
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8"));
  const defaults = messages.arena.defaults as Record<string, { title: string; description: string }>;
  const eventTemplates = DEFAULT_WEEKLY_EVENTS.map((e) => ({
    emoji: e.emoji,
    title: defaults[e.key].title,
    description: defaults[e.key].description,
  }));

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, nickname: true },
      orderBy: { createdAt: "asc" },
      take: 3,
    });
    if (users.length < 2) throw new Error("Need at least 2 users in the local DB to seed predictions.");

    const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    if (teams.length < 8) throw new Error("Need teams seeded first (run the worldcup seed).");

    // Wipe existing arena data (local only).
    await prisma.weeklyHitsPrediction.deleteMany({});
    await prisma.weeklyHitsEvent.deleteMany({});
    await prisma.weeklyHitsWeek.deleteMany({});
    console.log("Cleared existing arena weeks.");

    const thisMonday = mondayOf(new Date());

    // Two resolved past weeks + one open current week.
    const plans = [
      { weekNumber: 1, startOffset: -14, status: "RESOLVED" as const },
      { weekNumber: 2, startOffset: -7, status: "RESOLVED" as const },
      { weekNumber: 3, startOffset: 0, status: "OPEN" as const },
    ];

    for (const plan of plans) {
      const weekStart = addDays(thisMonday, plan.startOffset);
      const weekEnd = new Date(addDays(weekStart, 6));
      weekEnd.setUTCHours(23, 59, 59, 999);
      const deadline = new Date(addDays(weekStart, 1));
      deadline.setUTCHours(23, 0, 0, 0);

      const resolved = plan.status === "RESOLVED";

      // For resolved weeks: events 0,1,3,4,5 HAPPENED (with a team), event 2 NO_HAPPENED.
      const week = await prisma.weeklyHitsWeek.create({
        data: {
          weekStart,
          weekEnd,
          weekNumber: plan.weekNumber,
          status: plan.status,
          deadline,
          events: {
            create: eventTemplates.map((e, i) => ({
              orderIndex: i + 1,
              emoji: e.emoji,
              title: e.title,
              description: e.description,
              result: resolved ? (i === 2 ? "NO_HAPPENED" : "HAPPENED") : null,
              resultTeamId: resolved && i !== 2 ? teams[i % teams.length].id : null,
            })),
          },
        },
        include: { events: { orderBy: { orderIndex: "asc" } } },
      });

      // Predictions. For the open week, only partial coverage so progress varies.
      // userPickTeamIndex: how each user picks relative to the result team index.
      const userScores = new Map<string, { total: number; earliest: Date }>();
      for (let u = 0; u < users.length; u++) {
        const user = users[u];
        // Open week: user 0 predicts all 6, user 1 predicts 4, user 2 predicts 2.
        const coverage = resolved ? 6 : [6, 4, 2][u] ?? 0;

        for (let i = 0; i < week.events.length; i++) {
          if (i >= coverage) continue;
          const event = week.events[i];

          // Pick: user 0 nails the result (becomes Nostradamus), others drift.
          let teamId: string | null;
          if (i === 2) {
            // NO_HAPPENED event: user 0 says "won't happen" (correct), others pick a team.
            teamId = u === 0 ? null : teams[(i + u) % teams.length].id;
          } else if (u === 0) {
            teamId = teams[i % teams.length].id; // exact match
          } else if (u === 1) {
            teamId = teams[(i + 1) % teams.length].id; // wrong team (partial)
          } else {
            teamId = null; // predicted "won't happen" but it happened
          }

          const createdAt = new Date(addDays(weekStart, 0).getTime() + (u * 3600 + i * 60) * 1000);
          const points = resolved
            ? calculateEventPoints(
                { teamId },
                { result: event.result, resultTeamId: event.resultTeamId },
              )
            : null;

          await prisma.weeklyHitsPrediction.create({
            data: { userId: user.id, eventId: event.id, teamId, points, createdAt },
          });

          if (resolved) {
            const cur = userScores.get(user.id);
            const pts = points ?? 0;
            if (cur) {
              cur.total += pts;
              if (createdAt < cur.earliest) cur.earliest = createdAt;
            } else {
              userScores.set(user.id, { total: pts, earliest: createdAt });
            }
          }
        }
      }

      if (resolved) {
        let nostradamusId: string | null = null;
        let max = -1;
        let earliest = new Date(8640000000000000);
        for (const [uid, s] of userScores) {
          if (s.total > max || (s.total === max && s.earliest < earliest)) {
            max = s.total;
            earliest = s.earliest;
            nostradamusId = uid;
          }
        }
        await prisma.weeklyHitsWeek.update({
          where: { id: week.id },
          data: { nostradamusId },
        });
        const champ = users.find((u) => u.id === nostradamusId);
        console.log(`Week ${plan.weekNumber} (RESOLVED) — Nostradamus: ${champ?.nickname} (${max} pts)`);
      } else {
        console.log(`Week ${plan.weekNumber} (OPEN) — deadline ${deadline.toISOString()}`);
      }
    }

    console.log("\nDone. Arena now has 2 resolved weeks + 1 open week.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
