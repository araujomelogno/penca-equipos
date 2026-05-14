interface StatCardProps {
  value: string | number;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl gap-1 flex-1 min-w-0"
      style={{
        background: "var(--color-bg-card)",
        padding: "16px 12px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 900,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
