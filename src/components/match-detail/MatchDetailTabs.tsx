"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  discussion: React.ReactNode;
  matchInfo: React.ReactNode;
}

export function MatchDetailTabs({ discussion, matchInfo }: Props) {
  const t = useTranslations("matches.detail.tabs");
  const [tab, setTab] = useState<"discussion" | "info">("info");

  const tabs = [
    { value: "info" as const, label: t("info") },
    { value: "discussion" as const, label: t("discussion") },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 lg:hidden">
      {/* Tab bar */}
      <div
        className="flex"
        style={{
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-card)",
          borderRadius: "12px 12px 0 0",
        }}
      >
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className="flex-1 border-none cursor-pointer"
            style={{
              padding: "12px 0",
              fontSize: 13,
              fontWeight: tab === value ? 800 : 600,
              fontFamily: "var(--font-body)",
              color: tab === value ? "var(--color-accent-gold)" : "var(--color-text-muted)",
              background: "transparent",
              borderBottom: tab === value ? "2px solid var(--color-accent-gold)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "discussion" ? discussion : matchInfo}
      </div>
    </div>
  );
}
