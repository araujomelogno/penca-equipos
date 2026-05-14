import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function HeroBanner() {
  const t = await getTranslations("home.hero");
  return (
    <div
      className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-xl"
      style={{
        background: "var(--color-bg-card)",
        padding: "20px 24px",
      }}
    >
      <span
        className="hidden sm:inline"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 900,
          fontStyle: "italic",
          letterSpacing: -0.5,
          color: "var(--color-accent-gold)",
        }}
      >
        {t("title")}
      </span>

      <Link
        href="/predictions"
        className="shrink-0 w-full sm:w-auto text-center text-xs font-bold no-underline"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: "#3e2e00",
          background: "linear-gradient(to right, var(--color-accent-gold), var(--color-accent-amber))",
          padding: "12px 32px",
          borderRadius: "100px",
        }}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
