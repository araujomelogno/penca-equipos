"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");
  const [pending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale || pending) return;
    startTransition(() => {
      setLocale(next);
    });
  };

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    background: "transparent",
    border: "none",
    padding: "4px 6px",
    cursor: pending ? "wait" : "pointer",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    letterSpacing: 0.5,
    color: active ? "var(--color-accent-gold)" : "var(--color-accent-silver)",
    opacity: active ? 1 : 0.6,
    transition: "opacity 0.15s, color 0.15s",
  });

  return (
    <div
      className="flex items-center"
      aria-label={t("switchLanguage")}
      style={{ gap: 2 }}
    >
      <button
        type="button"
        onClick={() => change("en")}
        style={buttonStyle(locale === "en")}
        aria-pressed={locale === "en"}
        aria-label={t("languageEnglish")}
      >
        EN
      </button>
      <span style={{ color: "var(--color-border-light)", fontSize: 11 }}>|</span>
      <button
        type="button"
        onClick={() => change("es")}
        style={buttonStyle(locale === "es")}
        aria-pressed={locale === "es"}
        aria-label={t("languageSpanish")}
      >
        ES
      </button>
    </div>
  );
}
