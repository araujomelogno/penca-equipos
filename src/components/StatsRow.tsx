import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/ui/StatCard";

interface StatsRowProps {
  matchesFinished: number;
  accuracy: number;
  streak: number;
}

export async function StatsRow({ matchesFinished, accuracy, streak }: StatsRowProps) {
  const t = await getTranslations("home.stats");
  const items = [
    { value: String(matchesFinished), label: t("matches") },
    { value: `${accuracy}%`, label: t("accuracy") },
    { value: String(streak), label: t("streak") },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full" style={{ gap: 12 }}>
      {items.map((item) => (
        <StatCard key={item.label} value={item.value} label={item.label} />
      ))}
    </div>
  );
}
