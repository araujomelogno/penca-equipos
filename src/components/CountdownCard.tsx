"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function calcTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 900,
          color: "var(--color-accent-gold)",
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: "var(--color-text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 24,
        fontWeight: 900,
        color: "var(--color-text-muted)",
        paddingBottom: 16,
      }}
    >
      :
    </span>
  );
}

export function CountdownCard({ targetDate }: Props) {
  const t = useTranslations("home.countdown");
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div
      className="flex flex-col gap-4 rounded-xl"
      style={{
        background: "var(--color-bg-card)",
        padding: 20,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          color: "var(--color-text-muted)",
        }}
      >
        {t("title")}
      </span>

      <div className="flex items-center justify-center gap-3">
        <Unit value={timeLeft.days} label={t("days")} />
        <Separator />
        <Unit value={timeLeft.hours} label={t("hours")} />
        <Separator />
        <Unit value={timeLeft.minutes} label={t("minutes")} />
        <Separator />
        <Unit value={timeLeft.seconds} label={t("seconds")} />
      </div>
    </div>
  );
}
