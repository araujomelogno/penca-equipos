/**
 * Pencachi logo — golden octopus icon (exported from .pen) + wordmark.
 */

interface LogoProps {
  /** Icon size in px. Default 28. */
  iconSize?: number;
  /** Font size for the "PENCACHI" wordmark in px. Default 24. */
  fontSize?: number;
  /** Render icon + text vertically instead of side-by-side. */
  vertical?: boolean;
}

export function Logo({
  iconSize = 28,
  fontSize = 24,
  vertical = false,
}: LogoProps) {
  return (
    <span
      className={`flex items-center ${vertical ? "flex-col gap-2" : "gap-3"}`}
    >
      <img
        src="/logo-octopus.png"
        alt=""
        width={iconSize}
        height={iconSize}
        aria-hidden="true"
        style={{ display: "block" }}
      />
      <span
        className="font-extrabold italic tracking-tight"
        style={{
          color: "var(--color-text-accent)",
          fontFamily: "var(--font-display)",
          fontSize,
        }}
      >
        PENCACHI
      </span>
    </span>
  );
}
