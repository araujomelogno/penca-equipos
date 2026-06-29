import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMatchDetailData } from "@/lib/queries/matchDetail";
import { MatchHero } from "@/components/match-detail/MatchHero";
import { CommunityPredictions } from "@/components/match-detail/CommunityPredictions";
import { MatchProbability } from "@/components/match-detail/MatchProbability";
import { AIAnalysis } from "@/components/match-detail/AIAnalysis";
import { ChatPanel } from "@/components/match-detail/ChatPanel";
import { MatchDetailTabs } from "@/components/match-detail/MatchDetailTabs";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ from?: string; live?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { matchId } = await params;
  const { from, live } = await searchParams;
  const t = await getTranslations("matches.detail");
  const teamLookup = await (await import("@/lib/team-i18n")).getTeamNameLookup();
  const backHref = from === "predictions" ? "/predictions" : "/matches";
  const backLabel = from === "predictions" ? t("backToPredictions") : t("backToMatches");
  const data = await getMatchDetailData(matchId, session.user.id);

  if (!data) notFound();

  const { match } = data;
  const isAdmin = (session.user as unknown as Record<string, boolean>).isAdmin;
  // ?live=on forces LIVE status (admin only)
  const effectiveStatus = (isAdmin && live === "on") ? "LIVE" : match.status;
  // Compute total users from community predictions
  const totalPredictionUsers = data.communityPredictions.reduce((sum, p) => sum + p.count, 0);

  return (
    <div
      className="flex flex-col flex-1"
      style={{ background: "var(--color-bg-primary)" }}
    >
      <div className="page-content flex-1" style={{ gap: 16 }}>
        {/* Navigation row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href={backHref}
            className="no-underline flex items-center gap-1"
            style={{ textDecoration: "none" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, color: "var(--color-text-secondary)" }}
            >
              arrow_back
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-secondary)",
              }}
            >
              {backLabel}
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {data.navigation.prevMatch ? (
              <Link
                href={`/matches/${data.navigation.prevMatch.id}${from ? `?from=${from}` : ""}`}
                className="flex items-center gap-0.5 sm:gap-1 no-underline"
                style={{
                  textDecoration: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-secondary)",
                  padding: "4px 6px",
                  borderRadius: 6,
                  background: "var(--color-bg-card)",
                  transition: "background 0.15s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                {data.navigation.prevMatch.homeCode} vs {data.navigation.prevMatch.awayCode}
              </Link>
            ) : (
              <span />
            )}

            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
              }}
            >
              {data.navigation.currentIndex + 1}/{data.navigation.totalMatches}
            </span>

            {data.navigation.nextMatch ? (
              <Link
                href={`/matches/${data.navigation.nextMatch.id}${from ? `?from=${from}` : ""}`}
                className="flex items-center gap-0.5 sm:gap-1 no-underline"
                style={{
                  textDecoration: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-secondary)",
                  padding: "4px 6px",
                  borderRadius: 6,
                  background: "var(--color-bg-card)",
                  transition: "background 0.15s",
                }}
              >
                {data.navigation.nextMatch.homeCode} vs {data.navigation.nextMatch.awayCode}
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* Desktop: Hero always visible */}
        <div className="hidden lg:block">
          <MatchHero data={data} />
        </div>

        {/* Mobile: tabbed layout (Match Info default / Discussion) */}
        <MatchDetailTabs
          discussion={
            <ChatPanel
              matchId={match.id}
              matchStatus={effectiveStatus}
              commentCount={data.commentCount}
              currentUserId={session.user.id}
            />
          }
          matchInfo={
            <div className="flex flex-col gap-4">
              <MatchHero data={data} />
              <CommunityPredictions
                predictions={data.communityPredictions}
                totalUsers={totalPredictionUsers}
              />
              <MatchProbability
                homeTeamName={teamLookup(match.homeTeam)}
                awayTeamName={teamLookup(match.awayTeam)}
                homeWin={match.homeWinProb ?? 0}
                draw={match.drawProb ?? 0}
                awayWin={match.awayWinProb ?? 0}
                communityOdds={data.communityOdds}
              />
              <AIAnalysis
                homeTeamName={teamLookup(match.homeTeam)}
                awayTeamName={teamLookup(match.awayTeam)}
                analysis={match.analysis}
                analysisEs={match.analysisEs}
                analysisEn={match.analysisEn}
              />
            </div>
          }
        />

        {/* Desktop: original side-by-side layout */}
        <div className="hidden lg:flex gap-6 flex-1 min-h-0">
          {/* Left column: info panels */}
          <div className="flex flex-col gap-5 flex-1 min-w-0 overflow-y-auto">
            <div className="flex gap-4 flex-1 min-h-0">
              <div className="flex-1 min-w-0">
                <CommunityPredictions
                  predictions={data.communityPredictions}
                  totalUsers={totalPredictionUsers}
                />
              </div>
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                <MatchProbability
                  homeTeamName={teamLookup(match.homeTeam)}
                  awayTeamName={teamLookup(match.awayTeam)}
                  homeWin={match.homeWinProb ?? 0}
                  draw={match.drawProb ?? 0}
                  awayWin={match.awayWinProb ?? 0}
                  communityOdds={data.communityOdds}
                />
                <AIAnalysis
                  homeTeamName={teamLookup(match.homeTeam)}
                  awayTeamName={teamLookup(match.awayTeam)}
                  analysis={match.analysis}
                  analysisEs={match.analysisEs}
                  analysisEn={match.analysisEn}
                />
              </div>
            </div>
          </div>

          {/* Chat panel */}
          <ChatPanel
            matchId={match.id}
            matchStatus={effectiveStatus}
            commentCount={data.commentCount}
            currentUserId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
}
