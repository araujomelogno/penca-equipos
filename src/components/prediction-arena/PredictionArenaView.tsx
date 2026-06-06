"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

type Translator = (key: string, values?: Record<string, string | number>) => string;

function useCountdown(deadline: string | undefined, t: Translator) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  return useMemo(() => {
    if (!deadline) return { text: "", urgent: false };
    const diff = new Date(deadline).getTime() - now.getTime();
    if (diff <= 0) return { text: t("closed"), urgent: false };

    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const urgent = hours < 3;
    let text: string;
    if (days > 0) text = t("closesInDays", { days, hours: hours % 24 });
    else if (hours > 0) text = t("closesInHours", { hours, minutes: minutes % 60 });
    else text = t("closesInMinutes", { minutes });

    return { text, urgent };
  }, [deadline, now, t]);
}

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

interface UserPrediction {
  id: string;
  teamId: string | null;
  points: number | null;
  team: Team | null;
}

interface EventData {
  id: string;
  orderIndex: number;
  emoji: string;
  title: string;
  description: string;
  result: "HAPPENED" | "NO_HAPPENED" | null;
  resultTeam: Team | null;
  userPrediction: UserPrediction | null;
}

interface WeekData {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  status: string;
  deadline: string;
  nostradamus: { id: string; nickname: string; avatarUrl: string | null; avatarPreset: string | null } | null;
  events: EventData[];
}

interface NostradamusData {
  user: { id: string; nickname: string; avatarUrl: string | null; avatarPreset: string | null } | null;
  weekNumber: number;
  totalPoints: number;
}

interface CommunityVote {
  teamId: string | null;
  code: string | null;
  name: string | null;
  count: number;
  pct: number;
}

interface LeaderboardEntry {
  rank: number;
  user: { id: string; nickname: string; avatarUrl: string | null; avatarPreset: string | null };
  totalPoints: number;
}

interface HistoryWeek extends WeekData {
  userTotal: number;
}

interface Props {
  week: WeekData | null;
  history: HistoryWeek[];
  nostradamus: NostradamusData | null;
  communityVotes: Record<string, CommunityVote[]>;
  leaderboard: LeaderboardEntry[];
  teams: Team[];
  userId: string;
}

export function PredictionArenaView({ week, history, nostradamus, communityVotes, leaderboard, teams, userId }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("arena");
  const tCountdown = useTranslations("arena.countdown");
  const tLeaders = useTranslations("arena.leaders");
  const tHistory = useTranslations("arena.history");
  const tCard = useTranslations("arena.card");
  const tDropdown = useTranslations("arena.dropdown");
  const tTeam = useTranslations("teams");
  const teamLabel = (team: { code: string; name: string } | null | undefined): string => {
    if (!team) return "?";
    try {
      const v = tTeam(team.code as never);
      if (typeof v === "string" && v && v !== team.code) return v;
    } catch {}
    return team.name;
  };
  const [predictions, setPredictions] = useState<Record<string, string | null>>(() => {
    if (!week) return {};
    const initial: Record<string, string | null> = {};
    for (const e of week.events) {
      if (e.userPrediction) {
        initial[e.id] = e.userPrediction.teamId;
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const countdown = useCountdown(week?.deadline, tCountdown);

  const isOpen = week?.status === "OPEN" && new Date() < new Date(week.deadline);
  const isResolved = week?.status === "RESOLVED";
  const isClosed = week?.status === "CLOSED" || (week?.status === "OPEN" && new Date() >= new Date(week.deadline));

  function setPrediction(eventId: string, teamId: string | null) {
    setPredictions((prev) => ({ ...prev, [eventId]: teamId }));
    setDirty(true);
    setMessage(null);
  }

  async function savePredictions() {
    if (!week) return;
    try {
      setSaving(true);
      setMessage(null);
      const items = Object.entries(predictions).map(([eventId, teamId]) => ({ eventId, teamId }));
      const res = await fetch("/api/prediction-arena/predict", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: items }),
      });
      if (res.ok) {
        setDirty(false);
        setMessage(t("saved"));
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.error ?? t("errorSaving"));
      }
    } catch {
      setMessage(t("errorSaving"));
    } finally {
      setSaving(false);
    }
  }

  const userTotal = week?.events.reduce((sum, e) => sum + (e.userPrediction?.points ?? 0), 0) ?? 0;
  const unsavedCount = Object.keys(predictions).length;

  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{t("title")}</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 4, maxWidth: 440 }}>
            {t("intro")}
            {week && isOpen && <> {t("lockIn")}<strong style={{ color: "var(--color-text-primary)" }}>{new Date(week.deadline).toLocaleString(locale, { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>.</>}
          </p>
          {week && (
            <div className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              <span>{t("week", { n: week.weekNumber })}</span>
              <span>·</span>
              {isOpen ? (
                <span className="flex items-center gap-1" style={{ color: countdown.urgent ? "var(--color-accent-gold)" : "var(--color-text-muted)" }}>
                  {countdown.urgent && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>}
                  {countdown.text}
                </span>
              ) : isClosed ? (
                <span>{t("statusClosedPending")}</span>
              ) : isResolved ? (
                <span>{t("statusResolved")}</span>
              ) : null}
            </div>
          )}
        </div>
        {isResolved && (
          <div style={{ padding: "8px 16px", borderRadius: 12, background: "var(--color-bg-card)", fontSize: 14, fontWeight: 700, color: "var(--color-accent-gold)" }}>
            {t("yourScore", { n: userTotal })}
          </div>
        )}
      </div>

      {/* No week */}
      {!week && (
        <div style={{ padding: 60, borderRadius: 24, background: "var(--color-bg-card)", textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
          {t("noWeek")}
        </div>
      )}

      {/* Event cards grid */}
      {week && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {week.events.map((event) => (
            <ArenaCard
              key={event.id}
              event={event}
              teams={teams}
              votes={communityVotes[event.id] ?? []}
              selectedTeamId={predictions[event.id]}
              isOpen={!!isOpen}
              isClosed={!!isClosed}
              isResolved={!!isResolved}
              onPredict={(teamId) => setPrediction(event.id, teamId)}
              tCard={tCard}
              tDropdown={tDropdown}
              teamLabel={teamLabel}
            />
          ))}
        </div>
      )}

      {/* Save bar — compact, right-aligned like FloatingBar */}
      {isOpen && dirty && (
        <div className="flex items-center justify-between" style={{ padding: "12px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: message === t("errorSaving") ? "#e5a0a0" : message ? "#ffe19e" : "var(--color-text-muted)" }}>
            {message ?? t("unsaved", { n: unsavedCount })}
          </div>
          <button
            onClick={savePredictions}
            disabled={saving}
            className="btn-primary"
            style={{ padding: "12px 40px", borderRadius: 12, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      )}

      {/* Arena Leaders */}
      {leaderboard.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 className="page-title" style={{ fontSize: 22, marginBottom: 4 }}>{tLeaders("title")}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
            {tLeaders("subtitle")}
          </p>
          <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--color-bg-card)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FFFFFF08" }}>
                  <th style={thStyle}>{tLeaders("colRank")}</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>{tLeaders("colUser")}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tLeaders("colPoints")}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.user.id} style={{ borderTop: "1px solid #FFFFFF08" }}>
                    <td style={{ ...tdStyle, fontFamily: "var(--font-display)", fontWeight: 800, color: entry.rank === 1 ? "var(--color-accent-gold)" : "var(--color-text-muted)" }}>
                      {String(entry.rank).padStart(2, "0")}
                    </td>
                    <td style={tdStyle}>
                      <div className="flex items-center gap-3">
                        {entry.user.avatarUrl ? (
                          <img src={entry.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFFFFF10", fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>
                            {entry.user.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {entry.user.nickname}
                          {entry.user.id === userId && <span style={{ color: "var(--color-accent-gold)", marginLeft: 4, fontSize: 11 }}>{tLeaders("you")}</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>
                      {entry.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className="page-title" style={{ fontSize: 18, marginBottom: 12 }}>{tHistory("title")}</h2>
          <div className="flex flex-col gap-2">
            {history.map((w) => (
              <div key={w.id} className="flex items-center justify-between" style={{ padding: "10px 16px", borderRadius: 12, background: "var(--color-bg-card)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{tHistory("week", { n: w.weekNumber })}</span>
                  {w.nostradamus && (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 8 }}>
                      🔮 {w.nostradamus.nickname}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-gold)" }}>{tHistory("pts", { n: w.userTotal })}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 20px",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--color-text-muted)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 20px",
  fontSize: 13,
};

// --- Searchable Team Dropdown ---

function TeamDropdown({
  teams,
  value,
  onChange,
  tDropdown,
  teamLabel,
}: {
  teams: Team[];
  value: string | null | undefined;
  onChange: (teamId: string | null) => void;
  tDropdown: Translator;
  teamLabel: (team: { code: string; name: string } | null | undefined) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedTeam = value ? teams.find((t) => t.id === value) : null;
  const isNoSucede = value === null;

  const filtered = search
    ? teams.filter((t) =>
        teamLabel(t).toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()),
      )
    : teams;

  const displayLabel = isNoSucede
    ? tDropdown("wontHappen")
    : selectedTeam
      ? teamLabel(selectedTeam)
      : tDropdown("choose");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="flex items-center justify-between"
        style={{
          width: "100%",
          background: "#0e0928",
          borderRadius: 12,
          border: value !== undefined ? "1px solid #ffe19e30" : "1px solid #FFFFFF10",
          padding: "12px 16px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div className="flex items-center gap-3">
          {selectedTeam?.flagUrl && (
            <img src={selectedTeam.flagUrl} alt="" style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 2 }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: value !== undefined ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
            {displayLabel}
          </span>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-text-muted)" }}>
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#1b1736",
            borderRadius: 12,
            border: "1px solid #FFFFFF15",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #FFFFFF10" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tDropdown("search")}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--color-text-primary)",
                fontSize: 13,
                padding: "4px 0",
              }}
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* No sucede option */}
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
              className="flex items-center gap-3"
              style={{
                width: "100%",
                padding: "10px 16px",
                background: isNoSucede ? "#FFFFFF10" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "1px solid #FFFFFF08",
              }}
            >
              <span style={{ fontSize: 14 }}>❌</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isNoSucede ? "var(--color-accent-gold)" : "var(--color-text-primary)" }}>
                {tDropdown("wontHappenShort")}
              </span>
            </button>

            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); setSearch(""); }}
                className="flex items-center gap-3"
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: value === t.id ? "#FFFFFF10" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {t.flagUrl && (
                  <img src={t.flagUrl} alt="" style={{ width: 22, height: 15, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: value === t.id ? 700 : 400, color: value === t.id ? "var(--color-accent-gold)" : "var(--color-text-primary)" }}>
                  {teamLabel(t)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Arena Card ---

function ArenaCard({
  event,
  teams,
  votes,
  selectedTeamId,
  isOpen,
  isClosed,
  isResolved,
  onPredict,
  tCard,
  tDropdown,
  teamLabel,
}: {
  event: EventData;
  teams: Team[];
  votes: CommunityVote[];
  selectedTeamId: string | null | undefined;
  isOpen: boolean;
  isClosed: boolean;
  isResolved: boolean;
  onPredict: (teamId: string | null) => void;
  tCard: Translator;
  tDropdown: Translator;
  teamLabel: (team: { code: string; name: string } | null | undefined) => string;
}) {
  const prediction = event.userPrediction;
  const hasResult = event.result != null;
  const points = prediction?.points;
  // Calculate correctness from prediction vs result (don't wait for points)
  const isCorrect = hasResult && prediction != null && (
    (event.result === "NO_HAPPENED" && prediction.teamId === null) ||
    (event.result === "HAPPENED" && prediction.teamId != null && prediction.teamId === event.resultTeam?.id)
  );
  const isPartialCorrect = hasResult && prediction != null && !isCorrect &&
    event.result === "HAPPENED" && prediction.teamId != null;

  const currentSelection = selectedTeamId !== undefined ? selectedTeamId : prediction?.teamId;

  const isCompleted = hasResult;
  const isLocked = isClosed && !isResolved && !hasResult;

  const voteColors = ["var(--color-accent-gold)", "#c9bffa", "#393556"];

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        background: isCompleted
          ? isCorrect ? "#393556" : "#1b1736"
          : "var(--color-bg-card)",
        border: isCompleted
          ? isCorrect ? "2px solid #ffe19e30" : "1px solid #FFFFFF08"
          : "1px solid transparent",
        opacity: isLocked ? 0.6 : 1,
        filter: isLocked ? "grayscale(0.4)" : "none",
      }}
    >
      {/* Points badge (completed) */}
      {isCompleted && prediction != null && (
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <span
            className="flex items-center gap-1"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: isCorrect ? "var(--color-accent-gold)" : "#8b8399",
            }}
          >
            {points != null ? (isCorrect ? `+${points}` : `${points}`) : ""}
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {isCorrect ? "check_circle" : isPartialCorrect ? "remove" : "close"}
            </span>
          </span>
        </div>
      )}

      {/* Title + status */}
      <div className="flex justify-between items-start" style={{ marginBottom: 16, gap: 8 }}>
        <div style={{ maxWidth: isCompleted ? "70%" : "100%" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, lineHeight: 1.2, marginBottom: event.description ? 4 : 6 }}>
            {event.title}
          </h3>
          {event.description && (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6, lineHeight: 1.4 }}>
              {event.description}
            </div>
          )}
          <span
            style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: isCompleted ? "var(--color-accent-gold)" : "#FFFFFF10",
              color: isCompleted ? "#130f2e" : isLocked ? "var(--color-text-muted)" : "var(--color-accent-gold)",
            }}
          >
            {isCompleted ? tCard("statusCompleted") : isLocked ? tCard("statusClosed") : tCard("statusOpen")}
          </span>
        </div>
      </div>

      {/* Selector / Result display */}
      <div style={{ marginBottom: 16 }}>
        {isOpen && !isCompleted && (
          <>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: 8 }}>
              {tCard("selectPrediction")}
            </label>
            <TeamDropdown teams={teams} value={currentSelection} onChange={onPredict} tDropdown={tDropdown} teamLabel={teamLabel} />
          </>
        )}

        {isCompleted && (
          <div
            style={{
              background: isCorrect ? "#ffe19e15" : "#FFFFFF08",
              border: `1px solid ${isCorrect ? "#ffe19e30" : "#FFFFFF10"}`,
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {event.resultTeam?.flagUrl && (
                  <img src={event.resultTeam.flagUrl} alt="" style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 2 }} />
                )}
                <span style={{ fontWeight: 700, color: isCorrect ? "var(--color-accent-gold)" : "var(--color-text-primary)" }}>
                  {event.result === "HAPPENED" ? teamLabel(event.resultTeam) : tCard("didNotHappen")}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ color: isCorrect ? "var(--color-accent-gold)" : "#8b8399", fontSize: 20 }}>
                {isCorrect ? "check_circle" : "close"}
              </span>
            </div>
            {prediction && (
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: isCorrect ? "var(--color-accent-gold)" : "#8b8399", marginTop: 4 }}>
                {isCorrect ? tCard("correctPrediction") : tCard("yourPrediction", { pick: prediction.teamId === null ? tCard("wontHappen") : teamLabel(prediction.team) })}
              </div>
            )}
          </div>
        )}

        {isLocked && (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>
              {tCard("predictionLocked")}
            </span>
            {prediction && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {tCard("yourPick", { pick: prediction.teamId === null ? tCard("wontHappen") : teamLabel(prediction.team) })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community votes bar */}
      {votes.length > 0 && (
        <div style={{ opacity: isCompleted ? 0.6 : 1 }}>
          <div className="flex justify-between" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 6 }}>
            <span style={{ color: "var(--color-text-muted)" }}>{tCard("communityVotes")}</span>
            {votes[0] && <span style={{ color: "var(--color-accent-gold)" }}>{votes[0].name ?? votes[0].code} {votes[0].pct}%</span>}
          </div>
          <div className="flex" style={{ height: 5, borderRadius: 999, overflow: "hidden", background: "#0e0928" }}>
            {votes.map((v, i) => (
              <div key={v.teamId ?? "no"} style={{ width: `${v.pct}%`, height: "100%", background: voteColors[i] ?? "#393556" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
