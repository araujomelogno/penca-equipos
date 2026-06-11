"use client";

import { useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/ui/LikeButton";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { LikersModal } from "@/components/ui/LikersModal";

interface ReplyData {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: string;
}

interface Props {
  commentId?: string;
  activityId?: string;
  likes: number;
  likedByMe: boolean;
  replies: number;
  userId: string;
  currentUserId: string;
  onDeleted?: () => void;
}

export function SocialRow({
  commentId,
  activityId,
  likes: initialLikes,
  likedByMe: initialLiked,
  replies: initialReplies,
  userId,
  currentUserId,
  onDeleted,
}: Props) {
  const t = useTranslations("activity.social");
  const replyPlaceholders = useTranslations("activity").raw("replyPlaceholders") as string[];
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [replyCount, setReplyCount] = useState(initialReplies);
  const [expanded, setExpanded] = useState(false);
  const [loadedReplies, setLoadedReplies] = useState<ReplyData[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const replyPlaceholder = useMemo(
    () => replyPlaceholders[Math.floor(Math.random() * replyPlaceholders.length)],
    [replyPlaceholders],
  );
  const [sendingReply, setSendingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(null);
  const [showLikers, setShowLikers] = useState(false);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isOwner = userId === currentUserId;

  // Determine API base path based on whether this is a comment or activity
  const isActivity = !commentId && !!activityId;
  const likeUrl = isActivity
    ? `/api/activity/items/${activityId}/like`
    : `/api/activity/comments/${commentId}/like`;
  const repliesUrl = isActivity
    ? `/api/activity/items/${activityId}/replies`
    : `/api/activity/comments/${commentId}/replies`;
  const replyUrl = isActivity
    ? `/api/activity/items/${activityId}/reply`
    : `/api/activity/comments/${commentId}/reply`;
  const likersUrl = isActivity
    ? `/api/activity/items/${activityId}/likes`
    : `/api/activity/comments/${commentId}/likes`;

  const handleLike = async () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    try {
      const res = await fetch(likeUrl, { method: "POST" });
      if (!res.ok) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handleToggleReplies = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (loadedReplies.length === 0 && replyCount > 0) {
      setLoadingReplies(true);
      try {
        const res = await fetch(repliesUrl);
        if (res.ok) {
          const data = await res.json();
          setLoadedReplies(
            data.replies.map((r: { id: string; userId: string; text: string; imageUrl?: string | null; createdAt: string; user: { nickname: string; avatarUrl: string | null } }) => ({
              id: r.id,
              userId: r.userId,
              nickname: r.user.nickname,
              avatarUrl: r.user.avatarUrl,
              text: r.text,
              imageUrl: r.imageUrl ?? null,
              createdAt: r.createdAt,
            })),
          );
        }
      } finally {
        setLoadingReplies(false);
      }
    }
  };

  const clearReplyImage = () => {
    setReplyImageFile(null);
    if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    setReplyImagePreview(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  };

  const handleReplyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyImageFile(file);
    setReplyImagePreview(URL.createObjectURL(file));
  };

  const handleReply = async () => {
    const trimmed = replyText.trim();
    if ((!trimmed && !replyImageFile) || sendingReply) return;

    setSendingReply(true);
    try {
      let imageUrl: string | undefined;

      if (replyImageFile) {
        const form = new FormData();
        form.append("file", replyImageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) {
          clearReplyImage();
          return;
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const res = await fetch(replyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const newReply: ReplyData = {
          id: data.reply.id,
          userId: currentUserId,
          nickname: data.reply.user.nickname,
          avatarUrl: data.reply.user.avatarUrl,
          text: data.reply.text,
          imageUrl: data.reply.imageUrl ?? null,
          createdAt: data.reply.createdAt,
        };
        setLoadedReplies((prev) => [...prev, newReply]);
        setReplyText("");
        clearReplyImage();
        setReplyCount((c) => c + 1);
      }
    } finally {
      setSendingReply(false);
    }
  };

  const doDeleteReply = async (replyId: string) => {
    try {
      const res = await fetch(`/api/activity/comments/${replyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLoadedReplies((prev) => prev.filter((r) => r.id !== replyId));
        setReplyCount((c) => c - 1);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setConfirmAction({
      message: t("deleteReplyConfirm"),
      action: () => doDeleteReply(replyId),
    });
  };

  const handleDelete = () => {
    if (deleting) return;
    setConfirmAction({
      message: t("deleteCommentConfirm"),
      action: doDelete,
    });
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/activity/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onDeleted) {
          onDeleted();
        } else {
          router.refresh();
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Action buttons */}
      <div className="flex items-center gap-4" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 80%, transparent)" }}>
        <LikeButton liked={liked} count={likeCount} onToggle={handleLike} onCountClick={likeCount > 0 ? () => setShowLikers(true) : undefined} />

        <button
          onClick={handleToggleReplies}
          className="flex items-center gap-1 border-none bg-transparent cursor-pointer p-0"
          style={{ color: "inherit" }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14, color: expanded ? "var(--color-accent-amber)" : "color-mix(in srgb, var(--color-text-secondary) 67%, transparent)" }}
          >
            chat_bubble
          </span>
          <span style={{ fontSize: 11, fontWeight: 600 }}>{replyCount}</span>
        </button>

        {isOwner && commentId && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-icon ml-auto"
            title={t("delete")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              delete
            </span>
          </button>
        )}
      </div>

      {/* Replies section */}
      {expanded && (
        <div
          className="flex flex-col gap-0"
          style={{
            marginLeft: 8,
            borderLeft: "2px solid var(--color-border-subtle)",
            paddingLeft: 12,
          }}
        >
          {loadingReplies && (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", padding: "4px 0" }}>{t("loading")}</span>
          )}

          {loadedReplies.map((reply) => (
            <div
              key={reply.id}
              className="flex gap-2 py-2"
            >
              <Avatar nickname={reply.nickname} avatarUrl={reply.avatarUrl} size={24} />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {reply.nickname}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                    <TimeAgo date={reply.createdAt} />
                  </span>
                  {reply.userId === currentUserId && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="btn-icon ml-auto"
                      title={t("deleteReply")}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        close
                      </span>
                    </button>
                  )}
                </div>
                {reply.text && (
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {reply.text}
                  </p>
                )}
                {reply.imageUrl && (
                  <div className="overflow-hidden mt-1" style={{ borderRadius: 8, maxHeight: 200 }}>
                    <ImageLightbox src={reply.imageUrl} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Reply input */}
          <div className="flex flex-col gap-1 mt-1">
            {/* Reply image preview */}
            {replyImagePreview && (
              <div className="relative" style={{ borderRadius: 8, overflow: "hidden", maxHeight: 80 }}>
                <img
                  src={replyImagePreview}
                  alt="Preview"
                  style={{ width: "100%", objectFit: "cover", height: 80, display: "block" }}
                />
                <button
                  onClick={clearReplyImage}
                  className="absolute flex items-center justify-center"
                  style={{
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 10, color: "white" }}>
                    close
                  </span>
                </button>
              </div>
            )}
            <div
              className="flex items-start gap-2"
              style={{
                borderRadius: 8,
                background: "var(--color-bg-input)",
                padding: "6px 10px",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <input
                ref={replyFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleReplyFileSelect}
                className="hidden"
              />
              <button
                onClick={() => replyFileInputRef.current?.click()}
                className="btn-icon shrink-0 mt-0.5"
                title={t("attachImage")}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: replyImageFile ? "var(--color-accent-gold)" : "var(--color-text-muted)" }}
                >
                  image
                </span>
              </button>
              <AutoResizeTextarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleReplyKeyDown}
                placeholder={replyPlaceholder}
                maxLength={500}
                maxRows={4}
                className="flex-1"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
              />
              <button
                onClick={handleReply}
                disabled={(!replyText.trim() && !replyImageFile) || sendingReply}
                className="shrink-0 mt-0.5"
                style={{
                  borderRadius: 100,
                  background: (replyText.trim() || replyImageFile) ? "var(--color-accent-gold)" : "color-mix(in srgb, var(--color-accent-gold) 40%, transparent)",
                  padding: "6px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Inter, sans-serif",
                  color: "var(--color-text-accent-dark)",
                  border: "none",
                  cursor: (replyText.trim() || replyImageFile) ? "pointer" : "default",
                }}
              >
                {sendingReply ? "..." : t("reply")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.action();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showLikers && (
        <LikersModal
          url={likersUrl}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}
