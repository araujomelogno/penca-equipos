"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GroupData } from "@/lib/queries/fixtures";
import { GroupCard } from "./GroupCard";

interface Props {
  groups: GroupData[];
}

export function GroupGrid({ groups }: Props) {
  const t = useTranslations("standings");
  const groupNames = groups.map((g) => g.name);
  // null = "All" (show all groups)
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  if (groups.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: "48px 24px",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}
      >
        {t("emptyGroups")}
      </div>
    );
  }

  const mobileGroups = activeGroup
    ? groups.filter((g) => g.name === activeGroup)
    : groups;

  return (
    <div className="flex flex-col gap-6">
      {/* Group tabs (mobile only) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <TabPill label={t("all")} isActive={activeGroup === null} onClick={() => setActiveGroup(null)} />
        {groupNames.map((g) => (
          <TabPill key={g} label={g} isActive={activeGroup === g} onClick={() => setActiveGroup(g)} />
        ))}
      </div>

      {/* Desktop: all groups */}
      <div className="hidden md:grid gap-6 grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <GroupCard
            key={g.name}
            groupName={g.name}
            standings={g.standings}
            groupLabel={t("groupLabel", { name: g.name })}
            teamLabel={t("columnTeam")}
          />
        ))}
      </div>

      {/* Mobile: filtered groups */}
      <div className="grid md:hidden gap-6 grid-cols-1">
        {mobileGroups.map((g) => (
          <GroupCard
            key={g.name}
            groupName={g.name}
            standings={g.standings}
            groupLabel={t("groupLabel", { name: g.name })}
            teamLabel={t("columnTeam")}
          />
        ))}
      </div>
    </div>
  );
}

function TabPill({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-none cursor-pointer shrink-0"
      style={{
        padding: "6px 16px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: isActive ? 900 : 700,
        fontFamily: "var(--font-body)",
        background: isActive ? "var(--color-accent-gold)" : "var(--color-bg-card)",
        color: isActive ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
