import { describe, it, expect } from "vitest";
import { DEFAULT_WEEKLY_EVENTS } from "./prediction-arena-defaults";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type DefaultsMessages = Record<string, { title: string; description: string }>;

function defaultsSection(messages: unknown): DefaultsMessages {
  return (messages as { arena: { defaults: DefaultsMessages } }).arena.defaults;
}

describe("DEFAULT_WEEKLY_EVENTS", () => {
  it("has 6 templates with emoji and i18n key (no hardcoded text)", () => {
    expect(DEFAULT_WEEKLY_EVENTS).toHaveLength(6);
    for (const e of DEFAULT_WEEKLY_EVENTS) {
      expect(e.emoji).toBeTruthy();
      expect(e.key).toBeTruthy();
    }
  });

  it("every template key has title and description in BOTH en and es", () => {
    const enDefaults = defaultsSection(en);
    const esDefaults = defaultsSection(es);

    for (const e of DEFAULT_WEEKLY_EVENTS) {
      expect(enDefaults[e.key]?.title, `en title for ${e.key}`).toBeTruthy();
      expect(enDefaults[e.key]?.description, `en description for ${e.key}`).toBeTruthy();
      expect(esDefaults[e.key]?.title, `es title for ${e.key}`).toBeTruthy();
      expect(esDefaults[e.key]?.description, `es description for ${e.key}`).toBeTruthy();
    }
  });

  it("en and es defaults differ (actual translations, not copies)", () => {
    const enDefaults = defaultsSection(en);
    const esDefaults = defaultsSection(es);

    const identical = DEFAULT_WEEKLY_EVENTS.filter(
      (e) => enDefaults[e.key]?.description === esDefaults[e.key]?.description,
    );
    expect(identical, `untranslated keys: ${identical.map((e) => e.key).join(", ")}`).toHaveLength(0);
  });
});
