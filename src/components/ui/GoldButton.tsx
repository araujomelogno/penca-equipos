"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface GoldButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function GoldButton({
  children,
  loading = false,
  disabled = false,
  type = "submit",
}: GoldButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className="w-full rounded-[10px] py-4 text-sm font-black tracking-[3px] transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      style={{
        background: `linear-gradient(to bottom, var(--color-accent-gold), var(--color-accent-amber))`,
        color: "var(--color-text-accent-dark)",
        fontFamily: "var(--font-display)",
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
