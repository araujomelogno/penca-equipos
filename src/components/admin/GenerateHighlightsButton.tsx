"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function GenerateHighlightsButton() {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/highlights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ text: data.error ?? t("highlightsError"), ok: false });
      } else if (data.generated) {
        setResult({
          text: data.updated
            ? t("highlightsUpdated", { n: data.count })
            : t("highlightsGenerated", { n: data.count }),
          ok: true,
        });
      } else {
        setResult({ text: t("highlightsNone", { reason: data.reason }), ok: false });
      }
    } catch {
      setResult({ text: t("highlightsNetworkError"), ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2"
        style={{
          borderRadius: 12,
          padding: "10px 20px",
          border: "1px solid var(--color-border-light)",
          background: "transparent",
          color: "var(--color-text-secondary)",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color: "var(--color-text-secondary)" }}
        >
          auto_awesome
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {loading ? t("generating") : t("generateHighlights")}
        </span>
      </button>
      {result && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            color: result.ok ? "var(--color-success)" : "var(--color-error-soft)",
          }}
        >
          {result.text}
        </span>
      )}
    </div>
  );
}
