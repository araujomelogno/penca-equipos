"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface CurrentParams {
  date?: string;
  stage: string;
  status: string;
}

interface Props {
  activeStatus: string;
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

export function StatusFilter({ activeStatus, currentParams }: Props) {
  const t = useTranslations("matches.status");
  const buildHref = (status: string) => buildHrefFor(currentParams, { status });
  const statuses = [
    { value: "ALL", label: t("all"), dot: false },
    { value: "SCHEDULED", label: t("upcoming"), dot: false },
    { value: "ONGOING", label: t("ongoing"), dot: true },
    { value: "FINISHED", label: t("finished"), dot: false },
  ];

  return (
    <div className="flex items-center gap-2">
      {statuses.map((s) => {
        const isActive = s.value === activeStatus;
        return (
          <Link
            key={s.value}
            href={buildHref(s.value)}
            className="no-underline flex items-center"
            style={{
              padding: "6px 16px",
              borderRadius: 100,
              gap: 8,
              fontSize: 11,
              fontWeight: isActive ? 900 : 700,
              fontFamily: "var(--font-body)",
              letterSpacing: 1.5,
              textDecoration: "none",
              background: isActive ? "var(--color-accent-gold)" : "var(--color-bg-card)",
              color: isActive ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
            }}
          >
            {s.dot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isActive ? "var(--color-text-accent-dark)" : "var(--color-accent-amber-dark)",
                  flexShrink: 0,
                }}
              />
            )}
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
