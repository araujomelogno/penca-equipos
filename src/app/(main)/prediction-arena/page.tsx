import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentWeek, getWeekHistory, getNostradamus, getCommunityVotes, getArenaLeaderboard, getArenaTeams } from "@/lib/queries/prediction-arena";
import { PredictionArenaView } from "@/components/prediction-arena/PredictionArenaView";

export default async function PredictionArenaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Week first: teams and community votes depend on it
  const week = await getCurrentWeek(session.user.id);

  const [history, nostradamus, teams, leaderboard, communityVotes] = await Promise.all([
    getWeekHistory(session.user.id),
    getNostradamus(),
    // Only teams that actually play within the arena week make sense as predictions
    week ? getArenaTeams(new Date(week.weekStart), new Date(week.weekEnd)) : Promise.resolve([]),
    getArenaLeaderboard(),
    week ? getCommunityVotes(week.id) : Promise.resolve({}),
  ]);

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
