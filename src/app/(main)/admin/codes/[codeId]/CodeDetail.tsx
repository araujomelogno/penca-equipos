"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

interface InvitationCode {
  id: string;
  code: string;
  isActive: boolean;
  usageCount: number;
  maxUses: number;
  expiresAt: string;
  deactivatedAt: string | null;
  createdAt: string;
}

function getStatus(code: InvitationCode): "active" | "inactive" | "expired" {
  if (!code.isActive && code.deactivatedAt) return "inactive";
  if (!code.isActive || new Date(code.expiresAt) < new Date()) return "expired";
  return "active";
}

interface Props {
  codeId: string;
}

export function CodeDetail({ codeId }: Props) {
  const router = useRouter();
  const [code, setCode] = useState<InvitationCode | null>(null);

  useEffect(() => {
    fetch(`/api/admin/invitations/${codeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCode(d.invitation));
  }, [codeId]);

  const handleDeactivate = async () => {
    const res = await fetch(`/api/admin/invitations/${codeId}`, { method: "PATCH" });
    if (res.ok) {
      const d = await res.json();
      setCode(d.invitation);
    }
  };

  const handleCopyLink = () => {
    if (!code) return;
    const url = `${window.location.origin}/register?code=${code.code}`;
    navigator.clipboard.writeText(url);
  };

  if (!code) return null;

  const status = getStatus(code);
  const isActive = status === "active";

  return (
    <div className="page-content">
      {/* Back */}
      <button
        onClick={() => router.push("/admin")}
        className="btn-icon"
        style={{ gap: 6, color: "var(--color-text-secondary)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Admin</span>
      </button>

      {/* Card */}
      <div
        style={{
          borderRadius: 16,
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2"
          style={{ background: "var(--color-bg-card-secondary)", padding: "14px 16px", borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-accent-amber)" }}>link</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Code Detail
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4" style={{ padding: 16 }}>
          {/* Code value */}
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
              {code.code}
            </span>
            {!isActive && <StatusBadge status={status} />}
          </div>

          {/* Copy link */}
          {isActive && (
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2"
              style={{
                borderRadius: 8,
                background: "color-mix(in srgb, var(--color-bg-elevated) 50%, transparent)",
                padding: "10px 16px",
                border: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>content_copy</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", fontFamily: "Inter, sans-serif" }}>
                Copy invitation link
              </span>
            </button>
          )}

          {/* Info rows */}
          <div className="flex flex-col" style={{ gap: 1, borderRadius: 10, overflow: "hidden" }}>
            <InfoRow label="Status" value={isActive ? "Active" : status === "expired" ? "Expired" : "Inactive"} />
            <InfoRow label="Uses" value={`${code.usageCount}/${code.maxUses}`} />
            <InfoRow
              label="Expires"
              value={new Date(code.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
            <InfoRow
              label="Created"
              value={new Date(code.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
          </div>

          {/* Deactivate */}
          {isActive && (
            <div className="flex items-center justify-between" style={{ padding: "12px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "Inter, sans-serif" }}>
                Active
              </span>
              <ToggleSwitch checked={true} onChange={() => handleDeactivate()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ background: "var(--color-bg-card-secondary)", padding: "10px 14px" }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", fontFamily: "Inter, sans-serif" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "Inter, sans-serif" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "inactive" | "expired" }) {
  const styles = {
    inactive: { bg: "color-mix(in srgb, var(--color-error-soft) 10%, transparent)", color: "var(--color-error-soft)", border: "color-mix(in srgb, var(--color-error-soft) 20%, transparent)", label: "Inactive" },
    expired: { bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", color: "var(--color-warning-soft)", border: "color-mix(in srgb, var(--color-warning) 20%, transparent)", label: "Expired" },
  };
  const s = styles[status];

  return (
    <div
      style={{
        borderRadius: 100,
        background: s.bg,
        padding: "4px 12px",
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: s.color }}>{s.label}</span>
    </div>
  );
}
