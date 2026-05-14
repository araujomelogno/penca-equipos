import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentWeek, getWeekHistory, getNostradamus, getCommunityVotes, getArenaLeaderboard } from "@/lib/queries/prediction-arena";
import { prisma } from "@/lib/prisma";
import { PredictionArenaView } from "@/components/prediction-arena/PredictionArenaView";

export default async function PredictionArenaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [week, history, nostradamus, teams, leaderboard] = await Promise.all([
    getCurrentWeek(session.user.id),
    getWeekHistory(session.user.id),
    getNostradamus(),
    prisma.team.findMany({
      select: { id: true, name: true, code: true, flagUrl: true },
      orderBy: { name: "asc" },
    }),
    getArenaLeaderboard(),
  ]);

  // Get community votes if there's a week
  const communityVotes = week ? await getCommunityVotes(week.id) : {};

  // Map predictions array to userPrediction and serialize dates
  const mappedWeek = week
    ? {
        ...week,
        events: week.events.map((e) => ({
          ...e,
          userPrediction: e.predictions[0] ?? null,
          predictions: undefined,
        })),
      }
    : null;

  const mappedHistory = history.map((w) => ({
    ...w,
    events: w.events.map((e) => ({
      ...e,
      userPrediction: e.predictions[0] ?? null,
      predictions: undefined,
    })),
  }));

  const serialized = JSON.parse(JSON.stringify({ week: mappedWeek, history: mappedHistory, nostradamus, communityVotes, leaderboard }));

  return (
    <div className="page-content">
      <PredictionArenaView
        week={serialized.week}
        history={serialized.history}
        nostradamus={serialized.nostradamus}
        communityVotes={serialized.communityVotes}
        leaderboard={serialized.leaderboard}
        teams={teams}
        userId={session.user.id}
      />
    </div>
  );
}
