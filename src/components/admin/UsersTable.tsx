"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchField } from "./SearchField";
import { Pagination } from "./Pagination";
import { ToggleSwitch } from "./ToggleSwitch";

interface UserRow {
  id: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PageData {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function UserAvatar({ user, size = 32 }: { user: UserRow; size?: number }) {
  const src = user.avatarUrl || user.avatarPreset;
  return (
    <div
      className="shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: size / 2, background: "#353151" }}
    >
      {src ? (
        <Image src={src} alt={user.nickname} width={size} height={size} className="object-cover" style={{ borderRadius: size / 2 }} unoptimized={src.startsWith("/uploads/")} />
      ) : (
        <span className="font-bold select-none" style={{ color: "#e5deff", fontSize: size * 0.35 }}>
          {user.nickname.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

interface Props {
  currentUserId: string;
}

export function UsersTable({ currentUserId }: Props) {
  const [data, setData] = useState<PageData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (s: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    params.set("page", String(p));
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetchData(search, page);
  }, [fetchData, search, page]);

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) fetchData(search, page);
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
        background: "#2a2646",
        border: "1px solid #FFFFFF0D",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: "#1b1736", padding: "12px 16px", borderBottom: "1px solid #FFFFFF0D" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#e9c46a" }}>group</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "#e5deff" }}>
            Users
          </span>
        </div>
        <SearchField value={search} onChange={handleSearchChange} placeholder="Search users..." width={180} />
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
      {/* Table header */}
      <div
        className="hidden sm:flex items-center"
        style={{ background: "#1b1736", padding: "10px 16px", borderBottom: "1px solid #FFFFFF0D", minWidth: 520 }}
      >
        <span className="flex-1" style={thStyle}>USER</span>
        <span style={{ ...thStyle, width: 220 }}>EMAIL</span>
        <span style={{ ...thStyle, width: 100, textAlign: "center" }}>JOINED</span>
        <span style={{ ...thStyle, width: 100, textAlign: "center" }}>ACTIONS</span>
      </div>

      {/* Rows */}
      {data.users.map((user) => {
        const isSelf = user.id === currentUserId;
        return (
          <div key={user.id}>
            {/* Desktop row */}
            <div
              className="hidden sm:flex items-center"
              style={{ padding: "10px 16px", borderBottom: "1px solid #FFFFFF08", minWidth: 520 }}
            >
              {/* User cell */}
              <div className="flex items-center gap-2.5 flex-1">
                {user.isAdmin ? (
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#e9c46a" }}>
                    shield_person
                  </span>
                ) : (
                  <div style={{ width: 18 }} />
                )}
                <UserAvatar user={user} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: user.isAdmin ? 700 : 600,
                    fontFamily: "Inter, sans-serif",
                    color: user.isAdmin ? "#ffe19e" : "#e5deff",
                  }}
                >
                  {user.nickname}
                </span>
              </div>

              {/* Email */}
              <span style={{ width: 220, fontSize: 12, fontWeight: 500, color: "#d0c5b2", fontFamily: "Inter, sans-serif" }}>
                {user.email}
              </span>

              {/* Joined */}
              <span style={{ width: 100, textAlign: "center", fontSize: 12, fontWeight: 500, color: "#64748b", fontFamily: "Inter, sans-serif" }}>
                {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>

              {/* Actions */}
              <div style={{ width: 100, display: "flex", justifyContent: "center" }}>
                {isSelf ? (
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>—</span>
                ) : (
                  <ToggleSwitch
                    checked={user.isActive}
                    onChange={(checked) => handleToggleActive(user.id, checked)}
                  />
                )}
              </div>
            </div>

            {/* Mobile row */}
            <Link
              href={`/admin/users/${user.id}`}
              className="flex sm:hidden items-center gap-2.5"
              style={{ padding: "12px 16px", borderBottom: "1px solid #FFFFFF08", textDecoration: "none", color: "inherit" }}
            >
              {user.isAdmin ? (
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#e9c46a" }}>shield_person</span>
              ) : (
                <div style={{ width: 18 }} />
              )}
              <UserAvatar user={user} />
              <span
                className="flex-1 min-w-0 truncate"
                style={{
                  fontSize: 13,
                  fontWeight: user.isAdmin ? 700 : 600,
                  fontFamily: "Inter, sans-serif",
                  color: user.isAdmin ? "#ffe19e" : "#e5deff",
                }}
              >
                {user.nickname}
              </span>
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: "#64748b" }}>
                chevron_right
              </span>
            </Link>
          </div>
        );
      })}

      {data.users.length === 0 && (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
          No users found
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
  color: "#64748b",
  fontFamily: "Inter, sans-serif",
};
