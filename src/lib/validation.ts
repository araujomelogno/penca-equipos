/** Shared validation patterns and rules used across API routes. */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NICKNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const MIN_PASSWORD_LENGTH = 6;
export const MIN_NICKNAME_LENGTH = 3;
export const MAX_SCORE = 20;
export const MAX_COMMENT_LENGTH = 500;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidNickname(nickname: string): boolean {
  return NICKNAME_REGEX.test(nickname) && nickname.length >= MIN_NICKNAME_LENGTH;
}

export function isValidScore(score: unknown): score is number {
  return typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= MAX_SCORE;
}

/** Validate that an imageUrl is a local upload path (prevents external/malicious URLs). */
export function parseImageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value.startsWith("/uploads/")) return value;
  return undefined;
}
