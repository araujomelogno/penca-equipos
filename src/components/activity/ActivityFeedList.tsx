"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ActivityItemRow, type ActivityItemData } from "./ActivityItemRow";
import { ActivityFilters, type FilterType } from "./ActivityFilters";
import { HomeComposer } from "./HomeComposer";

interface Props {
  initialItems: ActivityItemData[];
  initialNextCursor: string | null;
  currentUserId: string;
}

export function ActivityFeedList({
  initialItems,
  initialNextCursor,
  currentUserId,
}: Props) {
  const t = useTranslations("activity");
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(
    async (type: FilterType, cursor?: string) => {
      const params = new URLSearchParams();
      if (type !== "all") params.set("type", type);
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();
      const res = await fetch(`/api/activity${qs ? `?${qs}` : ""}`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        items: ActivityItemData[];
        nextCursor: string | null;
      }>;
    },
    [],
  );

  const handleFilterChange = async (newFilter: FilterType) => {
    setFilter(newFilter);
    setLoading(true);
    try {
      const data = await fetchItems(newFilter);
      if (data) {
        setItems(data.items);
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const data = await fetchItems(filter, nextCursor);
      if (data) {
        setItems((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePosted = async () => {
    const data = await fetchItems(filter);
    if (data) {
      setItems(data.items);
      setNextCursor(data.nextCursor);
    }
  };

  return (
    <div className="page-content">
      {/* Title + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title" style={{ marginBottom: 0 }}>{t("title")}</h1>
        <ActivityFilters active={filter} onChange={handleFilterChange} />
      </div>

      {/* Composer */}
      <HomeComposer onPosted={handlePosted} />

      {/* Feed */}
      {items.length === 0 ? (
        <div
          style={{
            borderRadius: 16,
            background: "#2a2646",
            border: "1px solid #FFFFFF0D",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            {loading ? t("loading") : t("empty")}
          </p>
        </div>
      ) : (
        <div
          style={{
            borderRadius: 16,
            background: "#2a2646",
            border: "1px solid #FFFFFF0D",
            overflow: "hidden",
          }}
          className="flex flex-col"
        >
          {items.map((item, i) => (
            <div key={`${item.type}-${item.id}`}>
              {i > 0 && <div style={{ height: 1, background: "#FFFFFF0D" }} />}
              <ActivityItemRow
                item={item}
                currentUserId={currentUserId}
                onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
              />
            </div>
          ))}

          {/* Load more */}
          {nextCursor && (
            <>
              <div style={{ height: 1, background: "#FFFFFF0D" }} />
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full transition-colors hover:bg-white/[0.02]"
                style={{
                  padding: "20px 24px",
                  border: "none",
                  background: "transparent",
                  cursor: loading ? "default" : "pointer",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: 16, color: "#d0c5b2" }}
                >
                  keyboard_arrow_down
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#d0c5b2",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {loading ? t("loading") : t("loadMore")}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
