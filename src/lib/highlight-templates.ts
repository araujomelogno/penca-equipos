import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

// --- Types ---

export type HighlightI18nKey =
  | "rank_change_up"
  | "rank_change_down"
  | "exact_score"
  | "day_leader"
  | "global_stat"
  | "streak"
  | "all_predicted"
  | "bold_call"
  | "lone_wolf";

export interface HighlightNugget {
  type: "rank_change" | "exact_score" | "streak" | "global_stat" | "day_leader" | "all_predicted" | "bold_call" | "lone_wolf";
  // New format: i18n key looked up at render time.
  i18nKey?: HighlightI18nKey;
  // Legacy format (pre-i18n migration): pre-baked English template.
  template?: string;
  data: Record<string, string | number>;
  entities: { users?: string[]; matches?: string[] };
  priority: number;
}

export interface ResolvedNugget {
  type: string;
  text: string;
  priority: number;
  matchIds: string[];
}

// --- Legacy template resolution (for nuggets stored before i18n migration) ---

function resolveLegacyTemplate(
  template: string,
  data: Record<string, string | number>,
  userMap: Map<string, string>,
  matchMap: Map<string, string>,
): string {
  let result = template.replace(/\{(\w+)\}/g, (full, key) => {
    if (key in data) return String(data[key]);
    return full;
  });
  result = result
    .replace(/\{user:([^}]+)\}/g, (_, id) => `**${userMap.get(id) ?? "Unknown"}**`)
    .replace(/\{match:([^}]+)\}/g, (_, id) => matchMap.get(id) ?? "Unknown match");
  return result;
}

// --- Batch resolution (i18n-aware) ---

export async function resolveNuggets(
  nuggets: HighlightNugget[],
): Promise<ResolvedNugget[]> {
  const t = await getTranslations("highlights");

  // Collect all entity IDs
  const userIds = new Set<string>();
  const matchIds = new Set<string>();
  for (const n of nuggets) {
    for (const id of n.entities.users ?? []) userIds.add(id);
    for (const id of n.entities.matches ?? []) matchIds.add(id);
  }

  // Batch fetch
  const [users, matches] = await Promise.all([
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, nickname: true },
        })
      : [],
    matchIds.size > 0
      ? prisma.match.findMany({
          where: { id: { in: [...matchIds] } },
          select: {
            id: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.nickname]));
  const matchMap = new Map(
    matches.map((m) => [m.id, `${m.homeTeam.name} vs ${m.awayTeam.name}`]),
  );

  return nuggets
    .map((n) => {
      let text: string;
      if (n.i18nKey) {
        const entityUsers = n.entities.users ?? [];
        const entityMatches = n.entities.matches ?? [];
        const userName = entityUsers[0] ? `**${userMap.get(entityUsers[0]) ?? "Unknown"}**` : "";
        const usersJoined = entityUsers
          .map((id) => `**${userMap.get(id) ?? "Unknown"}**`)
          .join(", ");
        const matchName = entityMatches[0] ? matchMap.get(entityMatches[0]) ?? "Unknown match" : "";
        text = t(n.i18nKey, {
          ...n.data,
          user: userName,
          users: usersJoined,
          match: matchName,
        });
      } else if (n.template) {
        text = resolveLegacyTemplate(n.template, n.data, userMap, matchMap);
      } else {
        text = "";
      }
      return {
        type: n.type,
        text,
        priority: n.priority,
        matchIds: n.entities.matches ?? [],
      };
    })
    .sort((a, b) => b.priority - a.priority);
}
