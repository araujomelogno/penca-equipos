import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PredictionArenaAdmin } from "@/components/admin/PredictionArenaAdmin";

export default async function AdminPredictionArenaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = (session.user as unknown as Record<string, unknown>).isAdmin;
  if (!isAdmin) redirect("/home");

  return (
    <div className="page-content">
      <h1 className="page-title">Prediction Arena</h1>
      <PredictionArenaAdmin />
    </div>
  );
}
