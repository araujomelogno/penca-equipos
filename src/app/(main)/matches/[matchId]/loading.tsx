export default function MatchDetailLoading() {
  return (
    <div
      className="flex flex-col flex-1"
      style={{ background: "var(--color-bg-primary)" }}
    >
      <div className="page-content flex-1" style={{ gap: 16 }}>
        {/* Nav skeleton */}
        <div className="flex items-center justify-between">
          <div
            className="animate-pulse"
            style={{
              width: 120,
              height: 20,
              borderRadius: 6,
              background: "var(--color-bg-card)",
            }}
          />
          <div
            className="animate-pulse"
            style={{
              width: 200,
              height: 20,
              borderRadius: 6,
              background: "var(--color-bg-card)",
            }}
          />
        </div>

        {/* Hero skeleton */}
        <div
          className="animate-pulse"
          style={{
            height: 280,
            borderRadius: 16,
            background: "var(--color-bg-card)",
          }}
        />

        {/* Content skeleton */}
        <div className="flex gap-6 flex-1">
          <div
            className="flex-1 animate-pulse"
            style={{
              height: 200,
              borderRadius: 16,
              background: "var(--color-bg-card)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
