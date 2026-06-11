"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ChatComment, ChatReply } from "@/lib/queries/matchDetail";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/ui/LikeButton";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LikersModal } from "@/components/ui/LikersModal";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

interface Props {
  matchId: string;
  matchStatus: string;
  commentCount: number;
  currentUserId: string;
}

function ReplyItem({
  reply,
  matchId,
  currentUserId,
  onLikeToggle,
  onDelete,
  deleteLabel,
}: {
  reply: ChatReply;
  matchId: string;
  currentUserId: string;
  onLikeToggle: (commentId: string, isReply: boolean) => void;
  onDelete: (commentId: string) => void;
  deleteLabel: string;
}) {
  const isOwner = reply.user.id === currentUserId;
  const [showLikers, setShowLikers] = useState(false);

  return (
    <div className="flex gap-2" style={{ paddingLeft: 36 }}>
      <Avatar nickname={reply.user.nickname} avatarUrl={reply.user.avatarUrl} size={28} />
      <div className="chat-bubble flex flex-col gap-1">
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            color: "var(--color-accent-amber)",
          }}
        >
          {reply.user.nickname}
        </span>
        {reply.text && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              fontFamily: "var(--font-body)",
              color: "color-mix(in srgb, var(--color-text-primary) 80%, transparent)",
              whiteSpace: "pre-wrap",
            }}
          >
            {reply.text}
          </span>
        )}
        {reply.imageUrl && (
          <img
            src={reply.imageUrl}
            alt=""
            style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4 }}
          />
        )}
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: 8,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
            }}
          >
            <TimeAgo date={reply.createdAt} />
          </span>
          <LikeButton
            liked={reply.liked}
            count={reply.likeCount}
            onToggle={() => onLikeToggle(reply.id, true)}
            onCountClick={reply.likeCount > 0 ? () => setShowLikers(true) : undefined}
            size="sm"
          />
          {isOwner && (
            <button
              onClick={() => onDelete(reply.id)}
              className="btn-icon"
              title={deleteLabel}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                delete
              </span>
            </button>
          )}
        </div>
      </div>
      {showLikers && (
        <LikersModal
          url={`/api/matches/${matchId}/chat/${reply.id}/likes`}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}

function CommentItem({
  comment,
  matchId,
  currentUserId,
  onLikeToggle,
  onReply,
  onDelete,
  deleteLabel,
}: {
  comment: ChatComment;
  matchId: string;
  currentUserId: string;
  onLikeToggle: (commentId: string, isReply: boolean) => void;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  deleteLabel: string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const isOwner = comment.user.id === currentUserId;

  return (
    <div className="flex flex-col gap-2" style={{ width: "100%" }}>
      <div className="flex gap-2" style={{ width: "100%" }}>
        <Avatar nickname={comment.user.nickname} avatarUrl={comment.user.avatarUrl} size={28} />
        <div className="chat-bubble flex flex-col gap-1">
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              color: "var(--color-accent-amber)",
            }}
          >
            {comment.user.nickname}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              fontFamily: "var(--font-body)",
              color: "color-mix(in srgb, var(--color-text-primary) 80%, transparent)",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {comment.text}
          </span>
          {comment.imageUrl && (
            <img
              src={comment.imageUrl}
              alt=""
              style={{
                maxWidth: "100%",
                borderRadius: 8,
                marginTop: 4,
              }}
            />
          )}
          <div className="flex items-center gap-3" style={{ width: "100%" }}>
            <span
              style={{
                fontSize: 8,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
              }}
            >
              <TimeAgo date={comment.createdAt} />
            </span>
            <LikeButton
              liked={comment.liked}
              count={comment.likeCount}
              onToggle={() => onLikeToggle(comment.id, false)}
              onCountClick={comment.likeCount > 0 ? () => setShowLikers(true) : undefined}
              size="sm"
            />
            <button
              onClick={() => {
                if (comment.replyCount > 0) setShowReplies(!showReplies);
                onReply(comment.id);
              }}
              className="btn-icon"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 10,
                  color: showReplies ? "var(--color-accent-amber)" : "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
                }}
              >
                chat_bubble
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  color: showReplies ? "var(--color-accent-amber)" : "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
                }}
              >
                {comment.replyCount}
              </span>
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="btn-icon ml-auto"
                title={deleteLabel}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  delete
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies &&
        comment.replies.map((r) => (
          <ReplyItem
            key={r.id}
            reply={r}
            matchId={matchId}
            currentUserId={currentUserId}
            onLikeToggle={onLikeToggle}
            onDelete={onDelete}
            deleteLabel={deleteLabel}
          />
        ))}
      {showLikers && (
        <LikersModal
          url={`/api/matches/${matchId}/chat/${comment.id}/likes`}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}

export function ChatPanel({ matchId, matchStatus, commentCount, currentUserId }: Props) {
  const t = useTranslations("matches.detail.chat");
  const placeholders = t.raw("placeholders") as string[];
  const [comments, setComments] = useState<ChatComment[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [text, setText] = useState("");
  const chatPlaceholder = useMemo(
    () => placeholders[Math.floor(Math.random() * placeholders.length)],
    [placeholders],
  );
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLive = matchStatus === "LIVE" || matchStatus === "HALFTIME";
  const chatTitle = isLive ? t("chat") : t("discussion");

  const fetchComments = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/chat?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setFetchError(false);
      } else if (isInitial) {
        setFetchError(true);
      }
    } catch {
      if (isInitial) setFetchError(true);
    }
  }, [matchId]);

  // Initial fetch
  useEffect(() => {
    fetchComments(true);
  }, [fetchComments]);

  // Polling for live matches
  useEffect(() => {
    if (isLive) {
      pollRef.current = setInterval(fetchComments, 15000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLive, fetchComments]);

  // Scroll to top on new messages (newest first)
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = 0;
    }
  }, [comments.length]);

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !imageFile) || sending) return;

    setSending(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) {
          clearImage();
          return;
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const url = replyTo
        ? `/api/matches/${matchId}/chat/${replyTo}/reply`
        : `/api/matches/${matchId}/chat`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, imageUrl }),
      });

      if (res.ok) {
        setText("");
        clearImage();
        setReplyTo(null);
        await fetchComments();
      }
    } finally {
      setSending(false);
    }
  };

  const handleLikeToggle = async (commentId: string, isReply: boolean) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (!isReply && c.id === commentId) {
          return { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 };
        }
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId
              ? { ...r, liked: !r.liked, likeCount: r.liked ? r.likeCount - 1 : r.likeCount + 1 }
              : r,
          ),
        };
      }),
    );

    try {
      const res = await fetch(`/api/matches/${matchId}/chat/${commentId}/like`, {
        method: "POST",
      });
      if (!res.ok) {
        // Revert on failure
        await fetchComments();
      }
    } catch {
      await fetchComments();
    }
  };

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
  };

  const handleDelete = (commentId: string) => {
    setConfirmAction({
      message: t("deleteConfirm"),
      action: async () => {
        try {
          const res = await fetch(`/api/matches/${matchId}/chat/${commentId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            await fetchComments();
          }
        } catch {
          // ignore
        }
      },
    });
  };

  return (
    <div
      className="flex flex-col w-full lg:w-[30%] lg:max-w-[500px] lg:shrink-0"
      style={{
        borderRadius: 16,
        background: "var(--color-bg-card)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "14px 16px",
          background: "var(--color-bg-card-secondary)",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-1.5">
          {isLive && (
            <div
              className="animate-ongoing"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-accent-green)",
              }}
            />
          )}
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: "var(--color-accent-amber)" }}
          >
            forum
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-amber)",
            }}
          >
            {chatTitle}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            letterSpacing: 1,
            color: "color-mix(in srgb, var(--color-text-primary) 50%, transparent)",
          }}
        >
          {commentCount}
        </span>
      </div>

      {/* Input */}
      <div
        className="flex flex-col gap-2"
        style={{
          padding: 12,
          background: "color-mix(in srgb, var(--color-bg-card-secondary) 25%, transparent)",
          flexShrink: 0,
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {replyTo && (
          <div
            className="flex items-center justify-between"
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: "var(--color-accent-amber)",
            }}
          >
            <span>{t("replyingTo")}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="btn-icon"
              style={{
                fontSize: 10,
              }}
            >
              {t("cancel")}
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative" style={{ borderRadius: 8, overflow: "hidden", maxHeight: 100 }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: "100%", objectFit: "cover", height: 100, display: "block" }}
            />
            <button
              onClick={clearImage}
              className="absolute flex items-center justify-center"
              style={{
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12, color: "white" }}>
                close
              </span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon"
            title={t("attachImage")}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: imageFile ? "var(--color-accent-gold)" : "var(--color-text-muted)" }}
            >
              image
            </span>
          </button>
          <div
            className="flex items-start flex-1"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--color-bg-input)",
              border: "1px solid color-mix(in srgb, var(--color-accent-amber) 18%, transparent)",
            }}
          >
            <AutoResizeTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={chatPlaceholder}
              maxLength={500}
              className="border-none outline-none flex-1"
              style={{
                background: "transparent",
                fontSize: 12,
                fontWeight: 400,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!text.trim() && !imageFile)}
              className="btn-icon shrink-0 mt-0.5"
              style={{
                opacity: sending || (!text.trim() && !imageFile) ? 0.3 : 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: "var(--color-accent-amber)" }}
              >
                send
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="flex flex-col gap-3 flex-1 overflow-y-auto"
        style={{ padding: 16 }}
      >
        {fetchError && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
              }}
            >
              {t("failedLoad")}
            </span>
            <button
              onClick={() => fetchComments(true)}
              className="btn-icon"
              style={{ fontSize: 12, color: "var(--color-accent-amber)" }}
            >
              {t("retry")}
            </button>
          </div>
        )}
        {!fetchError && comments.length === 0 && (
          <div
            className="flex items-center justify-center flex-1"
            style={{
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
            }}
          >
            {t("empty")}
          </div>
        )}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            matchId={matchId}
            currentUserId={currentUserId}
            onLikeToggle={handleLikeToggle}
            onReply={handleReply}
            onDelete={handleDelete}
            deleteLabel={t("delete")}
          />
        ))}
      </div>

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
    </div>
  );
}
