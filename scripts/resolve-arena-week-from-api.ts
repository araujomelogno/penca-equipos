/**
 * Resolve a Prediction Arena week from authoritative API-Football data.
 *
 * Generalises the one-off scripts/resolve-arena-week.ts: instead of hardcoded
 * results, it fetches `/fixtures/events` for every match in the week's window
 * and computes the 6 default events deterministically (see src/lib/arena-
 * resolution.ts for the rules), then recomputes every prediction's points and
 * the week's Nostradamus.
 *
 * Requires WEEK_ID (the script never guesses which week to resolve) and
 * API_FOOTBALL_KEY. Works on any install whose matches carry real
 * `apiFootballId`s and whose teams carry `apiFootballId`.
 *
 *   WEEK_ID=<id> npx tsx scripts/resolve-arena-week-from-api.ts          # dry-run
 *   WEEK_ID=<id> npx tsx scripts/resolve-arena-week-from-api.ts --write  # apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateEventPoints } from "../src/lib/prediction-arena-scoring";
import { resolveEvent, type ApiEvent, type MatchEvents } from "../src/lib/arena-resolution";

const API_BASE = "https://v3.football.api-sports.io";

async function apiGet<T>(path: string, key: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`API-Football ${res.status} for ${path}`);
    return (await res.json()) as T;
  }
  throw new Error(`API-Football rate-limited on ${path} after retries`);
}

function fetchEvents(fixtureId: number, key: string): Promise<ApiEvent[]> {
  return apiGet<{ response: ApiEvent[] }>(`/fixtures/events?fixture=${fixtureId}`, key).then(
    (d) => d.response ?? [],
  );
}

interface FixtureTeams {
  home: { id: number; name: string };
  away: { id: number; name: string };
}

async function fetchFixtureTeams(fixtureId: number, key: string): Promise<FixtureTeams> {
  const d = await apiGet<{ response: { teams: FixtureTeams }[] }>(
    `/fixtures?id=${fixtureId}`,
    key,
  );
  const teams = d.response[0]?.teams;
  if (!teams) throw new Error(`No fixture teams for ${fixtureId}`);
  return teams;
}

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const weekId = process.env.WEEK_ID;
  if (!weekId) throw new Error("WEEK_ID is required (this script never guesses the week).");
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not configured.");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const week = await prisma.weeklyHitsWeek.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        weekNumber: true,
        status: true,
        weekStart: true,
        weekEnd: true,
        events: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true, kind: true } },
      },
    });
    if (!week) throw new Error(`Week ${weekId} not found.`);

    console.log(
      `[${mode}] Resolving arena week #${week.weekNumber} (${week.id}), status ${week.status}, ` +
        `${week.weekStart.toISOString().slice(0, 10)}..${week.weekEnd.toISOString().slice(0, 10)}.\n`,
    );

    // Matches in the week window. NOTE: reconcile-fixtures aligned Match
    // apiFootballId to real fixtures, but Team.apiFootballId are still the
    // seed's synthetic ids — so we cannot map API team ids via Team. Instead,
    // per fixture we ask the API for its home/away team ids and align them to
    // our Match's home/away (orientation preserved by reconcile).
    const matches = await prisma.match.findMany({
      where: { kickoffTime: { gte: week.weekStart, lte: week.weekEnd } },
      select: {
        apiFootballId: true,
        kickoffTime: true,
        homeTeam: { select: { id: true, name: true, code: true } },
        awayTeam: { select: { id: true, name: true, code: true } },
      },
      orderBy: { kickoffTime: "asc" },
    });
    if (matches.length === 0) throw new Error("No matches in this week's window.");
    console.log(`Fetching events + teams for ${matches.length} matches from API-Football...`);

    // API team id -> our Team (id, name, code), accumulated across all fixtures.
    const teamByApiId = new Map<number, { id: string; name: string; code: string }>();
    const matchEvents: MatchEvents[] = [];
    for (const m of matches) {
      const [events, fxTeams] = await Promise.all([
        fetchEvents(m.apiFootballId, key),
        fetchFixtureTeams(m.apiFootballId, key),
      ]);
      teamByApiId.set(fxTeams.home.id, m.homeTeam);
      teamByApiId.set(fxTeams.away.id, m.awayTeam);
      matchEvents.push({
        apiFootballId: m.apiFootballId,
        kickoffTime: m.kickoffTime,
        homeTeamApiId: fxTeams.home.id,
        awayTeamApiId: fxTeams.away.id,
        events,
      });
    }

    console.log("\nComputed results:");
    const eventUpdates: {
      id: string;
      title: string;
      result: "HAPPENED" | "NO_HAPPENED";
      resultTeamId: string | null;
    }[] = [];
    for (const event of week.events) {
      let reso;
      try {
        reso = resolveEvent({ kind: event.kind, title: event.title }, matchEvents);
      } catch {
        console.log(`  ${event.title.padEnd(20)} -> SKIPPED (no kind/title match)`);
        continue;
      }
      let resultTeamId: string | null = null;
      let label: string = reso.result;
      if (reso.result === "HAPPENED") {
        const team = teamByApiId.get(reso.teamApiId);
        if (!team) throw new Error(`API team ${reso.teamApiId} (event "${event.title}") not mapped to a Team.`);
        resultTeamId = team.id;
        label = `HAPPENED / ${team.name} (${team.code})`;
      }
      console.log(`  ${event.title.padEnd(20)} -> ${label}`);
      eventUpdates.push({ id: event.id, title: event.title, result: reso.result, resultTeamId });
    }

    // Project points + standings.
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
    const byEventId = new Map(eventUpdates.map((u) => [u.id, u]));
    const scoreByUser = new Map<string, { nickname: string; total: number; earliest: Date }>();
    for (const p of predictions) {
      const ev = byEventId.get(p.eventId);
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
        scoreByUser.set(p.userId, { nickname: p.user.nickname, total: pts, earliest: p.createdAt });
      }
    }
    const ranking = [...scoreByUser.entries()].sort(
      (a, b) => b[1].total - a[1].total || a[1].earliest.getTime() - b[1].earliest.getTime(),
    );
    console.log("\nProjected standings:");
    ranking.forEach(([, r], i) =>
      console.log(`  ${i === 0 ? "*" : " "} ${r.nickname.padEnd(14)} ${r.total} pts`),
    );

    if (!write) {
      console.log("\n[DRY-RUN] No changes written. Re-run with --write to apply.");
      return;
    }

    await prisma.$transaction(
      eventUpdates.map((u) =>
        prisma.weeklyHitsEvent.update({
          where: { id: u.id },
          data: { result: u.result, resultTeamId: u.resultTeamId },
        }),
      ),
    );
    await prisma.$transaction(
      predictions.map((p) => {
        const ev = byEventId.get(p.eventId)!;
        const pts = calculateEventPoints(
          { teamId: p.teamId },
          { result: ev.result, resultTeamId: ev.resultTeamId },
        );
        return prisma.weeklyHitsPrediction.update({ where: { id: p.id }, data: { points: pts } });
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
