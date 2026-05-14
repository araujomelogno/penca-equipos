"use client";

import { useState, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

interface Props {
  onPosted?: () => void;
}

export function HomeComposer({ onPosted }: Props) {
  const t = useTranslations("activity.composer");
  const placeholders = t.raw("placeholders") as string[];
  const [text, setText] = useState("");
  const placeholder = useMemo(
    () => placeholders[Math.floor(Math.random() * placeholders.length)],
    [placeholders],
  );
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const trimmed = text.trim();
  const canPost = (trimmed.length > 0 || imageFile) && trimmed.length <= 500 && !sending;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!canPost) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) return;
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const res = await fetch("/api/activity/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, imageUrl }),
      });

      if (res.ok) {
        setText("");
        clearImage();
        if (onPosted) {
          onPosted();
        } else {
          router.refresh();
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div
      className="flex gap-3"
      style={{
        borderRadius: 16,
        background: "#2a2646",
        padding: "12px 16px 12px 10px",
        border: "1px solid #FFFFFF0D",
      }}
    >
      {/* Avatar */}
      <span
        className="material-symbols-outlined shrink-0"
        style={{ fontSize: 40, color: "var(--color-text-muted)" }}
      >
        account_circle
      </span>

      {/* Right column */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {/* Input row */}
        <div
          style={{
            borderRadius: 10,
            background: "#0e0928",
            padding: "12px 16px",
            border: "1px solid #FFFFFF0D",
          }}
        >
          <AutoResizeTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={500}
            className="flex-1 w-full"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="relative" style={{ borderRadius: 8, overflow: "hidden", maxHeight: 120 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: "100%", objectFit: "cover", height: 120, display: "block" }}
            />
            <button
              onClick={clearImage}
              className="absolute flex items-center justify-center"
              style={{
                top: 6,
                right: 6,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#fff" }}>
                close
              </span>
            </button>
          </div>
        )}

        {/* Actions row: attach icons left, Post button right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
              title={t("attachImage")}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: imageFile ? "var(--color-accent-gold)" : "#64748b" }}
              >
                image
              </span>
            </button>
          </div>

          <button
            onClick={handlePost}
            disabled={!canPost}
            className="btn-primary"
            style={{ borderRadius: 100, padding: "8px 24px", opacity: canPost ? 1 : 0.45 }}
          >
            {sending ? "..." : t("post")}
          </button>
        </div>
      </div>
    </div>
  );
}
