import { describe, it, expect } from "vitest";
import { DEFAULT_WEEKLY_EVENTS } from "./prediction-arena-defaults";
import { ARENA_EVENT_TYPES } from "./arena-resolution";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type DefaultsMessages = Record<string, { title: string; description: string }>;
function defaultsSection(messages: unknown): DefaultsMessages {
  return (messages as { arena: { defaults: DefaultsMessages } }).arena.defaults;
}

describe("DEFAULT_WEEKLY_EVENTS", () => {
  it("has 6 templates derived from the pool, with emoji and i18n key", () => {
    expect(DEFAULT_WEEKLY_EVENTS).toHaveLength(6);
    for (const e of DEFAULT_WEEKLY_EVENTS) {
      expect(e.emoji).toBeTruthy();
      expect(e.key).toBeTruthy();
    }
  });
});

describe("ARENA_EVENT_TYPES i18n", () => {
  it("every pool kind has title + description in BOTH en and es", () => {
    const enD = defaultsSection(en);
    const esD = defaultsSection(es);
    for (const t of ARENA_EVENT_TYPES) {
      expect(enD[t.i18nKey]?.title, `en title for ${t.i18nKey}`).toBeTruthy();
      expect(enD[t.i18nKey]?.description, `en desc for ${t.i18nKey}`).toBeTruthy();
      expect(esD[t.i18nKey]?.title, `es title for ${t.i18nKey}`).toBeTruthy();
      expect(esD[t.i18nKey]?.description, `es desc for ${t.i18nKey}`).toBeTruthy();
    }
  });

  it("en and es descriptions differ for every pool kind (real translations)", () => {
    const enD = defaultsSection(en);
    const esD = defaultsSection(es);
    const identical = ARENA_EVENT_TYPES.filter(
      (t) => enD[t.i18nKey]?.description === esD[t.i18nKey]?.description,
    );
    expect(identical.map((t) => t.i18nKey)).toEqual([]);
  });
});
