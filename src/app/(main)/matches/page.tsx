import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMatchesData } from "@/lib/queries/matches";
import { DateSelector } from "@/components/matches/DateSelector";
import { StageFilter } from "@/components/matches/StageFilter";
import { StatusFilter } from "@/components/matches/StatusFilter";
import { MatchList } from "@/components/matches/MatchList";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("matches");
  const sp = await searchParams;
  const filters = {
    date: typeof sp.date === "string" ? sp.date : undefined,
    stage: typeof sp.stage === "string" ? sp.stage : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
  };

  const data = await getMatchesData(session.user.id, filters);

  const currentParams = {
    // Raw param (e.g. "all") so stage/status links preserve the chosen date view.
    date: filters.date,
    stage: filters.stage || "ALL",
    status: filters.status || "ALL",
  };

  // Build href without date for DateSelector
  const baseParts: string[] = [];
  if (currentParams.stage !== "ALL") baseParts.push(`stage=${currentParams.stage}`);
  if (currentParams.status !== "ALL") baseParts.push(`status=${currentParams.status}`);
  const dateBaseHref = `/matches${baseParts.length ? `?${baseParts.join("&")}` : ""}`;

  return (
    <>
      <div className="page-content">
          {/* Header: Title + Date pills */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="page-title">{t("title")}</h1>
            <DateSelector
              pills={data.datePills}
              selectedDate={data.filters.date}
              baseHref={dateBaseHref}
              allMatchDates={data.allMatchDates}
            />
          </div>

          {/* Filters section */}
          <div className="flex flex-col gap-4">
            {/* Phase tabs */}
            <StageFilter
              stages={data.stages}
              activeStage={currentParams.stage}
              currentParams={currentParams}
            />

            {/* Status pills */}
            <StatusFilter
              activeStatus={currentParams.status}
              currentParams={currentParams}
            />
          </div>

          {/* Match list */}
          <MatchList dateGroups={data.dateGroups} />
      </div>
    </>
  );
}
