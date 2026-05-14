import { TeamName } from "@/components/ui/TeamName";
import type { GroupStanding } from "@/lib/queries/fixtures";

interface Props {
  groupName: string;
  standings: GroupStanding[];
  groupLabel: string;
  teamLabel: string;
}

const COLUMNS = ["MP", "W", "D", "L", "GD", "PTS"] as const;

function getStatValue(s: GroupStanding, col: (typeof COLUMNS)[number]): number {
  switch (col) {
    case "MP": return s.played;
    case "W": return s.won;
    case "D": return s.drawn;
    case "L": return s.lost;
    case "GD": return s.goalDifference;
    case "PTS": return s.points;
  }
}

export function GroupCard({ groupName, standings, groupLabel, teamLabel }: Props) {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--color-bg-card)",
        borderRadius: 12,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2"
        style={{ padding: "16px 20px 12px" }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: "var(--color-accent-gold)" }}
        >
          trophy
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--color-text-accent)",
            letterSpacing: 1.2,
          }}
        >
          {groupLabel}
        </h3>
      </div>

      {/* Table */}
      <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  letterSpacing: 0.5,
                }}
              >
                {teamLabel}
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: "center",
                    padding: "6px 4px",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    letterSpacing: 0.5,
                    width: col === "PTS" ? 36 : 28,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => (
              <tr
                key={s.team.id}
                style={{
                  borderTop: idx === 0 ? "none" : "1px solid var(--color-border-subtle)",
                }}
              >
                {/* Team cell */}
                <td style={{ padding: "10px 8px" }}>
                  <div className="flex items-center gap-2">
                    {/* Qualified indicator */}
                    <div
                      style={{
                        width: 3,
                        height: 20,
                        borderRadius: 2,
                        background: s.qualified ? "var(--color-accent-green)" : "transparent",
                        flexShrink: 0,
                      }}
                    />
                    {/* Flag */}
                    {s.team.flagUrl ? (
                      <img
                        src={s.team.flagUrl}
                        alt={s.team.code}
                        width={20}
                        height={14}
                        className="object-cover"
                        style={{ borderRadius: 2, flexShrink: 0 }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 20,
                          height: 14,
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          fontWeight: 700,
                          color: "var(--color-text-muted)",
                          background: "var(--color-bg-card-secondary)",
                          borderRadius: 2,
                        }}
                      >
                        {s.team.code}
                      </span>
                    )}
                    {/* Name */}
                    <span
                      className="truncate"
                      style={{
                        fontSize: 12,
                        fontWeight: s.qualified ? 700 : 500,
                        fontFamily: "var(--font-body)",
                        color: s.qualified
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      <TeamName team={s.team} />
                    </span>
                  </div>
                </td>

                {/* Stat cells */}
                {COLUMNS.map((col) => (
                  <td
                    key={col}
                    style={{
                      textAlign: "center",
                      padding: "10px 4px",
                      fontSize: 12,
                      fontWeight: col === "PTS" ? 800 : 500,
                      fontFamily: "var(--font-body)",
                      color:
                        col === "PTS" && s.qualified
                          ? "var(--color-text-accent)"
                          : col === "PTS"
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                    }}
                  >
                    {getStatValue(s, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
