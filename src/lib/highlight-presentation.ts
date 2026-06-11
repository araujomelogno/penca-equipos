/**
 * Shared presentation mapping for highlight nuggets (icon + color per type).
 * Single source of truth for HighlightsCard (home) and HighlightsNuggetList
 * (activity) — was duplicated in both components.
 */

const ICON_MAP: Record<string, string> = {
  rank_change: "trending_up",
  exact_score: "target",
  streak: "local_fire_department",
  global_stat: "groups",
  day_leader: "emoji_events",
  all_predicted: "task_alt",
  bold_call: "casino",
  lone_wolf: "person_alert",
};

const COLOR_MAP: Record<string, string> = {
  rank_change: "var(--color-accent-purple)",
  exact_score: "var(--color-accent-amber)",
  streak: "var(--color-accent-orange)",
  global_stat: "var(--color-accent-blue)",
  day_leader: "var(--color-accent-amber)",
  all_predicted: "var(--color-success)",
  bold_call: "var(--color-accent-pink)",
  lone_wolf: "var(--color-accent-violet)",
};

export const HIGHLIGHT_TYPES = Object.keys(ICON_MAP);

export function highlightIcon(type: string): string {
  return ICON_MAP[type] ?? "info";
}

export function highlightColor(type: string): string {
  return COLOR_MAP[type] ?? "var(--color-text-secondary)";
}
