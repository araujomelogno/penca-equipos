"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import AuthCard from "@/components/ui/AuthCard";
import FormInput from "@/components/ui/FormInput";
import GoldButton from "@/components/ui/GoldButton";

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

function RegisterFormInner({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tTeam = useTranslations("teams");
  const teamLabel = (team: { code: string; name: string }) => {
    try {
      const v = tTeam(team.code as never);
      if (typeof v === "string" && v && v !== team.code) return v;
    } catch {}
    return team.name;
  };
  const fields = [
    { id: "reg-code" as const, label: t("code"), icon: "confirmation_number", type: "text" as const, placeholder: t("codePlaceholder") },
    { id: "reg-nickname" as const, label: t("nickname"), icon: "person", type: "text" as const, placeholder: t("nicknamePlaceholder") },
    { id: "reg-email" as const, label: t("email"), icon: "mail", type: "email" as const, placeholder: t("emailPlaceholder") },
    { id: "reg-password" as const, label: t("password"), icon: "lock", type: "password" as const, placeholder: t("passwordPlaceholder") },
  ];
  const searchParams = useSearchParams();
  const [values, setValues] = useState({
    "reg-code": searchParams.get("code") ?? "",
    "reg-nickname": "",
    "reg-email": "",
    "reg-password": "",
  });
  const [favoriteTeamId, setFavoriteTeamId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationCode: values["reg-code"],
        nickname: values["reg-nickname"],
        email: values["reg-email"],
        password: values["reg-password"],
        favoriteTeamId: favoriteTeamId || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t("failed"));
    } else {
      const loginResult = await signIn("credentials", {
        email: values["reg-email"],
        password: values["reg-password"],
        redirect: false,
      });

      if (loginResult?.error) {
        router.push("/login");
      } else {
        router.push("/home");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <AuthCard>
        <div className="flex flex-col gap-5">
          {fields.map((f) => (
            <FormInput
              key={f.id}
              id={f.id}
              label={f.label}
              icon={f.icon}
              type={f.type}
              placeholder={f.placeholder}
              value={values[f.id]}
              onChange={(v) => updateField(f.id, v)}
            />
          ))}

          {/* Favorite team selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reg-team"
              className="text-[10px] font-bold tracking-[3px]"
              style={{ color: "rgba(255, 225, 158, 0.6)" }}
            >
              {t("favoriteTeam")}
            </label>
            <div className="relative">
              <span
                className="absolute left-3.5 top-3.5 material-symbols-outlined text-[20px]"
                style={{ color: "#99907e" }}
              >
                flag
              </span>
              <select
                id="reg-team"
                value={favoriteTeamId}
                onChange={(e) => setFavoriteTeamId(e.target.value)}
                className="w-full rounded-[10px] py-3.5 pl-11 pr-4 text-sm focus:outline focus:outline-2 focus:outline-offset-[-1px] appearance-none cursor-pointer"
                style={{
                  background: "var(--color-bg-input)",
                  border: "1px solid var(--color-border-subtle)",
                  color: favoriteTeamId ? "var(--color-text-primary)" : "#99907e",
                  fontFamily: "var(--font-body)",
                  outlineColor: "var(--color-accent-amber)",
                }}
              >
                <option value="">{t("teamPlaceholder")}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
              <span
                className="absolute right-3.5 top-3.5 material-symbols-outlined text-[20px] pointer-events-none"
                style={{ color: "#99907e" }}
              >
                expand_more
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--color-accent-red)" }}>
              {error}
            </p>
          )}

          <GoldButton loading={loading}>{t("submit")}</GoldButton>
        </div>

        <div
          className="flex items-center justify-center gap-1 text-[13px]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <span style={{ color: "var(--color-text-secondary)" }}>
            {t("hasAccount")}
          </span>
          <Link
            href="/login"
            className="font-bold"
            style={{ color: "var(--color-text-accent)" }}
          >
            {t("login")}
          </Link>
        </div>
      </AuthCard>
    </form>
  );
}

export function RegisterForm({ teams }: { teams: Team[] }) {
  return (
    <Suspense fallback={<div className="h-[600px]" />}>
      <RegisterFormInner teams={teams} />
    </Suspense>
  );
}
