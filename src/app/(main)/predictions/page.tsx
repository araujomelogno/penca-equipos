import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPredictionsData } from "@/lib/queries/predictions";
import { PredictionsForm } from "@/components/predictions/PredictionsForm";

export default async function PredictionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getPredictionsData(session.user.id);

  return (
    <>
      <PredictionsForm data={data} />
    </>
  );
}
