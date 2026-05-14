"use client";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-5"
        style={{
          background: "var(--color-bg-card)",
          borderRadius: 16,
          padding: "24px 28px",
          border: "1px solid var(--color-border-light)",
          maxWidth: 340,
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-primary)" }}>
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            style={{
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              color: "var(--color-text-secondary)",
              background: "transparent",
              border: "1px solid var(--color-border-light)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              color: "var(--color-text-accent-dark)",
              background: "var(--color-accent-red)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
