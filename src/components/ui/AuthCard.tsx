"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

interface AuthCardProps {
  children: ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col gap-10"
      style={{
        background: "var(--color-bg-glass)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <Logo iconSize={40} fontSize={32} vertical />
      </div>

      {children}
    </div>
  );
}
