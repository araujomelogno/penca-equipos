"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SearchField } from "./SearchField";
import { Pagination } from "./Pagination";
import { ToggleSwitch } from "./ToggleSwitch";

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

interface PageData {
  codes: InvitationCode[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getStatus(code: InvitationCode): "active" | "inactive" | "expired" {
  if (!code.isActive && code.deactivatedAt) return "inactive";
  if (!code.isActive || new Date(code.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusBadge({ status }: { status: "active" | "inactive" | "expired" }) {
  if (status === "active") return null;

  const styles = {
    inactive: { bg: "color-mix(in srgb, var(--color-error-soft) 10%, transparent)", color: "var(--color-error-soft)", border: "color-mix(in srgb, var(--color-error-soft) 20%, transparent)", label: "Inactive" },
    expired: { bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", color: "var(--color-warning-soft)", border: "color-mix(in srgb, var(--color-warning) 20%, transparent)", label: "Expired" },
  };
  const s = styles[status];

  return (
    <div
      className="flex justify-center"
      style={{
        width: 100,
        borderRadius: 100,
        background: s.bg,
        padding: "4px 12px",
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: s.color }}>
        {s.label}
      </span>
    </div>
  );
}

export function InvitationCodesTable() {
  const [data, setData] = useState<PageData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async (s: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    params.set("page", String(p));
    const res = await fetch(`/api/admin/invitations?${params}`);
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetchData(search, page);
  }, [fetchData, search, page]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invitations", { method: "POST" });
      if (res.ok) {
        setSearch("");
        setPage(1);
        await fetchData("", 1);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivate = async (codeId: string) => {
    const res = await fetch(`/api/admin/invitations/${codeId}`, { method: "PATCH" });
    if (res.ok) fetchData(search, page);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(url);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (!data) return null;

  return (
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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: "var(--color-bg-card-secondary)", padding: "12px 16px", borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-accent-amber)" }}>link</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Invitation Codes
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SearchField value={search} onChange={handleSearchChange} placeholder="Search codes..." width={160} />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary shrink-0"
            style={{ borderRadius: 8, padding: "6px 14px", fontSize: 11 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            {generating ? "..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
      {/* Table header */}
      <div
        className="hidden sm:flex items-center"
        style={{ background: "var(--color-bg-card-secondary)", padding: "10px 16px", borderBottom: "1px solid var(--color-border-subtle)", minWidth: 520 }}
      >
        <span className="flex-1" style={thStyle}>CODE</span>
        <span style={{ ...thStyle, width: 100, textAlign: "center" }}>STATUS</span>
        <span style={{ ...thStyle, width: 60, textAlign: "center" }}>USES</span>
        <span style={{ ...thStyle, width: 120, textAlign: "center" }}>EXPIRES</span>
        <span style={{ ...thStyle, width: 80, textAlign: "center" }}>ACTIONS</span>
      </div>

      {/* Rows */}
      {data.codes.map((code) => {
        const status = getStatus(code);
        const isActive = status === "active";
        const textColor = isActive ? "var(--color-text-primary)" : "var(--color-text-muted)";

        return (
          <div key={code.id}>
            {/* Desktop row */}
            <div
              className="hidden sm:flex items-center"
              style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-border-faint)", minWidth: 520 }}
            >
              <div className="flex items-center gap-2 flex-1">
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: textColor }}>
                  {code.code}
                </span>
                {isActive && (
                  <button
                    onClick={() => handleCopyLink(code.code)}
                    className="flex items-center gap-1"
                    style={{
                      borderRadius: 6,
                      background: "color-mix(in srgb, var(--color-bg-elevated) 50%, transparent)",
                      padding: "4px 8px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      content_copy
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "Inter, sans-serif" }}>
                      Copy link
                    </span>
                  </button>
                )}
              </div>

              <div style={{ width: 100, display: "flex", justifyContent: "center" }}>
                {!isActive ? <StatusBadge status={status} /> : null}
              </div>

              <span style={{ width: 60, textAlign: "center", fontSize: 13, fontWeight: 600, color: textColor, fontFamily: "Inter, sans-serif" }}>
                {code.usageCount}/{code.maxUses}
              </span>

              <span style={{ width: 120, textAlign: "center", fontSize: 12, fontWeight: 500, color: isActive ? "var(--color-text-secondary)" : "var(--color-text-muted)", fontFamily: "Inter, sans-serif" }}>
                {new Date(code.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>

              <div style={{ width: 80, display: "flex", justifyContent: "center" }}>
                {isActive ? (
                  <ToggleSwitch checked={true} onChange={() => handleDeactivate(code.id)} />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>—</span>
                )}
              </div>
            </div>

            {/* Mobile row */}
            <Link
              href={`/admin/codes/${code.id}`}
              className="flex sm:hidden items-center justify-between"
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-faint)", textDecoration: "none", color: "inherit" }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: textColor }}>
                  {code.code}
                </span>
              </div>
              {isActive && (
                <button
                  onClick={(e) => { e.preventDefault(); handleCopyLink(code.code); }}
                  className="flex items-center gap-1 shrink-0"
                  style={{
                    borderRadius: 6,
                    background: "color-mix(in srgb, var(--color-bg-elevated) 50%, transparent)",
                    padding: "4px 8px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>content_copy</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "Inter, sans-serif" }}>Copy link</span>
                </button>
              )}
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "var(--color-text-muted)", marginLeft: 8 }}>
                chevron_right
              </span>
            </Link>
          </div>
        );
      })}

      {data.codes.length === 0 && (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
          No invitation codes found
        </div>
      )}
      </div>{/* end scrollable */}

      {/* Pagination */}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: "var(--color-text-muted)",
  fontFamily: "Inter, sans-serif",
};
