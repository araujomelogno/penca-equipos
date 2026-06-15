import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getCurrentWeek,
  getWeekDetail,
  getWeekHistory,
  getCommunityVotes,
  getArenaLeaderboard,
  getArenaTeams,
} from "@/lib/queries/prediction-arena";
import { getArenaParticipants } from "@/lib/queries/arena-participants";
import { buildWeekOptions, mapWeekForView } from "@/lib/prediction-arena-weeks";
import { PredictionArenaView } from "@/components/prediction-arena/PredictionArenaView";

export default async function PredictionArenaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [currentWeek, history, leaderboard] = await Promise.all([
    getCurrentWeek(userId),
    getWeekHistory(userId),
    getArenaLeaderboard(),
  ]);

  // Week shown by default: the current slot week, else the most recent resolved.
  const displayWeek =
    currentWeek ?? (history[0] ? await getWeekDetail(history[0].id, userId) : null);

  const weekOptions = buildWeekOptions(currentWeek, history);

  // Full detail for the displayed week. Teams are only needed for the open week
  // (its prediction dropdown); past weeks render read-only.
  let initialDetail = null;
  if (displayWeek) {
    const isOpen = displayWeek.status === "OPEN";
    const [teams, participants, communityVotes] = await Promise.all([
      isOpen
        ? getArenaTeams(new Date(displayWeek.weekStart), new Date(displayWeek.weekEnd))
        : Promise.resolve([]),
      getArenaParticipants(displayWeek.id),
      getCommunityVotes(displayWeek.id),
    ]);
    initialDetail = {
      week: mapWeekForView(displayWeek),
      participants,
      communityVotes,
      teams,
    };
  }

  const serialized = JSON.parse(
    JSON.stringify({ initialDetail, weekOptions, leaderboard }),
  );

  return (
    <div className="page-content">
      <PredictionArenaView
        initialDetail={serialized.initialDetail}
        weekOptions={serialized.weekOptions}
        leaderboard={serialized.leaderboard}
        userId={userId}
      />
    </div>
  );
}
