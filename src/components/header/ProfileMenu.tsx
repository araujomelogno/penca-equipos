"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/app/actions/auth";
import Link from "next/link";

interface Props {
  avatarUrl: string | null;
  nickname: string | null;
}

export function ProfileMenu({ avatarUrl, nickname }: Props) {
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="border-none bg-transparent cursor-pointer p-0 flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nickname ?? "Profile"}
            width={32}
            height={32}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid var(--color-bg-highlight)",
            }}
          />
        ) : (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, width: 32, height: 32, color: "var(--color-text-secondary)" }}
          >
            account_circle
          </span>
        )}
      </button>

      {open && (
        <div
          className="flex flex-col"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 200,
            borderRadius: 12,
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border-light)",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* User info */}
          <div
            className="flex items-center gap-3"
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nickname ?? ""}
                width={36}
                height={36}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--color-bg-highlight)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 36, color: "var(--color-text-secondary)", flexShrink: 0 }}
              >
                account_circle
              </span>
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {nickname ?? t("profileFallback")}
            </span>
          </div>

          {/* Menu items */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
            style={{
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-card-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
            {t("editProfile")}
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 border-none bg-transparent cursor-pointer w-full text-left"
            style={{
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-secondary)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-card-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            {t("logOut")}
          </button>
        </div>
      )}
    </div>
  );
}
