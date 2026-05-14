import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserDetail } from "./UserDetail";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = (session.user as unknown as Record<string, unknown>).isAdmin;
  if (!isAdmin) redirect("/home");

  const { userId } = await params;

  return <UserDetail userId={userId} currentUserId={session.user.id} />;
}
