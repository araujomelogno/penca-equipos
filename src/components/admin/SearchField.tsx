"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  width?: number;
}

export function SearchField({ value, onChange, placeholder, width = 200 }: Props) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        width,
        borderRadius: 8,
        background: "#0e0928",
        padding: "8px 12px",
        border: "1px solid #FFFFFF0D",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--color-text-primary)",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          width: "100%",
        }}
      />
    </div>
  );
}
