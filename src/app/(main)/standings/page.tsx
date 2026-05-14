import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getFixturesData } from "@/lib/queries/fixtures";
import { StageFilter } from "@/components/fixtures/StageFilter";
import { GroupGrid } from "@/components/fixtures/GroupGrid";
import { KnockoutView } from "@/components/fixtures/KnockoutView";

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("standings");
  const { stage } = await searchParams;
  const stageParam = typeof stage === "string" ? stage : undefined;

  const data = await getFixturesData(stageParam);

  return (
    <>
      <div className="page-content">
          {/* Title */}
          <h1 className="page-title">{t("title")}</h1>

          {/* Stage filter tabs */}
          <StageFilter stages={data.stages} activeStage={data.activeStage} />

          {/* Content */}
          {data.activeStage === "GROUP" ? (
            <GroupGrid groups={data.groups} />
          ) : (
            <KnockoutView matches={data.knockoutMatches} />
          )}
      </div>
    </>
  );
}
