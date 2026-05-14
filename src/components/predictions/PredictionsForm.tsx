"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PredictionsData } from "@/lib/queries/predictions";
import { GroupTabs } from "./GroupTabs";
import { ProgressCard } from "./ProgressCard";
import { GroupPredictionCard } from "./GroupPredictionCard";
import { FloatingBar } from "./FloatingBar";

interface ScoreState {
  homeScore: string;
  awayScore: string;
}

interface Props {
  data: PredictionsData;
}

function initScores(data: PredictionsData): Map<string, ScoreState> {
  const map = new Map<string, ScoreState>();
  for (const group of data.allGroups) {
    for (const match of group.matches) {
      map.set(match.id, {
        homeScore: match.prediction?.homeScore?.toString() ?? "",
        awayScore: match.prediction?.awayScore?.toString() ?? "",
      });
    }
  }
  return map;
}

function countDirty(
  current: Map<string, ScoreState>,
  original: Map<string, ScoreState>,
  allGroups: PredictionsData["allGroups"],
): number {
  let count = 0;
  for (const group of allGroups) {
    for (const match of group.matches) {
      if (match.hasStarted) continue;
      const cur = current.get(match.id);
      const orig = original.get(match.id);
      if (!cur || !orig) continue;
      // A prediction is "dirty" if any score field differs from original
      if (cur.homeScore !== orig.homeScore || cur.awayScore !== orig.awayScore) {
        count++;
      }
    }
  }
  return count;
}

/** Returns match IDs where only one score is filled (incomplete prediction) */
function getIncompleteMatchIds(
  current: Map<string, ScoreState>,
  original: Map<string, ScoreState>,
  allGroups: PredictionsData["allGroups"],
): Set<string> {
  const ids = new Set<string>();
  for (const group of allGroups) {
    for (const match of group.matches) {
      if (match.hasStarted) continue;
      const cur = current.get(match.id);
      const orig = original.get(match.id);
      if (!cur || !orig) continue;
      // Only flag if the match was modified AND has exactly one score filled
      const isDirty = cur.homeScore !== orig.homeScore || cur.awayScore !== orig.awayScore;
      if (!isDirty) continue;
      const hasHome = cur.homeScore !== "";
      const hasAway = cur.awayScore !== "";
      if (hasHome !== hasAway) ids.add(match.id);
    }
  }
  return ids;
}

function getDirtyPredictions(
  current: Map<string, ScoreState>,
  original: Map<string, ScoreState>,
  allGroups: PredictionsData["allGroups"],
): { matchId: string; homeScore: number; awayScore: number }[] {
  const result: { matchId: string; homeScore: number; awayScore: number }[] = [];
  for (const group of allGroups) {
    for (const match of group.matches) {
      if (match.hasStarted) continue;
      const cur = current.get(match.id);
      const orig = original.get(match.id);
      if (!cur || !orig) continue;
      if (cur.homeScore !== "" && cur.awayScore !== "") {
        if (cur.homeScore !== orig.homeScore || cur.awayScore !== orig.awayScore) {
          result.push({
            matchId: match.id,
            homeScore: parseInt(cur.homeScore, 10),
            awayScore: parseInt(cur.awayScore, 10),
          });
        }
      }
    }
  }
  return result;
}

export function PredictionsForm({ data }: Props) {
  const router = useRouter();
  const t = useTranslations("predictions");
  // Initialize with first individual tab (works for both mobile and desktop)
  // On desktop, clicking a grouped tab will select multiple groups
  const [activeGroups, setActiveGroups] = useState<string[]>(
    data.groupTabs[0]?.groups ?? data.individualTabs[0]?.groups ?? [],
  );
  const [scores, setScores] = useState(() => initScores(data));
  const [original, setOriginal] = useState(() => initScores(data));
  const [saving, setSaving] = useState(false);
  const [errorMatchIds, setErrorMatchIds] = useState<Set<string>>(new Set());
  const [savedMessage, setSavedMessage] = useState(false);

  const unsavedCount = countDirty(scores, original, data.allGroups);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsavedCount > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsavedCount]);

  // Dynamic progress: original completed + newly filled
  const liveCompleted = (() => {
    let count = data.progress.completed;
    for (const group of data.allGroups) {
      for (const match of group.matches) {
        if (match.hasStarted) continue;
        const cur = scores.get(match.id);
        const orig = original.get(match.id);
        if (!cur || !orig) continue;
        // Newly filled (was empty, now has both scores)
        if (
          (orig.homeScore === "" || orig.awayScore === "") &&
          cur.homeScore !== "" &&
          cur.awayScore !== ""
        ) {
          count++;
        }
      }
    }
    return count;
  })();

  const handleScoreChange = useCallback(
    (matchId: string, field: "homeScore" | "awayScore", value: string) => {
      // Only allow digits 0-20
      const cleaned = value.replace(/\D/g, "");
      const num = parseInt(cleaned, 10);
      if (cleaned !== "" && (isNaN(num) || num > 20)) return;

      setScores((prev) => {
        const next = new Map(prev);
        const current = next.get(matchId) ?? { homeScore: "", awayScore: "" };
        next.set(matchId, { ...current, [field]: cleaned });
        return next;
      });
      // Clear saved message and errors when user edits
      setSavedMessage(false);
      setErrorMatchIds((prev) => {
        if (!prev.has(matchId)) return prev;
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    },
    [],
  );

  const handleDiscard = useCallback(() => {
    setScores(initScores(data));
    setSavedMessage(false);
  }, [data]);

  const handleSave = useCallback(async () => {
    // Validate: no incomplete predictions (only one score filled)
    const incomplete = getIncompleteMatchIds(scores, original, data.allGroups);
    if (incomplete.size > 0) {
      setErrorMatchIds(incomplete);
      return;
    }
    setErrorMatchIds(new Set());

    const dirty = getDirtyPredictions(scores, original, data.allGroups);
    if (dirty.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/predictions/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: dirty }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t("errors.failed"));
        return;
      }

      const result = await res.json();
      if (result.errors?.length > 0) {
        alert(t("errors.partial", { saved: result.saved, failed: result.errors.length }));
      }

      if (result.saved > 0) {
        // Sync original to current scores so dirty count resets
        setOriginal(new Map(scores));
        setSavedMessage(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }, [scores, original, data.allGroups, router, t]);

  // Get active tab groups
  const visibleGroups = data.allGroups.filter((g) => activeGroups.includes(g.name));

  return (
    <>
      <div className="page-content">
          {/* Header: Title + Progress */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="page-title">{t("title")}</h1>
            <div className="sm:max-w-[300px] w-full">
              <ProgressCard
                completed={liveCompleted}
                total={data.progress.total}
              />
            </div>
          </div>

          {/* Group tabs */}
          <GroupTabs
            tabs={data.groupTabs}
            individualTabs={data.individualTabs}
            activeGroups={activeGroups}
            onSelect={setActiveGroups}
          />

          {/* Groups grid */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleGroups.map((group) => (
              <GroupPredictionCard
                key={group.name}
                groupName={group.name}
                matches={group.matches}
                scores={scores}
                errorMatchIds={errorMatchIds}
                onScoreChange={handleScoreChange}
              />
            ))}
          </div>
      </div>

      {/* Sticky save bar — always visible at bottom */}
      <FloatingBar
        unsavedCount={unsavedCount}
        saving={saving}
        hasErrors={errorMatchIds.size > 0}
        savedMessage={savedMessage}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
