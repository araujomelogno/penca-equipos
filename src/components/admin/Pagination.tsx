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
        borderTop: "1px solid #FFFFFF0D",
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
            background: "#1b1736",
            border: "1px solid #FFFFFF0D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: page <= 1 ? "default" : "pointer",
            opacity: page <= 1 ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#64748b" }}>
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
                background: isActive ? "#ffe19e33" : "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "Inter, sans-serif",
                color: isActive ? "#ffe19e" : "#64748b",
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
            background: "#1b1736",
            border: "1px solid #FFFFFF0D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: page >= totalPages ? "default" : "pointer",
            opacity: page >= totalPages ? 0.4 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#64748b" }}>
            chevron_right
          </span>
        </button>
      </div>

      <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "Inter, sans-serif", color: "#64748b" }}>
        <span className="hidden sm:inline">Showing </span>{start}-{end} of {total}
      </span>
    </div>
  );
}
