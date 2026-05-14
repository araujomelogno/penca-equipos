import { getTranslations } from "next-intl/server";

/**
 * Returns a translator scoped to a namespace, using the locale from the
 * current request's cookie. Use inside API route handlers.
 */
export async function apiT(namespace: string) {
  return getTranslations(namespace);
}
