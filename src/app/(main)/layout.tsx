import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let avatarUrl: string | null = null;
  let nickname: string | null = null;
  let isAdmin = false;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true, nickname: true, isAdmin: true },
    });
    avatarUrl = user?.avatarUrl ?? null;
    nickname = user?.nickname ?? null;
    isAdmin = user?.isAdmin ?? false;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header avatarUrl={avatarUrl} nickname={nickname} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
