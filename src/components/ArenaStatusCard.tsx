import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

export async function ArenaStatusCard() {
  const t = await getTranslations("home.arenaStatus");
  // Find the most recent non-resolved arena
  const arena = await prisma.weeklyHitsWeek.findFirst({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    orderBy: { weekStart: "desc" },
    select: { id: true, weekNumber: true, status: true, deadline: true },
  });

  if (!arena) return null;

  const now = new Date();
  const deadline = new Date(arena.deadline);
  const isOpen = arena.status === "OPEN" && now < deadline;
  const isInPlay = arena.status === "OPEN" && now >= deadline || arena.status === "CLOSED";

  // Countdown
  const diff = deadline.getTime() - now.getTime();
  const hours = Math.max(0, Math.floor(diff / 3_600_000));
  const days = Math.floor(hours / 24);
  const countdownText = diff <= 0
    ? null
    : days > 0
      ? `${days}d ${hours % 24}h`
      : `${hours}h`;

  return (
    <Link
      href="/prediction-arena"
      style={{
        display: "block",
        padding: 20,
        borderRadius: 16,
        background: isOpen
          ? "var(--gradient-arena)"
          : "var(--color-bg-card)",
        border: isOpen
          ? "1px solid color-mix(in srgb, var(--color-accent-gold) 13%, transparent)"
          : "1px solid transparent",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>
          {isOpen ? "🏛️" : "⚔️"}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
            color: isOpen ? "var(--color-accent-gold)" : "var(--color-text-muted)",
          }}>
            {isOpen ? t("open") : t("inPlay")}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {t("week", { week: arena.weekNumber })}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        {isOpen ? (
          <span className="flex items-center gap-1">
            {countdownText && hours < 3 && (
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-accent-gold)" }}>warning</span>
            )}
            <span>
              {countdownText ? t("predictWithin", { countdown: countdownText }) : t("lastChance")}
            </span>
          </span>
        ) : isInPlay ? (
          <span>{t("resolving")}</span>
        ) : null}
      </div>

      <div style={{
        marginTop: 10,
        fontSize: 11,
        fontWeight: 700,
        color: isOpen ? "var(--color-accent-gold)" : "var(--color-text-muted)",
      }}>
        {isOpen ? t("goPredict") : t("viewStatus")}
      </div>
    </Link>
  );
}
