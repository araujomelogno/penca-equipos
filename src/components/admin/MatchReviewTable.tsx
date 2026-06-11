"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchField } from "./SearchField";
import { Pagination } from "./Pagination";

interface MatchRow {
  id: string;
  kickoffTime: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scoreSource: string | null;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
}

interface PageData {
  matches: MatchRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface EditedScore {
  homeScore: string;
  awayScore: string;
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span style={{ width: 80, textAlign: "center", display: "block" }}>—</span>;

  const styles: Record<string, { bg: string; color: string; border: string }> = {
    API: { bg: "color-mix(in srgb, var(--color-accent-green) 20%, transparent)", color: "var(--color-success)", border: "color-mix(in srgb, var(--color-accent-green) 30%, transparent)" },
    MANUAL: { bg: "color-mix(in srgb, var(--color-accent-amber) 10%, transparent)", color: "var(--color-text-accent)", border: "color-mix(in srgb, var(--color-accent-amber) 20%, transparent)" },
    FAILED: { bg: "color-mix(in srgb, var(--color-error-soft) 10%, transparent)", color: "var(--color-error-soft)", border: "color-mix(in srgb, var(--color-error-soft) 20%, transparent)" },
  };

  const s = styles[source] || styles.API;

  return (
    <div
      className="flex justify-center"
      style={{
        width: 80,
        borderRadius: 100,
        background: s.bg,
        padding: "4px 10px",
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: s.color }}>
        {source}
      </span>
    </div>
  );
}

export function MatchReviewTable() {
  const [data, setData] = useState<PageData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<string, EditedScore>>({});
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async (s: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    params.set("page", String(p));
    const res = await fetch(`/api/admin/matches?${params}`);
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetchData(search, page);
  }, [fetchData, search, page]);

  const handleScoreChange = (matchId: string, field: "homeScore" | "awayScore", value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setEdits((prev) => ({
      ...prev,
      [matchId]: {
        homeScore: field === "homeScore" ? value : (prev[matchId]?.homeScore ?? ""),
        awayScore: field === "awayScore" ? value : (prev[matchId]?.awayScore ?? ""),
      },
    }));
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/matches/sync", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Synced ${result.updated} matches, ${result.recalculated} predictions recalculated` });
        setEdits({});
        fetchData(search, page);
      } else {
        setMessage({ type: "error", text: result.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    const scores = Object.entries(edits)
      .filter(([, v]) => v.homeScore !== "" && v.awayScore !== "")
      .map(([matchId, v]) => ({
        matchId,
        homeScore: parseInt(v.homeScore, 10),
        awayScore: parseInt(v.awayScore, 10),
      }));

    if (scores.length === 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/matches/scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Saved ${result.updated} scores, ${result.recalculated} predictions recalculated` });
        setEdits({});
        fetchData(search, page);
      } else {
        setMessage({ type: "error", text: result.error || "Save failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const hasEdits = Object.values(edits).some((v) => v.homeScore !== "" || v.awayScore !== "");

  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="page-title">Match Review</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary flex-1 sm:flex-none"
            style={{ borderRadius: 12, padding: "10px 16px", opacity: syncing ? 0.6 : 1 }}
          >
            <span className="material-symbols-outlined hidden sm:inline" style={{ fontSize: 16 }}>sync</span>
            {syncing ? "Syncing..." : "Sync Scores"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasEdits}
            className="btn-primary flex-1 sm:flex-none"
            style={{ padding: "10px 16px" }}
          >
            <span className="material-symbols-outlined hidden sm:inline" style={{ fontSize: 16 }}>save</span>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: message.type === "success" ? "color-mix(in srgb, var(--color-accent-green) 10%, transparent)" : "color-mix(in srgb, var(--color-error) 10%, transparent)",
            color: message.type === "success" ? "var(--color-success)" : "var(--color-error-soft)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          borderRadius: 16,
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Search */}
        <div
          className="flex items-center"
          style={{ background: "var(--color-bg-card-secondary)", padding: "12px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <SearchField value={search} onChange={handleSearchChange} placeholder="Search matches..." width={220} />
        </div>

        {/* Table header (desktop only) */}
        <div
          className="hidden sm:flex items-center"
          style={{ background: "var(--color-bg-card-secondary)", padding: "14px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <span style={{ ...thStyle, width: 120 }}>DATE</span>
          <span className="flex-1" style={thStyle}>MATCH</span>
          <span style={{ ...thStyle, width: 60, textAlign: "center" }}>HOME</span>
          <span style={{ ...thStyle, width: 60, textAlign: "center" }}>AWAY</span>
          <span style={{ ...thStyle, width: 80, textAlign: "center" }}>SOURCE</span>
          <span style={{ ...thStyle, width: 80, textAlign: "center" }}>ACTIONS</span>
        </div>

        {/* Rows */}
        {data.matches.map((match) => {
          const edited = edits[match.id];
          const isFailed = match.scoreSource === "FAILED";
          const isEdited = !!edited;

          const displayHome = edited?.homeScore ?? (match.homeScore !== null ? String(match.homeScore) : "");
          const displayAway = edited?.awayScore ?? (match.awayScore !== null ? String(match.awayScore) : "");

          const inputBorder = isFailed
            ? "color-mix(in srgb, var(--color-error) 40%, transparent)"
            : isEdited
              ? "color-mix(in srgb, var(--color-accent-gold) 20%, transparent)"
              : "var(--color-border-subtle)";

          const inputColor = isFailed
            ? "var(--color-error)"
            : "var(--color-text-accent)";

          const scoreInput = (field: "homeScore" | "awayScore", value: string) => (
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => handleScoreChange(match.id, field, e.target.value)}
              style={{
                width: 48,
                height: 32,
                borderRadius: 8,
                background: "var(--color-bg-input)",
                border: `1px solid ${inputBorder}`,
                color: inputColor,
                textAlign: "center",
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 900,
                outline: "none",
              }}
            />
          );

          return (
            <div key={match.id}>
              {/* Desktop row */}
              <div
                className="hidden sm:flex items-center"
                style={{
                  padding: "14px 24px",
                  borderBottom: "1px solid var(--color-border-faint)",
                  background: isFailed ? "color-mix(in srgb, var(--color-error) 5%, transparent)" : "transparent",
                }}
              >
                <span style={{ width: 120, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", fontFamily: "Inter, sans-serif" }}>
                  {new Date(match.kickoffTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>

                <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "Inter, sans-serif" }}>
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </span>

                <div style={{ width: 60, display: "flex", justifyContent: "center" }}>
                  {scoreInput("homeScore", displayHome)}
                </div>

                <div style={{ width: 60, display: "flex", justifyContent: "center" }}>
                  {scoreInput("awayScore", displayAway)}
                </div>

                <div style={{ width: 80, display: "flex", justifyContent: "center" }}>
                  <SourceBadge source={match.scoreSource} />
                </div>

                <div style={{ width: 80, display: "flex", justifyContent: "center" }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, color: isFailed ? "var(--color-error)" : "var(--color-text-muted)" }}
                  >
                    edit
                  </span>
                </div>
              </div>

              {/* Mobile row */}
              <div
                className="flex sm:hidden flex-col gap-2"
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--color-border-faint)",
                  background: isFailed ? "color-mix(in srgb, var(--color-error) 5%, transparent)" : "transparent",
                }}
              >
                {/* Match name + date */}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "Inter, sans-serif" }}>
                    {match.homeTeam.code} vs {match.awayTeam.code}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", fontFamily: "Inter, sans-serif" }}>
                    {new Date(match.kickoffTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                {/* Score inputs + source */}
                <div className="flex items-center gap-2">
                  {scoreInput("homeScore", displayHome)}
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>–</span>
                  {scoreInput("awayScore", displayAway)}
                  <div className="flex-1" />
                  <SourceBadge source={match.scoreSource} />
                </div>
              </div>
            </div>
          );
        })}

        {data.matches.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            No matches found
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: "var(--color-text-muted)",
  fontFamily: "Inter, sans-serif",
};
