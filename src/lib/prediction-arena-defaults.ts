export interface DefaultEvent {
  emoji: string;
  title: string;
  description: string;
}

export const DEFAULT_WEEKLY_EVENTS: DefaultEvent[] = [
  {
    emoji: "🟥",
    title: "First red card",
    description: "Which team gets the first red card of the week?",
  },
  {
    emoji: "⚽⚽⚽",
    title: "Hat-trick",
    description: "Will there be a hat-trick? Which team?",
  },
  {
    emoji: "🔄",
    title: "Comeback",
    description: "Will any team come back from behind?",
  },
  {
    emoji: "⏱️",
    title: "Latest goal",
    description: "Which team scores the latest goal of the week?",
  },
  {
    emoji: "🎯",
    title: "First penalty goal",
    description: "Which team converts the first penalty?",
  },
  {
    emoji: "🤦",
    title: "First own goal",
    description: "Which team concedes the first own goal?",
  },
];
