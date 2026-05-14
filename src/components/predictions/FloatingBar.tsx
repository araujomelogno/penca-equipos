"use client";

import { useTranslations } from "next-intl";

interface Props {
  unsavedCount: number;
  saving: boolean;
  hasErrors: boolean;
  savedMessage: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FloatingBar({ unsavedCount, saving, hasErrors, savedMessage, onSave, onDiscard }: Props) {
  const t = useTranslations("predictions.floating");
  if (unsavedCount === 0 && !savedMessage) return null;

  // After successful save — show confirmation, no action buttons
  if (savedMessage && unsavedCount === 0) {
    return (
      <div
        className="flex items-center justify-center sticky bottom-0 z-10"
        style={{
          padding: "16px clamp(16px, 5vw, 80px)",
          background: "rgba(13, 10, 33, 0.95)",
          borderTop: "1px solid var(--color-border-light)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-gold)",
          }}
        >
          {t("saved")}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between sticky bottom-0 z-10"
      style={{
        padding: "12px clamp(16px, 5vw, 80px)",
        background: "rgba(13, 10, 33, 0.95)",
        borderTop: "1px solid var(--color-border-light)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Left: Summary */}
      <div className="flex flex-col gap-0.5">
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            letterSpacing: 2,
            color: "var(--color-text-muted)",
          }}
        >
          {t("summary")}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: hasErrors ? "var(--color-error, #ef4444)" : "var(--color-text-primary)",
          }}
        >
          {hasErrors ? t("incomplete") : t("unsaved", { n: unsavedCount })}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onDiscard}
          className="btn-secondary"
        >
          {t("discard")}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary"
          style={{ padding: "16px 48px", borderRadius: 12, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
