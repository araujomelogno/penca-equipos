import { getTranslations } from "next-intl/server";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "@/lib/queries/constants";
import {
  POINTS_HAPPENED_CORRECT_TEAM,
  POINTS_HAPPENED_WRONG_TEAM,
  POINTS_NO_HAPPEN,
} from "@/lib/prediction-arena-scoring";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 800,
        fontStyle: "italic",
        letterSpacing: -0.5,
        color: "var(--color-text-primary)",
      }}
    >
      {children}
    </h2>
  );
}

interface Tier {
  points: number;
  label: string;
  desc: string;
  example: string;
  color: string;
}

export default async function Page() {
  const t = await getTranslations("rules");

  const tiers: Tier[] = [
    {
      points: POINTS_EXACT,
      label: t("penca.exact.label"),
      desc: t("penca.exact.desc"),
      example: t("penca.exact.example"),
      color: "var(--color-accent-gold)",
    },
    {
      points: POINTS_CORRECT_WINNER,
      label: t("penca.winner.label"),
      desc: t("penca.winner.desc"),
      example: t("penca.winner.example"),
      color: "var(--color-success)",
    },
    {
      points: 0,
      label: t("penca.miss.label"),
      desc: t("penca.miss.desc"),
      example: t("penca.miss.example"),
      color: "var(--color-text-muted)",
    },
  ];

  const notes = [
    { title: t("penca.deadline.title"), desc: t("penca.deadline.desc") },
    { title: t("penca.knockout.title"), desc: t("penca.knockout.desc") },
  ];

  const arenaScoring = [
    { points: POINTS_HAPPENED_CORRECT_TEAM, label: t("arena.scoring.exact") },
    { points: POINTS_HAPPENED_WRONG_TEAM, label: t("arena.scoring.wrongTeam") },
    { points: POINTS_NO_HAPPEN, label: t("arena.scoring.noHappen") },
    { points: 0, label: t("arena.scoring.miss") },
  ];

  return (
    <div className="page-content" style={{ maxWidth: 880 }}>
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{t("title")}</h1>
        <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
          {t("intro")}
        </p>
      </div>

      {/* ── La Penca ── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <SectionTitle>{t("penca.title")}</SectionTitle>
          <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            {t("penca.intro")}
          </p>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          {t("penca.exampleLabel")}
        </span>

        <div className="flex flex-col sm:flex-row gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className="flex flex-col gap-2 rounded-xl flex-1"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border-subtle)",
                padding: 20,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 900,
                  color: tier.color,
                }}
              >
                {t("points", { points: tier.points })}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {tier.label}
              </span>
              <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                {tier.desc}
              </p>
              <span
                className="self-start rounded-full"
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "var(--color-bg-card-secondary)",
                  border: "1px solid var(--color-border-light)",
                  color: tier.color,
                }}
              >
                {tier.example}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {notes.map((note) => (
            <div
              key={note.title}
              className="flex flex-col gap-1 rounded-xl flex-1"
              style={{
                background: "var(--color-bg-card-secondary)",
                border: "1px solid var(--color-border-subtle)",
                padding: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-accent)" }}>
                {note.title}
              </span>
              <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                {note.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="flex flex-col gap-2">
        <SectionTitle>{t("leaderboard.title")}</SectionTitle>
        <div
          className="flex flex-col gap-1 rounded-xl"
          style={{
            background: "var(--color-bg-card-secondary)",
            border: "1px solid var(--color-border-subtle)",
            padding: 16,
          }}
        >
          <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            {t("leaderboard.desc")}
          </p>
          <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            {t("leaderboard.tiebreak")}
          </p>
        </div>
      </section>

      {/* ── Prediction Arena ── */}
      <section
        className="flex flex-col gap-3 rounded-xl"
        style={{
          background: "var(--gradient-arena)",
          border: "1px solid var(--color-border-light)",
          padding: 20,
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <SectionTitle>{t("arena.title")}</SectionTitle>
          <span
            className="rounded-full"
            style={{
              padding: "3px 10px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
              background: "color-mix(in srgb, var(--color-accent-violet) 20%, transparent)",
              color: "var(--color-accent-violet)",
            }}
          >
            {t("arena.badge")}
          </span>
        </div>
        <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
          {t("arena.desc")}
        </p>
        <p className="text-sm" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
          {t("arena.schedule")}
        </p>

        <span
          style={{
            marginTop: 4,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          {t("arena.scoringTitle")}
        </span>
        <div className="flex flex-col gap-2">
          {arenaScoring.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--color-bg-card) 60%, transparent)",
                padding: "10px 14px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 900,
                  minWidth: 52,
                  color: row.points >= POINTS_HAPPENED_CORRECT_TEAM
                    ? "var(--color-accent-violet)"
                    : row.points > 0
                      ? "var(--color-accent-lavender)"
                      : "var(--color-text-muted)",
                }}
              >
                {t("points", { points: row.points })}
              </span>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {row.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm" style={{ margin: 0, color: "var(--color-text-muted)" }}>
        {t("resultsNote")}
      </p>
    </div>
  );
}
