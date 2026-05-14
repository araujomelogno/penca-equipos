"use client";

import { useEffect, useState } from "react";

function formatKickoff(date: Date, timeOnly: boolean): string {
  if (timeOnly) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function KickoffTime({ date, timeOnly = false }: { date: string; timeOnly?: boolean }) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatKickoff(new Date(date), timeOnly));
  }, [date, timeOnly]);

  return <>{text}</>;
}
