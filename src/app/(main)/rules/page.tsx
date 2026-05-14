import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("rules");
  return (
    <div className="page-content">
      <h1 className="page-title">{t("title")}</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {t("comingSoon")}
      </p>
    </div>
  );
}
