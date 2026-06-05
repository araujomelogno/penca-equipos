import { prisma } from "@/lib/prisma";
import { POINTS_EXACT, POINTS_CORRECT_WINNER, KNOCKOUT_STAGES, STAGE_LABELS } from "./constants";

// Uruguay does not observe DST; offset is permanently UTC-3.
const APP_TZ = "America/Montevideo";
const APP_TZ_OFFSET = "-03:00";

function localDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

// --- Exported Types ---

export interface MatchCardData {
  id: string;
  kickoffTime: Date;
  stage: string;
  group: string | null;
  venue: string | null;
  status: string;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  homeScore: number | null;
  awayScore: number | null;
  userPrediction: { homeScore: number; awayScore: number } | null;
  userPoints: number | null;
  stats: {
    totalPredictions: number;
    exactCount: number;
    correctWinnerCount: number;
    avgHomeScore: number | null;
    avgAwayScore: number | null;
  };
}

export interface DateGroup {
  dateLabel: string;
  dateKey: string;
  matches: MatchCardData[];
}

export interface StageTab {
  value: string;
  label: string;
}

export interface DatePill {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // MON, TUE, etc.
  dayOfMonth: number;
  month: string; // JAN, FEB, etc.
  isToday: boolean;
}

export interface MatchesFilters {
  date?: string; // YYYY-MM-DD
  stage?: string;
  status?: string;
}

export interface MatchesData {
  dateGroups: DateGroup[];
  stages: StageTab[];
  datePills: DatePill[];
  allMatchDates: string[];
  filters: MatchesFilters;
  totalCount: number;
}

// --- Main query ---

export async function getMatchesData(
  userId: string,
  filters: MatchesFilters,
): Promise<MatchesData> {
  const [stages, allMatchDates, matchRows] = await Promise.all([
    getAvailableStages(),
    getAllMatchDates(),
    getFilteredMatches(filters),
  ]);

  const datePills = buildDatePills(allMatchDates, filters.date);

  const matchIds = matchRows.map((m) => m.id);

  // Fetch user predictions + aggregate stats + counts in parallel
  const [userPredictions, predictionStats, predictionCounts] = await Promise.all([
    matchIds.length > 0
      ? prisma.prediction.findMany({
          where: { userId, matchId: { in: matchIds } },
          select: { matchId: true, homeScore: true, awayScore: true, points: true },
        })
      : Promise.resolve([]),
    matchIds.length > 0
      ? prisma.prediction.findMany({
          where: { matchId: { in: matchIds }, points: { not: null } },
          select: { matchId: true, points: true },
        })
      : Promise.resolve([]),
    matchIds.length > 0
      ? prisma.prediction.groupBy({
          by: ["matchId"],
          where: { matchId: { in: matchIds } },
          _count: true,
          _avg: { homeScore: true, awayScore: true },
        })
      : Promise.resolve([]),
  ]);

  const userPredMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  // Build stats per match
  const statsMap = new Map<
    string,
    { totalPredictions: number; exactCount: number; correctWinnerCount: number }
  >();

  const countMap = new Map(predictionCounts.map((c) => [c.matchId, {
    count: c._count,
    avgHome: c._avg?.homeScore ?? null,
    avgAway: c._avg?.awayScore ?? null,
  }]));

  for (const p of predictionStats) {
    let entry = statsMap.get(p.matchId);
    if (!entry) {
      entry = { totalPredictions: 0, exactCount: 0, correctWinnerCount: 0 };
      statsMap.set(p.matchId, entry);
    }
    if (p.points === POINTS_EXACT) entry.exactCount++;
    if (p.points === POINTS_CORRECT_WINNER) entry.correctWinnerCount++;
  }

  // Enrich match data
  const matches: MatchCardData[] = matchRows.map((m) => {
    const userPred = userPredMap.get(m.id);
    const scoredStats = statsMap.get(m.id);
    const countEntry = countMap.get(m.id);
    const totalPredictions = countEntry?.count ?? 0;

    return {
      id: m.id,
      kickoffTime: m.kickoffTime,
      stage: m.stage,
      group: m.group,
      venue: m.venue,
      status: m.status,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      userPrediction: userPred
        ? { homeScore: userPred.homeScore, awayScore: userPred.awayScore }
        : null,
      userPoints: userPred?.points ?? null,
      stats: {
        totalPredictions,
        exactCount: scoredStats?.exactCount ?? 0,
        correctWinnerCount: scoredStats?.correctWinnerCount ?? 0,
        avgHomeScore: countEntry?.avgHome ?? null,
        avgAwayScore: countEntry?.avgAway ?? null,
      },
    };
  });

  // Group by date
  const dateGroups = groupByDate(matches);

  return {
    dateGroups,
    stages,
    datePills,
    allMatchDates,
    filters,
    totalCount: matches.length,
  };
}

// --- Filtered matches ---

async function getFilteredMatches(filters: MatchesFilters) {
  const where: Record<string, unknown> = {};

  // Status filter
  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "ONGOING") {
      where.status = { in: ["LIVE", "HALFTIME"] };
    } else {
      where.status = filters.status;
    }
  }

  // Stage filter
  if (filters.stage && filters.stage !== "ALL") {
    if (filters.stage.startsWith("GROUP_")) {
      where.stage = "GROUP";
      where.group = filters.stage.replace("GROUP_", "");
    } else {
      where.stage = filters.stage;
    }
  }

  // Date filter (interpret the YYYY-MM-DD as a local Montevideo day)
  if (filters.date) {
    const start = new Date(filters.date + "T00:00:00" + APP_TZ_OFFSET);
    const end = new Date(filters.date + "T23:59:59.999" + APP_TZ_OFFSET);
    where.kickoffTime = { gte: start, lte: end };
  }

  return prisma.match.findMany({
    where,
    orderBy: { kickoffTime: "asc" },
    select: {
      id: true,
      kickoffTime: true,
      stage: true,
      group: true,
      venue: true,
      status: true,
      homeTeam: { select: { name: true, code: true, flagUrl: true } },
      awayTeam: { select: { name: true, code: true, flagUrl: true } },
      homeScore: true,
      awayScore: true,
    },
  });
}

// --- Available stages (progressive) ---

async function getAvailableStages(): Promise<StageTab[]> {
  const tabs: StageTab[] = [{ value: "ALL", label: "ALL" }];

  // Get all groups that have matches
  const groups = await prisma.match.groupBy({
    by: ["group"],
    where: { stage: "GROUP", group: { not: null } },
    orderBy: { group: "asc" },
  });

  for (const g of groups) {
    if (g.group) {
      tabs.push({ value: `GROUP_${g.group}`, label: `GROUP ${g.group}` });
    }
  }

  // Knockout stages
  const knockoutCounts = await prisma.match.groupBy({
    by: ["stage"],
    where: { stage: { in: [...KNOCKOUT_STAGES] } },
    _count: true,
  });
  const stagesWithMatches = new Set(knockoutCounts.map((s) => s.stage));

  for (const s of KNOCKOUT_STAGES) {
    if (stagesWithMatches.has(s)) {
      tabs.push({ value: s, label: STAGE_LABELS[s] });
    }
  }

  return tabs;
}

// --- Date pills ---

async function getAllMatchDates(): Promise<string[]> {
  const rows = await prisma.match.findMany({
    select: { kickoffTime: true },
    orderBy: { kickoffTime: "asc" },
  });

  const dateSet = new Set<string>();
  for (const r of rows) {
    dateSet.add(localDateKey(r.kickoffTime));
  }
  return Array.from(dateSet);
}

export function buildDatePills(allDates: string[], selectedDate?: string): DatePill[] {
  if (allDates.length === 0) return [];

  const todayStr = localDateKey(new Date());
  const center = selectedDate ?? todayStr;

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];

  // Split dates into before/after center, pick 2 closest from each side
  const before = allDates.filter((d) => d < center).slice(-2);
  const exact = allDates.filter((d) => d === center);
  const after = allDates.filter((d) => d > center).slice(0, 2);
  const selected = [...before, ...exact, ...after].slice(0, 4);

  // If we got fewer than 4, fill from the closest available
  if (selected.length < 4) {
    for (const d of allDates) {
      if (!selected.includes(d)) {
        selected.push(d);
        if (selected.length >= 4) break;
      }
    }
    selected.sort();
  }

  return selected.map((dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return {
      date: dateStr,
      dayOfWeek: dayNames[d.getDay()],
      dayOfMonth: d.getDate(),
      month: monthNames[d.getMonth()],
      isToday: dateStr === todayStr,
    };
  });
}

// --- Group matches by date ---

export function groupByDate(matches: MatchCardData[]): DateGroup[] {
  const groups = new Map<string, MatchCardData[]>();

  for (const m of matches) {
    const dateKey = localDateKey(new Date(m.kickoffTime));

    const arr = groups.get(dateKey) ?? [];
    arr.push(m);
    groups.set(dateKey, arr);
  }

  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, matches]) => {
      const d = new Date(dateKey + "T12:00:00");
      const label = `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}`;
      return { dateLabel: label, dateKey, matches };
    });
}
