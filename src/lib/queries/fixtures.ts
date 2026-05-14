import { prisma } from "@/lib/prisma";
import { KNOCKOUT_STAGES, STAGE_LABELS } from "./constants";

const STAGE_GROUP = "GROUP";

// --- Exported Types ---

export interface GroupStanding {
  team: { id: string; name: string; code: string; flagUrl: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualified: boolean;
}

export interface GroupData {
  name: string;
  standings: GroupStanding[];
}

export interface KnockoutMatch {
  id: string;
  kickoffTime: Date;
  stage: string;
  venue: string | null;
  status: string;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  homeScore: number | null;
  awayScore: number | null;
}

export interface StageTab {
  value: string;
  label: string;
}

export interface FixturesData {
  stages: StageTab[];
  activeStage: string;
  groups: GroupData[];
  knockoutMatches: KnockoutMatch[];
}

// --- Main query ---

export async function getFixturesData(stage?: string): Promise<FixturesData> {
  const activeStage = stage || STAGE_GROUP;

  const [stages, groups, knockoutMatches] = await Promise.all([
    getAvailableStages(),
    activeStage === STAGE_GROUP ? getGroupStandings() : Promise.resolve([]),
    activeStage !== STAGE_GROUP ? getKnockoutMatches(activeStage) : Promise.resolve([]),
  ]);

  return { stages, activeStage, groups, knockoutMatches };
}

// --- Available stages (progressive tabs) ---

async function getAvailableStages(): Promise<StageTab[]> {
  const tabs: StageTab[] = [{ value: STAGE_GROUP, label: STAGE_LABELS[STAGE_GROUP] }];

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

// --- Group standings (computed from FINISHED matches) ---

async function getGroupStandings(): Promise<GroupData[]> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { group: { not: null } },
      select: { id: true, name: true, code: true, flagUrl: true, group: true },
      orderBy: { name: "asc" },
    }),
    prisma.match.findMany({
      where: { stage: STAGE_GROUP, status: "FINISHED" },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        group: true,
      },
    }),
  ]);

  // Group teams by group letter
  const groupMap = new Map<string, typeof teams>();
  for (const t of teams) {
    if (!t.group) continue;
    const arr = groupMap.get(t.group) ?? [];
    arr.push(t);
    groupMap.set(t.group, arr);
  }

  // Build standings per group
  const groups: GroupData[] = [];
  const sortedGroupNames = [...groupMap.keys()].sort();

  for (const groupName of sortedGroupNames) {
    const groupTeams = groupMap.get(groupName)!;
    const groupMatches = matches.filter((m) => m.group === groupName);

    // Init stats per team
    const statsMap = new Map<string, Omit<GroupStanding, "team" | "qualified">>();
    for (const t of groupTeams) {
      statsMap.set(t.id, {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    // Accumulate from finished matches
    for (const m of groupMatches) {
      const home = statsMap.get(m.homeTeamId);
      const away = statsMap.get(m.awayTeamId);
      if (!home || !away || m.homeScore == null || m.awayScore == null) continue;

      home.played++;
      away.played++;
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (m.homeScore < m.awayScore) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += 1;
        away.points += 1;
      }
    }

    // Compute GD and sort: points > GD > GF
    const standings: GroupStanding[] = groupTeams.map((t) => {
      const s = statsMap.get(t.id)!;
      s.goalDifference = s.goalsFor - s.goalsAgainst;
      return {
        team: { id: t.id, name: t.name, code: t.code, flagUrl: t.flagUrl },
        ...s,
        qualified: false,
      };
    });

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Top 2 qualify
    if (standings.length >= 2) {
      standings[0].qualified = true;
      standings[1].qualified = true;
    }

    groups.push({ name: groupName, standings });
  }

  return groups;
}

// --- Knockout matches ---

async function getKnockoutMatches(stage: string): Promise<KnockoutMatch[]> {
  const matches = await prisma.match.findMany({
    where: { stage },
    orderBy: { kickoffTime: "asc" },
    select: {
      id: true,
      kickoffTime: true,
      stage: true,
      venue: true,
      status: true,
      homeTeam: { select: { name: true, code: true, flagUrl: true } },
      awayTeam: { select: { name: true, code: true, flagUrl: true } },
      homeScore: true,
      awayScore: true,
    },
  });

  return matches;
}
