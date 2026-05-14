"use client";

import type { GroupTabRange } from "@/lib/groupTabs";

interface Props {
  tabs: GroupTabRange[];
  individualTabs: GroupTabRange[];
  activeGroups: string[];
  onSelect: (groups: string[]) => void;
}

function TabPill({
  tab,
  isActive,
  onClick,
}: {
  tab: GroupTabRange;
  isActive: boolean;
  onClick: () => void;
}) {
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
      {tab.label}
    </button>
  );
}

function isMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((g) => b.includes(g));
}

export function GroupTabs({ tabs, individualTabs, activeGroups, onSelect }: Props) {
  // Find active index in each tab set
  // For grouped tabs, also match if activeGroups is a subset (e.g. ["A"] matches ["A","B","C"])
  const groupedIndex = tabs.findIndex(
    (t) => isMatch(t.groups, activeGroups) || activeGroups.every((g) => t.groups.includes(g)),
  );
  const individualIndex = individualTabs.findIndex(
    (t) => isMatch(t.groups, activeGroups) || t.groups.every((g) => activeGroups.includes(g)),
  );

  // When clicking a tab from one set, also works for the other because
  // activeGroups is the source of truth and both sets derive from it.
  // If activeGroups matches grouped but not individual (or vice versa),
  // the non-matching set shows no active tab — which is fine since it's hidden.

  return (
    <>
      {/* Desktop: grouped tabs (A-C, D-F...) */}
      <div className="hidden md:flex items-center gap-1.5">
        {tabs.map((tab, i) => (
          <TabPill
            key={tab.label}
            tab={tab}
            isActive={i === groupedIndex}
            onClick={() => onSelect(tab.groups)}
          />
        ))}
      </div>

      {/* Mobile: individual tabs (A, B, C...) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {individualTabs.map((tab, i) => (
          <TabPill
            key={tab.label}
            tab={tab}
            isActive={i === individualIndex}
            onClick={() => onSelect(tab.groups)}
          />
        ))}
      </div>
    </>
  );
}
