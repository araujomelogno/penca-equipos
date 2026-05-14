import { prisma } from "@/lib/prisma";
import { buildGroupTabs, type GroupTabRange } from "@/lib/groupTabs";
export type { GroupTabRange } from "@/lib/groupTabs";
export { buildGroupTabs } from "@/lib/groupTabs";

// --- Exported Types ---

export interface PredictionMatch {
  id: string;
  kickoffTime: string; // ISO string for client serialization
  stage: string;
  group: string;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  hasStarted: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
}

export interface GroupPredictions {
  name: string;
  matches: PredictionMatch[];
}

export interface PredictionsData {
  groupTabs: GroupTabRange[];
  individualTabs: GroupTabRange[];
  allGroups: GroupPredictions[];
  progress: { completed: number; total: number };
}

// --- Main query ---

export async function getPredictionsData(userId: string): Promise<PredictionsData> {
  const now = new Date();

  const [matches, userPredictions] = await Promise.all([
    prisma.match.findMany({
      where: { stage: "GROUP" },
      orderBy: { kickoffTime: "asc" },
      select: {
        id: true,
        kickoffTime: true,
        stage: true,
        group: true,
        homeTeam: { select: { name: true, code: true, flagUrl: true } },
        awayTeam: { select: { name: true, code: true, flagUrl: true } },
      },
    }),
    prisma.prediction.findMany({
      where: { userId, match: { stage: "GROUP" } },
      select: { matchId: true, homeScore: true, awayScore: true },
    }),
  ]);

  const predMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  // Group matches by group letter
  const groupMap = new Map<string, PredictionMatch[]>();

  for (const m of matches) {
    if (!m.group) continue;

    const pred = predMap.get(m.id);
    const pm: PredictionMatch = {
      id: m.id,
      kickoffTime: m.kickoffTime.toISOString(),
      stage: m.stage,
      group: m.group,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      hasStarted: m.kickoffTime <= now,
      prediction: pred
        ? { homeScore: pred.homeScore, awayScore: pred.awayScore }
        : null,
    };

    const arr = groupMap.get(m.group) ?? [];
    arr.push(pm);
    groupMap.set(m.group, arr);
  }

  const sortedGroups = [...groupMap.keys()].sort();
  const allGroups: GroupPredictions[] = sortedGroups.map((name) => ({
    name,
    matches: groupMap.get(name)!,
  }));

  // Build group tabs (ranges of 3 for desktop, individual for mobile)
  const groupTabs = buildGroupTabs(sortedGroups);
  const individualTabs: GroupTabRange[] = sortedGroups.map((g) => ({ label: g, groups: [g] }));

  // Progress: count predictions for group matches that haven't started
  const total = matches.filter((m) => m.kickoffTime > now).length;
  const completed = matches.filter(
    (m) => m.kickoffTime > now && predMap.has(m.id),
  ).length;

  return {
    groupTabs,
    individualTabs,
    allGroups,
    progress: { completed, total },
  };
}

