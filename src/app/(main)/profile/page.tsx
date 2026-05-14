import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, teams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        nickname: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        avatarPreset: true,
        favoriteTeamId: true,
      },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, flagUrl: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <>
      <div className="page-content">
        <ProfileForm user={user} presets={AVATAR_PRESETS} teams={teams} />
      </div>
    </>
  );
}
