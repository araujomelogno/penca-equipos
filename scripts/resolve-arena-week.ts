/**
 * Resolve the Prediction Arena week of 11–14 Jun 2026 (World Cup 2026 opening matchday).
 *
 * Sets the 6 event results, then recomputes every prediction's points and the
 * week's Nostradamus — mirroring src/lib/queries/prediction-arena.ts:calculateWeekPoints,
 * but with this script's own Prisma client so it is installation-agnostic.
 *
 * Events are matched by TITLE and teams by FIFA CODE, so it works on any install
 * seeded with the same arena week + teams (prod / the parallel install).
 *
 * Resolution source: API-Football `/fixtures/events` for the 11 matches of the week.
 *   1 First red card     -> HAPPENED  South Africa  (S. Sithole 49' vs MEX — first red of the week)
 *   2 Hat-trick          -> NO_HAPPENED            (no player scored 3+; max Havertz/Balogun 2)
 *   3 Comeback           -> NO_HAPPENED            (ops decision: no valid come-from-behind counted)
 *   4 Latest goal        -> HAPPENED  Ivory Coast   (A. Diallo 90' — last match of the week)
 *   5 First penalty goal -> HAPPENED  Switzerland   (B. Embolo 17' pen vs QAT — first pen of the week)
 *   6 First own goal     -> HAPPENED  Paraguay      (D. Bobadilla OG 7' vs USA — first own goal)
 *
 * Usage:
 *   npx tsx scripts/resolve-arena-week.ts            # dry-run (default, no writes)
 *   npx tsx scripts/resolve-arena-week.ts --write    # apply
 *   WEEK_ID=<id> npx tsx scripts/resolve-arena-week.ts --write   # force a specific week
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateEventPoints } from "../src/lib/prediction-arena-scoring";

type Resolution = { result: "HAPPENED" | "NO_HAPPENED"; teamCode: string | null };

// Keyed by event title (stable across installations).
const RESOLUTIONS: Record<string, Resolution> = {
  "First red card": { result: "HAPPENED", teamCode: "RSA" },
  "Hat-trick": { result: "NO_HAPPENED", teamCode: null },
  "Comeback": { result: "NO_HAPPENED", teamCode: null },
  "Latest goal": { result: "HAPPENED", teamCode: "CIV" },
  "First penalty goal": { result: "HAPPENED", teamCode: "SUI" },
  "First own goal": { result: "HAPPENED", teamCode: "PAR" },
};

const TITLES = Object.keys(RESOLUTIONS);

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Pick the target week (env override, else the week containing all 6 events).
    let weekId = process.env.WEEK_ID || null;
    if (!weekId) {
      const weeks = await prisma.weeklyHitsWeek.findMany({
        orderBy: { weekStart: "desc" },
        select: {
          id: true,
          weekNumber: true,
          weekStart: true,
          status: true,
          events: { select: { title: true } },
        },
      });
      const candidates = weeks.filter((w) =>
        TITLES.every((t) => w.events.some((e) => e.title === t)),
      );
      if (candidates.length === 0) {
        throw new Error(
          "No arena week contains the 6 target events. Pass WEEK_ID=... explicitly.",
        );
      }
      const unresolved = candidates.filter((w) => w.status !== "RESOLVED");
      const chosen = unresolved[0] ?? candidates[0];
      weekId = chosen.id;
      if (candidates.length > 1) {
        console.log(
          `Note: ${candidates.length} weeks match these events; chose #${chosen.weekNumber} ` +
            `(${weekId}, ${chosen.weekStart.toISOString()}, status ${chosen.status}).`,
        );
      }
    }

    const week = await prisma.weeklyHitsWeek.findUnique({
      where: { id: weekId },
      select: { id: true, weekNumber: true, status: true },
    });
    if (!week) throw new Error(`Week ${weekId} not found.`);

    console.log(
      `[${mode}] Resolving arena week #${week.weekNumber} (${week.id}), current status ${week.status}.\n`,
    );

    // 2. Load this week's events and the team lookup.
    const events = await prisma.weeklyHitsEvent.findMany({
      where: { weekId: week.id },
      orderBy: { orderIndex: "asc" },
      select: { id: true, orderIndex: true, title: true },
    });
    const teamByCode = new Map(
      (await prisma.team.findMany({ select: { id: true, code: true, name: true } })).map(
        (t) => [t.code, t],
      ),
    );

    // 3. Build the resolution plan.
    const eventUpdates: {
      id: string;
      result: "HAPPENED" | "NO_HAPPENED";
      resultTeamId: string | null;
    }[] = [];
    for (const ev of events) {
      const reso = RESOLUTIONS[ev.title];
      if (!reso) {
        console.log(`  ! "${ev.title}" not in resolution map — SKIPPED.`);
        continue;
      }
      let resultTeamId: string | null = null;
      if (reso.result === "HAPPENED" && reso.teamCode) {
        const team = teamByCode.get(reso.teamCode);
        if (!team)
          throw new Error(`Team code ${reso.teamCode} not found (event "${ev.title}").`);
        resultTeamId = team.id;
        console.log(
          `  #${ev.orderIndex} ${ev.title.padEnd(20)} -> HAPPENED / ${team.name} (${reso.teamCode})`,
        );
      } else {
        console.log(`  #${ev.orderIndex} ${ev.title.padEnd(20)} -> ${reso.result}`);
      }
      eventUpdates.push({ id: ev.id, result: reso.result, resultTeamId });
    }

    const missing = TITLES.filter((t) => !events.some((e) => e.title === t));
    if (missing.length) {
      throw new Error(`Week is missing expected events: ${missing.join(", ")}`);
    }

    // 4. Project points per user (preview in dry-run, verification in write).
    const predictions = await prisma.weeklyHitsPrediction.findMany({
      where: { event: { weekId: week.id } },
      select: {
        id: true,
        userId: true,
        eventId: true,
        teamId: true,
        createdAt: true,
        user: { select: { nickname: true } },
      },
    });
    const resolvedById = new Map(eventUpdates.map((u) => [u.id, u]));
    const scoreByUser = new Map<
      string,
      { nickname: string; total: number; earliest: Date }
    >();
    for (const p of predictions) {
      const ev = resolvedById.get(p.eventId);
      if (!ev) continue;
      const pts = calculateEventPoints(
        { teamId: p.teamId },
        { result: ev.result, resultTeamId: ev.resultTeamId },
      );
      const cur = scoreByUser.get(p.userId);
      if (cur) {
        cur.total += pts;
        if (p.createdAt < cur.earliest) cur.earliest = p.createdAt;
      } else {
        scoreByUser.set(p.userId, {
          nickname: p.user.nickname,
          total: pts,
          earliest: p.createdAt,
        });
      }
    }
    const ranking = [...scoreByUser.entries()].sort(
      (a, b) => b[1].total - a[1].total || a[1].earliest.getTime() - b[1].earliest.getTime(),
    );
    console.log("\n  Projected standings:");
    ranking.forEach(([, r], i) =>
      console.log(`    ${i === 0 ? "*" : " "} ${r.nickname.padEnd(12)} ${r.total} pts`),
    );

    if (!write) {
      console.log("\n[DRY-RUN] No changes written. Re-run with --write to apply.");
      return;
    }

    // 5. WRITE — events, then per-prediction points, then week status + Nostradamus.
    await prisma.$transaction(
      eventUpdates.map((u) =>
        prisma.weeklyHitsEvent.update({
          where: { id: u.id },
          data: { result: u.result, resultTeamId: u.resultTeamId },
        }),
      ),
    );

    const allEvents = await prisma.weeklyHitsEvent.findMany({
      where: { weekId: week.id },
      select: { id: true, result: true, resultTeamId: true },
    });
    if (allEvents.some((e) => e.result === null)) {
      throw new Error("Not all events resolved after write — aborting points calc.");
    }
    const evMap = new Map(allEvents.map((e) => [e.id, e]));
    await prisma.$transaction(
      predictions.map((p) => {
        const e = evMap.get(p.eventId)!;
        const pts = calculateEventPoints(
          { teamId: p.teamId },
          { result: e.result, resultTeamId: e.resultTeamId },
        );
        return prisma.weeklyHitsPrediction.update({
          where: { id: p.id },
          data: { points: pts },
        });
      }),
    );

    const nostradamusId = ranking.length ? ranking[0][0] : null;
    await prisma.weeklyHitsWeek.update({
      where: { id: week.id },
      data: { status: "RESOLVED", nostradamusId },
    });

    const champ = ranking[0]?.[1];
    console.log(
      `\n[WRITE] Done. Week #${week.weekNumber} RESOLVED. ` +
        `Nostradamus: ${champ ? `${champ.nickname} (${champ.total} pts)` : "none"}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
