/**
 * Default weekly event templates for the Prediction Arena.
 *
 * Text lives in messages/en.json + es.json under `arena.defaults.{key}` so
 * the admin's "load defaults" materializes titles/descriptions in the
 * installation's language before saving them to the DB (each installation
 * is monolingual — DEFAULT_LOCALE).
 */
export interface DefaultEventTemplate {
  emoji: string;
  /** i18n key under `arena.defaults` (has `.title` and `.description`) */
  key: string;
}

export const DEFAULT_WEEKLY_EVENTS: DefaultEventTemplate[] = [
  { emoji: "🟥", key: "firstRedCard" },
  { emoji: "⚽⚽⚽", key: "hatTrick" },
  { emoji: "🔄", key: "comeback" },
  { emoji: "⏱️", key: "latestGoal" },
  { emoji: "🎯", key: "firstPenaltyGoal" },
  { emoji: "🤦", key: "firstOwnGoal" },
];
