"use client";

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  onCountClick?: () => void;
  size?: "sm" | "md";
}

const styles = {
  sm: { icon: 10, text: 8, active: "var(--color-accent-amber)", inactive: "color-mix(in srgb, var(--color-text-primary) 25%, transparent)" },
  md: { icon: 14, text: 11, active: "var(--color-accent-amber)", inactive: "color-mix(in srgb, var(--color-text-secondary) 67%, transparent)" },
} as const;

export function LikeButton({ liked, count, onToggle, onCountClick, size = "md" }: LikeButtonProps) {
  const s = styles[size];
  const color = liked ? s.active : s.inactive;

  return (
    <span className="flex items-center gap-1">
      <button
        onClick={onToggle}
        className="flex items-center border-none bg-transparent cursor-pointer"
        style={{ padding: 0 }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: s.icon,
            color,
            fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          favorite
        </span>
      </button>
      {onCountClick && count > 0 ? (
        <button
          onClick={onCountClick}
          className="border-none bg-transparent cursor-pointer"
          style={{
            padding: 0,
            fontSize: s.text,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color,
            textDecoration: "none",
          }}
        >
          {count}
        </button>
      ) : (
        <span
          style={{
            fontSize: s.text,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color,
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
