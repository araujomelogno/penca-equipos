import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getNostradamus } from "@/lib/queries/prediction-arena";

export async function NostradamusCard() {
  const t = await getTranslations("home.nostradamus");
  const data = await getNostradamus();

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: "var(--color-bg-card)",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🔮</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-violet)",
          }}
        >
          {t("title")}
        </span>
      </div>

      {data?.user ? (
        <div className="flex items-center gap-3">
          {data.user.avatarUrl ? (
            <img
              src={data.user.avatarUrl}
              alt={data.user.nickname}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--color-accent-violet)",
              }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--color-accent-violet) 13%, transparent)",
                border: "2px solid var(--color-accent-violet)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-accent-violet)",
              }}
            >
              {data.user.nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              {data.user.nickname}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {t("weekAndPoints", { week: data.weekNumber, points: data.totalPoints })}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            fontStyle: "italic",
          }}
        >
          {t("empty")}
        </div>
      )}

      <Link
        href="/prediction-arena"
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-accent-gold)",
          textDecoration: "none",
        }}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
