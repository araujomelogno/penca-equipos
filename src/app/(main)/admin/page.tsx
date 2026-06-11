import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InvitationCodesTable } from "@/components/admin/InvitationCodesTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { GenerateHighlightsButton } from "@/components/admin/GenerateHighlightsButton";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = (session.user as unknown as Record<string, unknown>).isAdmin;
  if (!isAdmin) redirect("/home");

  const t = await getTranslations("admin");

  return (
    <>
      <div className="page-content">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="page-title">{t("title")}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/admin/match-review"
                className="flex items-center gap-2"
                style={{
                  borderRadius: 12,
                  padding: "10px 20px",
                  border: "1px solid var(--color-border-light)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
                  fact_check
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                  {t("reviewMatches")}
                </span>
              </Link>
              <Link
                href="/admin/prediction-arena"
                className="flex items-center gap-2"
                style={{
                  borderRadius: 12,
                  padding: "10px 20px",
                  border: "1px solid var(--color-border-light)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
                  casino
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                  {t("predictionArena")}
                </span>
              </Link>
              <GenerateHighlightsButton />
            </div>
          </div>

          {/* Invitation Codes */}
          <InvitationCodesTable />

          {/* Users */}
          <UsersTable currentUserId={session.user.id} />
      </div>
    </>
  );
}
