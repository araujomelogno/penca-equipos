"use client";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "8px 24px",
        borderTop: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--color-bg-card-secondary)",
            border: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: page <= 1 ? "default" : "pointer",
            opacity: page <= 1 ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            chevron_left
          </span>
        </button>

        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          const isActive = p === page;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: isActive ? "color-mix(in srgb, var(--color-accent-gold) 20%, transparent)" : "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "Inter, sans-serif",
                color: isActive ? "var(--color-text-accent)" : "var(--color-text-muted)",
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--color-bg-card-secondary)",
            border: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: page >= totalPages ? "default" : "pointer",
            opacity: page >= totalPages ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            chevron_right
          </span>
        </button>
      </div>

      <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "Inter, sans-serif", color: "var(--color-text-muted)" }}>
        <span className="hidden sm:inline">Showing </span>{start}-{end} of {total}
      </span>
    </div>
  );
}
