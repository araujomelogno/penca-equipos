import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/ui/StatCard";

interface ParticipationStatsProps {
  completed: number;
  pending: number;
  totalMatches: number;
  horizontal?: boolean;
}

export async function ParticipationStats({ completed, pending, totalMatches, horizontal }: ParticipationStatsProps) {
  const t = await getTranslations("home.stats");
  const items = [
    { value: String(totalMatches), label: t("matches") },
    { value: String(completed), label: t("predicted") },
    { value: String(pending), label: t("pending") },
  ];

  return (
    <div className={horizontal ? "flex flex-row gap-3" : "flex flex-row lg:flex-col gap-3"}>
      {items.map((item) => (
        <StatCard key={item.label} value={item.value} label={item.label} />
      ))}
    </div>
  );
}
