"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AvatarPreset } from "@/lib/avatarPresets";

interface TeamOption {
  id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

interface UserData {
  nickname: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
  favoriteTeamId: string | null;
}

interface Props {
  user: UserData;
  presets: AvatarPreset[];
  teams: TeamOption[];
}

function AvatarDisplay({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null;
  nickname: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        width={160}
        height={160}
        className="rounded-full object-cover"
        style={{
          width: 160,
          height: 160,
          border: "4px solid var(--color-bg-highlight)",
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: 160,
        height: 160,
        border: "4px solid var(--color-bg-highlight)",
        background: "var(--color-bg-card-secondary)",
        fontSize: 48,
        fontWeight: 800,
        fontFamily: "var(--font-display)",
        color: "var(--color-text-secondary)",
      }}
    >
      {nickname.charAt(0).toUpperCase()}
    </div>
  );
}

function AvatarGallery({
  presets,
  selectedId,
  onSelect,
  onClose,
}: {
  presets: AvatarPreset[];
  selectedId: string | null;
  onSelect: (preset: AvatarPreset) => void;
  onClose: () => void;
}) {
  const t = useTranslations("profile");
  return (
    <div
      className="flex flex-col gap-4"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-amber)",
          }}
        >
          {t("chooseAvatar")}
        </span>
        <button
          onClick={onClose}
          className="border-none bg-transparent cursor-pointer"
          style={{ padding: 0 }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: "var(--color-text-muted)" }}
          >
            close
          </span>
        </button>
      </div>
      <div
        className="grid gap-3 grid-cols-4 sm:grid-cols-6"
      >
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="border-none cursor-pointer p-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              overflow: "hidden",
              outline: p.id === selectedId ? "3px solid var(--color-accent-gold)" : "3px solid transparent",
              outlineOffset: 2,
              background: "var(--color-bg-card-secondary)",
              flexShrink: 0,
            }}
          >
            <img
              src={p.url}
              alt={p.label}
              width={48}
              height={48}
              className="object-cover"
              style={{
                width: 48,
                height: 48,
                display: "block",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function PasswordForm() {
  const t = useTranslations("profile.password");
  const tErr = useTranslations("profile.errors");
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || tErr("failedPassword") });
        return;
      }

      setMessage({ type: "success", text: tErr("passwordSuccess") });
      setCurrentPassword("");
      setNewPassword("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        padding: "12px 16px",
        borderRadius: 16,
        background: "var(--color-bg-card-secondary)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "color-mix(in srgb, var(--color-accent-peach) 20%, transparent)",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 22, color: "var(--color-accent-peach)" }}
          >
            key
          </span>
        </div>
        <div className="flex flex-col gap-1.5" style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-primary)",
            }}
          >
            {t("title")}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-secondary)",
            }}
          >
            {t("description")}
          </span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="border-none bg-transparent cursor-pointer p-0 text-left"
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 1,
                color: "var(--color-accent-gold)",
              }}
            >
              {t("cta")}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 pl-0 sm:pl-[52px]">
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("current")}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-none outline-none"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("new")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-none outline-none"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving || !currentPassword || !newPassword}
              className="btn-primary"
              style={{ padding: "10px 24px", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? t("saving") : t("update")}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setCurrentPassword("");
                setNewPassword("");
                setMessage(null);
              }}
              className="btn-secondary"
              style={{ padding: "10px 24px", border: "none", letterSpacing: 0 }}
            >
              {t("cancel")}
            </button>
          </div>
          {message && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: message.type === "success" ? "var(--color-accent-green)" : "var(--color-accent-red)",
              }}
            >
              {message.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProfileForm({ user, presets, teams }: Props) {
  const t = useTranslations("profile");
  const tErr = useTranslations("profile.errors");
  const tTeam = useTranslations("teams");
  const teamLabel = (team: { code: string; name: string }) => {
    try {
      const v = tTeam(team.code as never);
      if (typeof v === "string" && v && v !== team.code) return v;
    } catch {}
    return team.name;
  };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [nickname, setNickname] = useState(user.nickname);
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarPreset, setAvatarPreset] = useState(user.avatarPreset);
  const [favoriteTeamId, setFavoriteTeamId] = useState(user.favoriteTeamId ?? "");
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasChanges =
    nickname !== user.nickname ||
    fullName !== (user.fullName ?? "") ||
    favoriteTeamId !== (user.favoriteTeamId ?? "");

  const handleSave = async () => {
    if (!hasChanges || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {};
      if (nickname !== user.nickname) body.nickname = nickname;
      if (fullName !== (user.fullName ?? "")) body.fullName = fullName;
      if (favoriteTeamId !== (user.favoriteTeamId ?? "")) body.favoriteTeamId = favoriteTeamId;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || tErr("failedSave") });
        return;
      }

      setMessage(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(user.nickname);
    setFullName(user.fullName ?? "");
    setFavoriteTeamId(user.favoriteTeamId ?? "");
    setMessage(null);
  };

  const handlePresetSelect = async (preset: AvatarPreset) => {
    setAvatarPreset(preset.id);
    setAvatarUrl(preset.url);
    setShowGallery(false);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPreset: preset.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || tErr("failedAvatar") });
        return;
      }

      router.refresh();
    } catch {
      setMessage({ type: "error", text: tErr("failedAvatar") });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || tErr("failedUpload") });
        return;
      }

      const { url } = await res.json();
      setAvatarUrl(url);
      setAvatarPreset(null);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">{t("title")}</h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-secondary)",
          }}
        >
          {t("subtitle")}
        </p>
      </div>

      {/* Main card */}
      <div
        className="flex flex-col lg:flex-row"
        style={{
          borderRadius: 16,
          border: "1px solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Avatar column */}
        <div
          className="flex flex-col items-center justify-center gap-5 border-b lg:border-b-0 lg:border-r"
          style={{
            width: "auto",
            maxWidth: "100%",
            padding: 24,
            background: "var(--color-bg-card-secondary)",
            borderColor: "var(--color-border-subtle)",
            flexShrink: 0,
          }}
        >
          <AvatarDisplay avatarUrl={avatarUrl} nickname={nickname} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-outline"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              photo_camera
            </span>
            {uploading ? t("uploading") : t("changePhoto")}
          </button>
          <button
            onClick={() => {
              setShowGallery((prev) => {
                if (!prev) setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                return !prev;
              });
            }}
            className="btn-outline"
            style={{ fontSize: 10, color: "var(--color-text-muted)" }}
          >
            {t("orChooseAvatar")}
          </button>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
            }}
          >
            {t("photoHint")}
          </span>
        </div>

        {/* Form column */}
        <div
          className="flex flex-col gap-4 flex-1 p-4 sm:p-6 lg:p-8"
          style={{
            background: "var(--color-bg-card)",
          }}
        >
          {/* Nickname */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("fields.nickname")}
            </label>
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
              }}
            >
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="border-none outline-none flex-1"
                style={{
                  background: "transparent",
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                }}
              />
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "var(--color-text-muted)" }}
              >
                edit
              </span>
            </div>
          </div>

          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("fields.fullName")}
            </label>
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
              }}
            >
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-none outline-none flex-1"
                style={{
                  background: "transparent",
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                }}
              />
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "var(--color-text-muted)" }}
              >
                edit
              </span>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("fields.email")}
            </label>
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
                opacity: 0.6,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                }}
              >
                {user.email}
              </span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "var(--color-text-muted)" }}
              >
                lock
              </span>
            </div>
          </div>

          {/* Favorite Team */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                letterSpacing: 3,
                color: "color-mix(in srgb, var(--color-accent-amber) 60%, transparent)",
              }}
            >
              {t("fields.team")}
            </label>
            <div
              className="flex items-center gap-3"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid color-mix(in srgb, var(--color-text-placeholder) 10%, transparent)",
              }}
            >
              {favoriteTeamId && teams.find((t) => t.id === favoriteTeamId)?.flagUrl && (
                <img
                  src={teams.find((t) => t.id === favoriteTeamId)!.flagUrl!}
                  alt=""
                  width={24}
                  height={16}
                  style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <select
                value={favoriteTeamId}
                onChange={(e) => setFavoriteTeamId(e.target.value)}
                className="border-none outline-none flex-1"
                style={{
                  background: "transparent",
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="" style={{ background: "var(--color-bg-input)" }}>
                  {t("fields.teamPlaceholder")}
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id} style={{ background: "var(--color-bg-input)" }}>
                    {teamLabel(team)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons — only visible when there are unsaved changes */}
          {hasChanges && (
            <div className="flex items-center gap-3" style={{ paddingTop: 8 }}>
              <button
                onClick={handleCancel}
                className="btn-secondary"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {/* Message */}
          {message && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: message.type === "success" ? "var(--color-accent-green)" : "var(--color-accent-red)",
              }}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>

      {/* Avatar gallery */}
      {showGallery && (
        <div ref={galleryRef}>
          <AvatarGallery
            presets={presets}
            selectedId={avatarPreset}
            onSelect={handlePresetSelect}
            onClose={() => setShowGallery(false)}
          />
        </div>
      )}

      {/* Change password */}
      <PasswordForm />
    </div>
  );
}
