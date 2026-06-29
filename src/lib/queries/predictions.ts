import { prisma } from "@/lib/prisma";
import { buildGroupTabs, type GroupTabRange } from "@/lib/groupTabs";
import { KNOCKOUT_STAGES } from "./constants";
export type { GroupTabRange } from "@/lib/groupTabs";
export { buildGroupTabs } from "@/lib/groupTabs";

// --- Exported Types ---

export interface PredictionMatch {
  id: string;
  kickoffTime: string; // ISO string for client serialization
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  hasStarted: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
}

export interface GroupPredictions {
  name: string; // section id: group letter ("A") or stage code ("R32"); the card translates it
  matches: PredictionMatch[];
}

export interface PredictionsData {
  groupTabs: GroupTabRange[];
  individualTabs: GroupTabRange[];
  allGroups: GroupPredictions[];
  progress: { completed: number; total: number };
}

interface RawPredMatch {
  id: string;
  kickoffTime: Date;
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
}

/**
 * The knockout round the user should land on in /predictions.
 * Among loaded knockout stages (in bracket order), the earliest one that still
 * has an upcoming match; if every knockout match has started, the most advanced
 * loaded stage. Returns null when no knockout stage is loaded yet (group phase).
 */
export function activeKnockoutStage(
  koMap: Map<string, PredictionMatch[]>,
  now: Date,
): string | null {
  const loaded = KNOCKOUT_STAGES.filter((s) => koMap.has(s));
  if (loaded.length === 0) return null;

  const withUpcoming = loaded.find((s) =>
    koMap.get(s)!.some((m) => new Date(m.kickoffTime) > now),
  );
  return withUpcoming ?? loaded[loaded.length - 1];
}

/** Move the tab matching `stage` to the front, preserving the rest of the order. */
function stageTabFirst(tabs: GroupTabRange[], stage: string | null): GroupTabRange[] {
  if (!stage) return tabs;
  const idx = tabs.findIndex((t) => t.stage === stage);
  if (idx <= 0) return tabs;
  return [tabs[idx], ...tabs.slice(0, idx), ...tabs.slice(idx + 1)];
}

// --- Pure assembler (unit-tested) ---

export function assemblePredictionsData(
  matches: RawPredMatch[],
  predMap: Map<string, { homeScore: number; awayScore: number }>,
  now: Date,
): PredictionsData {
  const toPM = (m: RawPredMatch): PredictionMatch => {
    const pred = predMap.get(m.id);
    return {
      id: m.id,
      kickoffTime: m.kickoffTime.toISOString(),
      stage: m.stage,
      group: m.group,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      hasStarted: m.kickoffTime <= now,
      prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
    };
  };

  // Group sections, keyed by group letter
  const groupMap = new Map<string, PredictionMatch[]>();
  // Knockout sections, keyed by stage code
  const koMap = new Map<string, PredictionMatch[]>();

  for (const m of matches) {
    if (m.stage === "GROUP") {
      if (!m.group) continue;
      const arr = groupMap.get(m.group) ?? [];
      arr.push(toPM(m));
      groupMap.set(m.group, arr);
    } else if ((KNOCKOUT_STAGES as readonly string[]).includes(m.stage)) {
      const arr = koMap.get(m.stage) ?? [];
      arr.push(toPM(m));
      koMap.set(m.stage, arr);
    }
  }

  const sortedGroups = [...groupMap.keys()].sort();
  const loadedKnockoutStages = KNOCKOUT_STAGES.filter((s) => koMap.has(s));

  const allGroups: GroupPredictions[] = [
    ...sortedGroups.map((name) => ({ name, matches: groupMap.get(name)! })),
    ...loadedKnockoutStages.map((stage) => ({
      name: stage,
      matches: koMap.get(stage)!,
    })),
  ];

  const knockoutTabs: GroupTabRange[] = loadedKnockoutStages.map((stage) => ({
    label: stage,
    groups: [stage],
    stage,
  }));

  // Preselect the active knockout round by surfacing its tab first. The form
  // initializes its selected tab from tabs[0], so reordering preselects it too.
  const activeStage = activeKnockoutStage(koMap, now);

  const groupTabs = stageTabFirst(
    [...buildGroupTabs(sortedGroups), ...knockoutTabs],
    activeStage,
  );
  const individualTabs: GroupTabRange[] = stageTabFirst(
    [...sortedGroups.map((g) => ({ label: g, groups: [g] })), ...knockoutTabs],
    activeStage,
  );

  // Progress: future (not-started) matches across all loaded stages
  const total = matches.filter((m) => m.kickoffTime > now).length;
  const completed = matches.filter((m) => m.kickoffTime > now && predMap.has(m.id)).length;

  return { groupTabs, individualTabs, allGroups, progress: { completed, total } };
}

// --- Main query ---

export async function getPredictionsData(userId: string): Promise<PredictionsData> {
  const now = new Date();

  const [matches, userPredictions] = await Promise.all([
    prisma.match.findMany({
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
      where: { userId },
      select: { matchId: true, homeScore: true, awayScore: true },
    }),
  ]);

  const predMap = new Map(
    userPredictions.map((p) => [p.matchId, { homeScore: p.homeScore, awayScore: p.awayScore }]),
  );

  return assemblePredictionsData(matches, predMap, now);
}
