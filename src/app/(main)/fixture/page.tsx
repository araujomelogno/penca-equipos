import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getBracketData } from "@/lib/queries/bracket";
import { BracketView } from "@/components/fixture/BracketView";

export default async function FixturePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("fixture");
  const data = await getBracketData();

  return (
    <div className="page-content">
      <h1 className="page-title">{t("title")}</h1>
      <BracketView data={data} />
    </div>
  );
}
