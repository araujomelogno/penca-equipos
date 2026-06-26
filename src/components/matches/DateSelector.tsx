"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { DatePill } from "@/lib/queries/matches";

interface Props {
  pills: DatePill[];
  selectedDate?: string;
  baseHref: string;
  allMatchDates: string[];
}

interface MonthGroup {
  label: string;
  year: number;
  month: number;
  dates: string[];
}

function parseDate(dateStr: string): Date {
  // Interpret YYYY-MM-DD as local midnight so display matches user's TZ.
  return new Date(dateStr + "T00:00:00");
}

function groupByMonth(dates: string[], locale: string): MonthGroup[] {
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const map = new Map<string, string[]>();
  for (const d of dates) {
    const key = d.slice(0, 7);
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([key, dates]) => {
    const [y, m] = key.split("-").map(Number);
    const label = monthFormatter.format(new Date(y, m - 1, 1));
    return { label, year: y, month: m, dates };
  });
}

function CalendarMonth({
  group,
  weekdays,
  selectedDate,
  onSelect,
}: {
  group: MonthGroup;
  weekdays: string[];
  selectedDate?: string;
  onSelect: (date: string) => void;
}) {
  const matchDaySet = new Set(group.dates.map((d) => parseInt(d.slice(8), 10)));
  const firstDay = new Date(group.year, group.month - 1, 1).getDay();
  const daysInMonth = new Date(group.year, group.month, 0).getDate();

  const todayStr = new Intl.DateTimeFormat("en-CA").format(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex flex-col gap-2">
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: "var(--color-accent-amber)",
          letterSpacing: 1,
        }}
      >
        {group.label}
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {weekdays.map((d, i) => (
          <span
            key={i}
            style={{
              fontSize: 8,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              color: "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
              textAlign: "center",
              padding: "2px 0",
            }}
          >
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const dateStr = `${group.year}-${String(group.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasMatch = matchDaySet.has(day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;

          if (!hasMatch) {
            return (
              <span
                key={day}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "color-mix(in srgb, var(--color-text-primary) 8%, transparent)",
                  textAlign: "center",
                  padding: "4px 0",
                }}
              >
                {day}
              </span>
            );
          }

          return (
            <button
              key={day}
              onClick={() => onSelect(dateStr)}
              className="border-none cursor-pointer"
              style={{
                fontSize: 10,
                fontWeight: isSelected ? 900 : 600,
                fontFamily: "var(--font-body)",
                color: isSelected ? "var(--color-text-accent-dark)" : isToday ? "var(--color-accent-gold)" : "var(--color-text-primary)",
                background: isSelected ? "var(--color-accent-amber)" : "transparent",
                borderRadius: 6,
                padding: "4px 0",
                textAlign: "center",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateSelector({ pills, selectedDate, baseHref, allMatchDates }: Props) {
  const locale = useLocale();
  const t = useTranslations("matches");
  const [showCalendar, setShowCalendar] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!showCalendar) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCalendar]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short" }),
    [locale],
  );
  const pillMonth = (dateStr: string) =>
    monthFormatter.format(parseDate(dateStr)).replace(/\.$/, "").toUpperCase();

  const weekdays = t.raw("calendar.weekdays") as string[];

  const buildHref = (date: string) => {
    const separator = baseHref.includes("?") ? "&" : "?";
    return `${baseHref}${separator}date=${date}`;
  };

  // Clicking the active date toggles back to the "all matches" view.
  const handleDateSelect = (date: string) => {
    setShowCalendar(false);
    router.push(date === selectedDate ? buildHref("all") : buildHref(date));
  };

  const monthGroups = groupByMonth(allMatchDates, locale);

  return (
    <div className="flex items-center gap-3 relative">
      {pills.map((pill) => {
        const isSelected = pill.date === selectedDate;
        const href = buildHref(pill.date);

        return (
          <a
            key={pill.date}
            href={href}
            onClick={(e) => { e.preventDefault(); router.push(isSelected ? buildHref("all") : href); }}
            className="no-underline flex flex-col items-center"
            style={{
              width: isSelected ? 64 : 60,
              padding: "8px 4px",
              borderRadius: 12,
              background: isSelected ? "var(--color-accent-amber)" : "var(--color-bg-card-secondary)",
              border: isSelected
                ? "1px solid color-mix(in srgb, var(--color-accent-gold) 20%, transparent)"
                : "1px solid var(--color-border-subtle)",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: isSelected ? 900 : 700,
                fontFamily: "var(--font-body)",
                color: isSelected ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
                letterSpacing: 0.5,
              }}
            >
              {pill.isToday && isSelected ? t("today") : pillMonth(pill.date)}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                color: isSelected ? "var(--color-text-accent-dark)" : "var(--color-text-primary)",
              }}
            >
              {pill.dayOfMonth}
            </span>
          </a>
        );
      })}

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 32,
          background: "var(--color-border-light)",
          flexShrink: 0,
        }}
      />

      {/* Calendar button */}
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="border-none cursor-pointer flex items-center justify-center"
        style={{
          padding: 12,
          borderRadius: 12,
          background: showCalendar ? "var(--color-accent-amber)" : "var(--color-bg-card-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: showCalendar ? "var(--color-text-accent-dark)" : "var(--color-accent-gold)",
          }}
        >
          calendar_month
        </span>
      </button>

      {/* Calendar popup */}
      {showCalendar && (
        <div
          ref={popupRef}
          className="flex flex-col gap-4"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            padding: 20,
            borderRadius: 16,
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 50,
            minWidth: 240,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {monthGroups.map((g) => (
            <CalendarMonth
              key={g.label}
              group={g}
              weekdays={weekdays}
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
