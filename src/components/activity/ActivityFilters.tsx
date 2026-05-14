"use client";

import { useTranslations } from "next-intl";

export type FilterType = "all" | "comments" | "events";

interface Props {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export function ActivityFilters({ active, onChange }: Props) {
  const t = useTranslations("activity.filters");
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "comments", label: t("comments") },
    { value: "events", label: t("events") },
  ];

  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => {
        const isActive = f.value === active;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className="select-none transition-colors"
            style={{
              borderRadius: 100,
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: isActive ? 900 : 700,
              fontFamily: "Inter, sans-serif",
              background: isActive ? "#ffe19e" : "#2a2646",
              color: isActive ? "#3e2e00" : "#d0c5b2",
              border: "none",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
