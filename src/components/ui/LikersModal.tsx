"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface Liker {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface Props {
  url: string;
  onClose: () => void;
}

export function LikersModal({ url, onClose }: Props) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setLikers(data.likers);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Focus close button on mount, handle Escape
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Likes"
    >
      <div
        className="flex flex-col"
        style={{
          background: "var(--color-bg-card)",
          borderRadius: 16,
          border: "1px solid var(--color-border-subtle)",
          width: "min(340px, 90vw)",
          maxHeight: "60vh",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            Likes
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-text-muted)" }}>
              close
            </span>
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: "8px 0" }}>
          {loading && (
            <div className="flex items-center justify-center" style={{ padding: 24 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Loading...</span>
            </div>
          )}
          {!loading && likers.length === 0 && (
            <div className="flex items-center justify-center" style={{ padding: 24 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No likes yet</span>
            </div>
          )}
          {likers.map((liker) => (
            <div
              key={liker.id}
              className="flex items-center gap-3"
              style={{ padding: "8px 16px" }}
            >
              <Avatar nickname={liker.nickname} avatarUrl={liker.avatarUrl} size={32} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {liker.nickname}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
