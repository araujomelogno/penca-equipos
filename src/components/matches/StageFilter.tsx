"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StageTab } from "@/lib/queries/matches";

interface CurrentParams {
  date?: string;
  stage: string;
  status: string;
}

interface Props {
  stages: StageTab[];
  activeStage: string;
  currentParams: CurrentParams;
}

function buildHrefFor(current: CurrentParams, override: Partial<CurrentParams>): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  if (merged.date) params.set("date", merged.date);
  if (merged.stage && merged.stage !== "ALL") params.set("stage", merged.stage);
  if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
  const qs = params.toString();
  return `/matches${qs ? `?${qs}` : ""}`;
}

type KnockoutKey = "R32" | "R16" | "QF" | "SF" | "FINAL";
const KNOCKOUT_KEYS: readonly KnockoutKey[] = ["R32", "R16", "QF", "SF", "FINAL"];

export function StageFilter({ stages, activeStage, currentParams }: Props) {
  const t = useTranslations("matches.stageFilter");
  const tStage = useTranslations("matches.stage");
  const buildHref = (stage: string) => buildHrefFor(currentParams, { stage });

  const fullLabel = (stage: StageTab): string => {
    if (stage.value === "ALL") return t("all");
    if (stage.value.startsWith("GROUP_")) {
      return t("group", { letter: stage.value.replace("GROUP_", "") });
    }
    if ((KNOCKOUT_KEYS as readonly string[]).includes(stage.value)) {
      return tStage(stage.value as KnockoutKey);
    }
    return stage.label;
  };

  const shortLabel = (stage: StageTab): string => {
    if (stage.value === "ALL") return t("allShort");
    if (stage.value.startsWith("GROUP_")) {
      return t("groupShort", { letter: stage.value.replace("GROUP_", "") });
    }
    if ((KNOCKOUT_KEYS as readonly string[]).includes(stage.value)) {
      return tStage(stage.value as KnockoutKey);
    }
    return stage.label;
  };

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden sm:flex items-center gap-6 overflow-x-auto"
        style={{
          paddingBottom: 12,
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        {stages.map((stage) => {
          const isActive = stage.value === activeStage;
          return (
            <Link
              key={stage.value}
              href={buildHref(stage.value)}
              className="no-underline whitespace-nowrap"
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 2,
                color: isActive ? "var(--color-accent-gold)" : "var(--color-text-secondary)",
                textDecoration: "none",
              }}
            >
              {fullLabel(stage)}
            </Link>
          );
        })}
      </div>

      {/* Mobile: compact pills */}
      <div
        className="flex sm:hidden items-center gap-1.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {stages.map((stage) => {
          const isActive = stage.value === activeStage;
          return (
            <Link
              key={stage.value}
              href={buildHref(stage.value)}
              className="no-underline shrink-0"
              style={{
                padding: "6px 16px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: isActive ? 900 : 700,
                fontFamily: "var(--font-body)",
                background: isActive ? "var(--color-accent-gold)" : "var(--color-bg-card)",
                color: isActive ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
                textDecoration: "none",
              }}
            >
              {shortLabel(stage)}
            </Link>
          );
        })}
      </div>
    </>
  );
}
