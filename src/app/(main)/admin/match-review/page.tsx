import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MatchReviewTable } from "@/components/admin/MatchReviewTable";

export default async function MatchReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = (session.user as unknown as Record<string, unknown>).isAdmin;
  if (!isAdmin) redirect("/home");

  return (
    <>
      <div className="page-content">
        <MatchReviewTable />
      </div>
    </>
  );
}
