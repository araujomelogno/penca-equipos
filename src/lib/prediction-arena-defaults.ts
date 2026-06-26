import { ARENA_EVENT_TYPES } from "@/lib/arena-resolution";

export interface DefaultEventTemplate {
  emoji: string;
  /** i18n key under `arena.defaults` (has `.title` and `.description`) */
  key: string;
}

// The classic 6 (first entries of the pool) — used by the admin "load defaults".
// The automated rollover uses the full pool + rotation instead.
export const DEFAULT_WEEKLY_EVENTS: DefaultEventTemplate[] = ARENA_EVENT_TYPES.slice(0, 6).map(
  (t) => ({ emoji: t.emoji, key: t.i18nKey }),
);
