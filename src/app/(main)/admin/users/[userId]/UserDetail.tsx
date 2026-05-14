"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

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

interface Props {
  userId: string;
  currentUserId: string;
}

export function UserDetail({ userId, currentUserId }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UserRow | null>(null);
  const isSelf = userId === currentUserId;

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user));
  }, [userId]);

  const handleToggleActive = async (isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      const d = await res.json();
      setUser((prev) => (prev ? { ...prev, ...d.user } : prev));
    }
  };

  if (!user) return null;

  const avatarSrc = user.avatarUrl || user.avatarPreset;

  return (
    <div className="page-content">
      {/* Back */}
      <button
        onClick={() => router.push("/admin")}
        className="btn-icon"
        style={{ gap: 6, color: "#d0c5b2" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>Admin</span>
      </button>

      {/* Card */}
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
          className="flex items-center gap-2"
          style={{ background: "#1b1736", padding: "14px 16px", borderBottom: "1px solid #FFFFFF0D" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#e9c46a" }}>person</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "#e5deff" }}>
            User Detail
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4" style={{ padding: 16 }}>
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 flex items-center justify-center overflow-hidden"
              style={{ width: 48, height: 48, borderRadius: 24, background: "#353151" }}
            >
              {avatarSrc ? (
                <Image src={avatarSrc} alt={user.nickname} width={48} height={48} className="object-cover" style={{ borderRadius: 24 }} unoptimized={avatarSrc.startsWith("/uploads/")} />
              ) : (
                <span className="font-bold select-none" style={{ color: "#e5deff", fontSize: 17 }}>
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {user.isAdmin && (
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#e9c46a" }}>shield_person</span>
                )}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    color: user.isAdmin ? "#ffe19e" : "#e5deff",
                  }}
                >
                  {user.nickname}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#d0c5b2", fontFamily: "Inter, sans-serif" }}>
                {user.email}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="flex flex-col" style={{ gap: 1, borderRadius: 10, overflow: "hidden" }}>
            <InfoRow label="Role" value={user.isAdmin ? "Admin" : "User"} />
            <InfoRow label="Status" value={user.isActive ? "Active" : "Disabled"} />
            <InfoRow
              label="Joined"
              value={new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
          </div>

          {/* Toggle active */}
          {!isSelf && (
            <div className="flex items-center justify-between" style={{ padding: "12px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e5deff", fontFamily: "Inter, sans-serif" }}>
                Account active
              </span>
              <ToggleSwitch checked={user.isActive} onChange={handleToggleActive} />
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
      style={{ background: "#1b1736", padding: "10px 14px" }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: "Inter, sans-serif" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#d0c5b2", fontFamily: "Inter, sans-serif" }}>{value}</span>
    </div>
  );
}
