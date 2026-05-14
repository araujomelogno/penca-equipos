import { prisma } from "@/lib/prisma";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const teams = await prisma.team.findMany({
    where: { group: { not: null } },
    select: { id: true, name: true, code: true, flagUrl: true },
    orderBy: { name: "asc" },
  });

  return <RegisterForm teams={teams} />;
}
