import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CodeDetail } from "./CodeDetail";

export default async function CodeDetailPage({
  params,
}: {
  params: Promise<{ codeId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = (session.user as unknown as Record<string, unknown>).isAdmin;
  if (!isAdmin) redirect("/home");

  const { codeId } = await params;

  return <CodeDetail codeId={codeId} />;
}
