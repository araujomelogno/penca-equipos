"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_WEEKLY_EVENTS } from "@/lib/prediction-arena-defaults";

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

interface EventData {
  id?: string;
  emoji: string;
  title: string;
  description: string;
  result?: "HAPPENED" | "NO_HAPPENED" | null;
  resultTeam?: Team | null;
  _count?: { predictions: number };
}

interface WeekData {
  id: string;
  weekNumber: number;
  status: string;
  deadline: string;
  events: EventData[];
}

export function PredictionArenaAdmin() {
  const tDefaults = useTranslations("arena.defaults");
  const [week, setWeek] = useState<WeekData | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<EventData[]>(
    Array.from({ length: 6 }, () => ({ emoji: "", title: "", description: "" })),
  );
  const [deadline, setDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [weekRes, teamsRes] = await Promise.all([
        fetch("/api/admin/prediction-arena/current"),
        fetch("/api/admin/prediction-arena/teams"),
      ]);

      if (weekRes.ok) {
        const weekData = await weekRes.json();
        if (weekData.week) {
          setWeek(weekData.week);
          setEvents(weekData.week.events);
          setDeadline(weekData.week.deadline);
        }
        setMatchCount(weekData.matchCount ?? 0);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams ?? []);
      }
    } catch {
      setMessage("Error loading data");
    } finally {
      setLoading(false);
    }
  }

  function loadDefaults() {
    // Materialize template text in the installation's language (each
    // installation is monolingual) — this is what gets saved to the DB.
    setEvents(
      DEFAULT_WEEKLY_EVENTS.map((e, i) => ({
        emoji: e.emoji,
        title: tDefaults(`${e.key}.title`),
        description: tDefaults(`${e.key}.description`),
        ...(events[i]?.id ? { id: events[i].id } : {}),
      })),
    );
  }

  function updateEvent(index: number, field: string, value: string) {
    setEvents((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  }

  async function createOrUpdateWeek() {
    try {
      setSaving(true);
      setMessage(null);

      const url = week
        ? `/api/admin/prediction-arena/weeks/${week.id}`
        : "/api/admin/prediction-arena/weeks";
      const method = week ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: events.map((e) => ({
            emoji: e.emoji || "⚡",
            title: e.title,
            description: e.description,
          })),
          status: "OPEN",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(week ? "Week updated" : "Week created");
        await loadData();
      } else {
        setMessage(data.error ?? "Error saving");
      }
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function resolveEvent(eventId: string, result: "HAPPENED" | "NO_HAPPENED", teamId?: string) {
    try {
      setMessage(null);
      const res = await fetch(`/api/admin/prediction-arena/events/${eventId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, resultTeamId: teamId ?? null }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.weekResolved) {
          setMessage("Week resolved! Nostradamus determined.");
        } else {
          setMessage("Event resolved");
        }
        await loadData();
      } else {
        setMessage(data.error ?? "Error resolving");
      }
    } catch {
      setMessage("Error resolving");
    }
  }

  if (loading) {
    return <div style={{ color: "var(--color-text-muted)", padding: 24 }}>Loading...</div>;
  }

  const canEdit = !week || week.status === "DRAFT" || week.status === "OPEN";

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {week ? `Week ${week.weekNumber}` : "New week"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {week && <>Status: {week.status} · {matchCount} matches · </>}
            {deadline
              ? `Deadline: ${new Date(deadline).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Auto deadline: Sunday 23:00 UTC"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {matchCount > 0 && canEdit && (
            <button onClick={loadDefaults} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12 }}>
              Load defaults
            </button>
          )}
          {canEdit && (
            <button
              onClick={createOrUpdateWeek}
              disabled={saving || events.some((e) => !e.title)}
              className="btn-primary"
              style={{ padding: "10px 24px", borderRadius: 10, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : week ? "Update" : "Create week"}
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{ fontSize: 13, fontWeight: 600, color: message.includes("Error") ? "var(--color-error-soft)" : "var(--color-text-accent)" }}>
          {message}
        </div>
      )}

      {/* Cards grid — same 3x2 as user view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((event, i) => (
          <AdminArenaCard
            key={event.id ?? i}
            index={i}
            event={event}
            canEdit={canEdit}
            teams={teams}
            onUpdate={updateEvent}
            onResolve={resolveEvent}
          />
        ))}
      </div>
    </div>
  );
}

// --- Admin Arena Card ---

function AdminArenaCard({
  index,
  event,
  canEdit,
  teams,
  onUpdate,
  onResolve,
}: {
  index: number;
  event: EventData;
  canEdit: boolean;
  teams: Team[];
  onUpdate: (index: number, field: string, value: string) => void;
  onResolve: (eventId: string, result: "HAPPENED" | "NO_HAPPENED", teamId?: string) => void;
}) {
  const [resolveMode, setResolveMode] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResult = event.result != null;
  const filtered = search ? teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : teams;
  const resolveTeam = selectedTeam ? teams.find((t) => t.id === selectedTeam) : null;

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: hasResult ? "var(--color-bg-highlight)" : "var(--color-bg-card)",
        border: hasResult
          ? `1px solid ${event.result === "HAPPENED" ? "color-mix(in srgb, var(--color-accent-gold) 19%, transparent)" : "color-mix(in srgb, var(--color-text-secondary) 19%, transparent)"}`
          : "1px solid transparent",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Title — editable or display */}
      {canEdit && !hasResult ? (
        <input
          value={event.title}
          onChange={(e) => onUpdate(index, "title", e.target.value)}
          placeholder={`Event ${index + 1}`}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--color-border-light)",
            padding: "4px 0",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 17,
            outline: "none",
          }}
        />
      ) : (
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>
          {event.title || `Event ${index + 1}`}
        </h3>
      )}

      {/* Description — editable or display */}
      {canEdit && !hasResult ? (
        <input
          value={event.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="Event description"
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--color-border-subtle)",
            padding: "4px 0",
            color: "var(--color-text-muted)",
            fontSize: 12,
            outline: "none",
          }}
        />
      ) : (
        event.description && (
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{event.description}</div>
        )
      )}

      {/* Status badge */}
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: hasResult ? (event.result === "HAPPENED" ? "color-mix(in srgb, var(--color-accent-gold) 13%, transparent)" : "color-mix(in srgb, var(--color-text-secondary) 13%, transparent)") : "var(--color-border-subtle)",
            color: hasResult ? (event.result === "HAPPENED" ? "var(--color-text-accent)" : "var(--color-text-secondary)") : "var(--color-accent-gold)",
          }}
        >
          {hasResult ? (event.result === "HAPPENED" ? "Happened" : "Didn't happen") : event.id ? "Pending" : "New"}
        </span>
        {event._count && (
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 8 }}>
            {event._count.predictions} predictions
          </span>
        )}
      </div>

      {/* Result display */}
      {hasResult && event.result === "HAPPENED" && event.resultTeam && (
        <div className="flex items-center gap-3" style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--color-accent-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-accent-gold) 19%, transparent)" }}>
          {event.resultTeam.flagUrl && (
            <img src={event.resultTeam.flagUrl} alt="" style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 2 }} />
          )}
          <span style={{ fontWeight: 700, color: "var(--color-text-accent)", fontSize: 14 }}>{event.resultTeam.name}</span>
        </div>
      )}

      {/* Resolve controls */}
      {event.id && !hasResult && (
        <div style={{ marginTop: 4 }}>
          {!resolveMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => onResolve(event.id!, "NO_HAPPENED")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid color-mix(in srgb, var(--color-text-secondary) 25%, transparent)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Didn&apos;t happen
              </button>
              <button
                onClick={() => setResolveMode(true)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid color-mix(in srgb, var(--color-accent-gold) 25%, transparent)",
                  background: "transparent",
                  color: "var(--color-text-accent)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Happened...
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Searchable team picker for resolve */}
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  type="button"
                  className="flex items-center justify-between"
                  style={{
                    width: "100%",
                    background: "var(--color-bg-input)",
                    borderRadius: 10,
                    border: selectedTeam ? "1px solid color-mix(in srgb, var(--color-accent-gold) 19%, transparent)" : "1px solid var(--color-border-subtle)",
                    padding: "10px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {resolveTeam?.flagUrl && (
                      <img src={resolveTeam.flagUrl} alt="" style={{ width: 22, height: 15, objectFit: "cover", borderRadius: 2 }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: selectedTeam ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                      {resolveTeam?.name ?? "Select team..."}
                    </span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-text-muted)" }}>expand_more</span>
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                    background: "var(--color-bg-card-secondary)", borderRadius: 10, border: "1px solid var(--color-border-light)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)", maxHeight: 220, display: "flex", flexDirection: "column",
                  }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <input
                        autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search country..." style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--color-text-primary)", fontSize: 13, padding: "4px 0" }}
                      />
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                      {filtered.map((t) => (
                        <button
                          key={t.id} type="button"
                          onClick={() => { setSelectedTeam(t.id); setDropdownOpen(false); setSearch(""); }}
                          className="flex items-center gap-3"
                          style={{ width: "100%", padding: "8px 14px", background: selectedTeam === t.id ? "var(--color-border-subtle)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          {t.flagUrl && <img src={t.flagUrl} alt="" style={{ width: 20, height: 14, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                          <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedTeam) {
                      onResolve(event.id!, "HAPPENED", selectedTeam);
                      setResolveMode(false);
                    }
                  }}
                  disabled={!selectedTeam}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "none",
                    background: selectedTeam ? "var(--color-accent-gold)" : "color-mix(in srgb, var(--color-accent-gold) 19%, transparent)", color: "var(--color-bg-primary)",
                    fontSize: 12, fontWeight: 700, cursor: selectedTeam ? "pointer" : "default",
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setResolveMode(false); setSelectedTeam(""); }}
                  style={{ padding: "10px 16px", borderRadius: 10, background: "transparent", border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)", fontSize: 12, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
