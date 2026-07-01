const API_BASE = "https://v3.football.api-sports.io";

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    venue: { name: string; city: string | null } | null;
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiResponse {
  response: ApiFixture[];
  errors: Record<string, string>;
}

export async function getFixtures(
  leagueId: number,
  season: number,
): Promise<ApiFixture[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new Error("API_FOOTBALL_KEY not configured");
  }

  const res = await fetch(
    `${API_BASE}/fixtures?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`API-Football returned ${res.status}`);
  }

  const data: ApiResponse = await res.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(
      `API-Football errors: ${JSON.stringify(data.errors)}`,
    );
  }

  return data.response;
}

const STATUS_MAP: Record<string, string> = {
  NS: "SCHEDULED",
  TBD: "SCHEDULED",
  "1H": "LIVE",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  HT: "HALFTIME",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  AWD: "FINISHED",
  WO: "FINISHED",
};

export function mapApiStatus(shortStatus: string): string {
  return STATUS_MAP[shortStatus] || "SCHEDULED";
}

export function mapApiStage(round: string): string {
  const lower = round.toLowerCase();
  if (lower.includes("group")) return "GROUP";
  if (lower.includes("32")) return "R32";
  if (lower.includes("16")) return "R16";
  if (lower.includes("quarter")) return "QF";
  if (lower.includes("semi")) return "SF";
  // Third-place play-off — often labelled "3rd Place Final". Keep it out of the
  // FINAL branch below so it never collides with the actual final (which now
  // gets auto-created by the sync). Its own stage; the bracket UI ignores it.
  if (lower.includes("3rd place") || lower.includes("third place")) return "THIRD";
  if (lower.includes("final") && !lower.includes("semi")) return "FINAL";
  return "GROUP";
}
