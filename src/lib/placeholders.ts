/** Rotating placeholder phrases for chat/comment inputs. */
const CHAT_PLACEHOLDERS = [
  "Drop your hot take...",
  "What's your call?",
  "Go on, say it...",
  "Talk your talk...",
  "Brave enough to predict?",
  "Stir the pot...",
  "Your move, pundit...",
  "What say you?",
  "Call it like you see it...",
  "Sound off...",
];

const REPLY_PLACEHOLDERS = [
  "Fire back...",
  "Your turn...",
  "Agree? Disagree? Say it.",
  "Go on...",
  "Let them hear it...",
  "Clap back...",
];

export function getChatPlaceholder(): string {
  return CHAT_PLACEHOLDERS[Math.floor(Math.random() * CHAT_PLACEHOLDERS.length)];
}

export function getReplyPlaceholder(): string {
  return REPLY_PLACEHOLDERS[Math.floor(Math.random() * REPLY_PLACEHOLDERS.length)];
}
