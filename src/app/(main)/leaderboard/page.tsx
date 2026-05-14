import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeaderboardData } from "@/lib/queries/leaderboard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/LeaderboardPodium";

const DUMMY_LEADERBOARD = [
  { id: "dummy-1", rank: 1, nickname: "Carlos_98", avatarUrl: null, totalPoints: 47, exactScores: 5, correctWinners: 8, matchesScored: 12 },
  { id: "dummy-2", rank: 2, nickname: "MariaPenca", avatarUrl: null, totalPoints: 41, exactScores: 4, correctWinners: 7, matchesScored: 12 },
  { id: "dummy-3", rank: 3, nickname: "GoalMaster", avatarUrl: null, totalPoints: 38, exactScores: 3, correctWinners: 8, matchesScored: 11 },
  { id: "dummy-4", rank: 4, nickname: "placeholder", avatarUrl: null, totalPoints: 35, exactScores: 3, correctWinners: 6, matchesScored: 12 },
  { id: "dummy-5", rank: 5, nickname: "FutbolFan", avatarUrl: null, totalPoints: 33, exactScores: 2, correctWinners: 7, matchesScored: 10 },
  { id: "dummy-6", rank: 6, nickname: "Pronostico", avatarUrl: null, totalPoints: 29, exactScores: 2, correctWinners: 5, matchesScored: 11 },
  { id: "dummy-7", rank: 7, nickname: "LaGloria", avatarUrl: null, totalPoints: 25, exactScores: 1, correctWinners: 6, matchesScored: 10 },
  { id: "dummy-8", rank: 8, nickname: "ElPulpo", avatarUrl: null, totalPoints: 22, exactScores: 1, correctWinners: 4, matchesScored: 9 },
  { id: "dummy-9", rank: 9, nickname: "Mundialista", avatarUrl: null, totalPoints: 18, exactScores: 1, correctWinners: 3, matchesScored: 8 },
  { id: "dummy-10", rank: 10, nickname: "PencaKing", avatarUrl: null, totalPoints: 15, exactScores: 0, correctWinners: 5, matchesScored: 10 },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { preview } = await searchParams;
  const isAdmin = (session.user as unknown as Record<string, boolean>).isAdmin;
  const isPreview = isAdmin && preview === "active";

  let entries = await getLeaderboardData();

  const hasRealData = entries.some((e) => e.totalPoints > 0);
  if (!hasRealData && isPreview) {
    entries = DUMMY_LEADERBOARD.map((e) =>
      e.id === "dummy-4"
        ? { ...e, id: session.user!.id!, nickname: session.user!.name ?? "You", avatarUrl: session.user!.image ?? null }
        : e,
    );
  }

  return (
    <>
      <div className="page-content">
          <h1 className="page-title">Leaderboard</h1>
          <Podium entries={entries} />
          <LeaderboardTable entries={entries} currentUserId={session.user.id} />
      </div>
    </>
  );
}
