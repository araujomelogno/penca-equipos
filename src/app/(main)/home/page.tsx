import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHomeData } from "@/lib/queries/home";
import { LeaderboardPodium } from "@/components/LeaderboardPodium";
import { StatsRow } from "@/components/StatsRow";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UpcomingMatches } from "@/components/UpcomingMatches";
import { HeroBanner } from "@/components/HeroBanner";
import { ParticipationStats } from "@/components/ParticipationStats";
import { CountdownCard } from "@/components/CountdownCard";
import { FavoritesCard } from "@/components/FavoritesCard";
import { NextFavoriteMatchCard } from "@/components/NextFavoriteMatchCard";
import { HighlightsCard } from "@/components/HighlightsCard";
import { NostradamusCard } from "@/components/NostradamusCard";
import { ArenaStatusCard } from "@/components/ArenaStatusCard";
import { PredictNudge } from "@/components/PredictNudge";


export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { preview } = await searchParams;
  const data = await getHomeData(session.user.id);
  const isAdmin = (session.user as unknown as Record<string, boolean>).isAdmin;

  // ?preview=active forces "Torneo Activo" state (admin only)
  const isPreview = isAdmin && preview === "active";
  const hasLeaderboard = isPreview || data.hasLeaderboard;

  // Dummy leaderboard for preview when no real data exists
  const hasRealData = data.leaderboard.some((e) => e.totalPoints > 0);
  const leaderboard = hasRealData ? data.leaderboard : isPreview ? [
    { id: "dummy-1", rank: 1, nickname: "Carlos_98", avatarUrl: null, totalPoints: 47 },
    { id: "dummy-2", rank: 2, nickname: "MariaPenca", avatarUrl: null, totalPoints: 41 },
    { id: "dummy-3", rank: 3, nickname: "GoalMaster", avatarUrl: null, totalPoints: 38 },
    { id: session.user.id, rank: 4, nickname: session.user.name ?? "You", avatarUrl: session.user.image ?? null, totalPoints: 35 },
    { id: "dummy-5", rank: 5, nickname: "FutbolFan", avatarUrl: null, totalPoints: 33 },
    { id: "dummy-6", rank: 6, nickname: "Pronostico", avatarUrl: null, totalPoints: 29 },
    { id: "dummy-7", rank: 7, nickname: "LaGloria", avatarUrl: null, totalPoints: 25 },
    { id: "dummy-8", rank: 8, nickname: "ElPulpo", avatarUrl: null, totalPoints: 22 },
  ] : [];

  const userStats = isPreview && data.userStats.matchesFinished === 0
    ? { matchesFinished: 12, accuracy: 58, streak: 3 }
    : data.userStats;

  if (hasLeaderboard) {
    return (
      <div className="page-content">
        <PredictNudge nudge={data.predictNudge} />
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Left column: Leaderboard + Stats */}
          <div className="flex flex-col gap-6 w-full lg:w-[22%] lg:max-w-[300px] lg:shrink-0">
            <LeaderboardPodium
              leaderboard={leaderboard}
              currentUserId={session.user.id}
            />
            <StatsRow
              matchesFinished={userStats.matchesFinished}
              accuracy={userStats.accuracy}
              streak={userStats.streak}
            />
          </div>

          {/* Center column: Activity Feed (hidden on mobile) */}
          <div className="hidden lg:flex flex-col gap-6 flex-1 min-w-0">
            <ActivityFeed items={data.activityFeed} currentUserId={session.user.id} />
          </div>

          {/* Right column: Nostradamus + Arena + Highlights + Upcoming Matches */}
          <div className="flex flex-col gap-6 w-full lg:w-[22%] lg:max-w-[300px] lg:shrink-0 min-w-0">
            <NostradamusCard />
            <ArenaStatusCard />
            {data.latestHighlights && (
              <HighlightsCard nuggets={data.latestHighlights} />
            )}
            <UpcomingMatches
              matches={data.latestHighlights
                ? data.upcomingMatches.slice(0, 2)
                : data.upcomingMatches
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // Pre-Mundial state
  return (
    <div className="page-content" style={{ gap: 16 }}>
        {/* Banner — full width */}
        <HeroBanner />
        <PredictNudge nudge={data.predictNudge} />

        {/* Three-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: Stats (horizontal) + Arena + Highlights */}
          <div className="flex flex-col gap-6 w-full lg:w-[22%] lg:max-w-[300px] lg:shrink-0">
            <ParticipationStats
              completed={data.participation.completed}
              pending={data.participation.pending}
              totalMatches={data.participation.totalMatches}
              horizontal
            />
            <ArenaStatusCard />
            {data.latestHighlights && (
              <HighlightsCard nuggets={data.latestHighlights} />
            )}
          </div>

          {/* Center column: Activity feed (hidden on mobile) */}
          <div className="hidden lg:flex flex-col gap-6 flex-1 min-w-0">
            <ActivityFeed items={data.activityFeed} currentUserId={session.user.id} />
          </div>

          {/* Right column: Countdown + Favorites + Next Match */}
          <div className="flex flex-col gap-6 w-full lg:w-[22%] lg:max-w-[300px] lg:shrink-0 min-w-0">
            {data.firstKickoff && <CountdownCard targetDate={data.firstKickoff} />}
            {data.favorites.length > 0 && <FavoritesCard favorites={data.favorites} />}
            {data.nextFavoriteMatch && <NextFavoriteMatchCard match={data.nextFavoriteMatch} />}
          </div>
        </div>
    </div>
  );
}
