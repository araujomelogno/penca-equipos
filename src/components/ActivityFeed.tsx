import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ActivityItem } from "@/lib/queries/home";
import { ActivityItemRow, type ActivityItemData } from "@/components/activity/ActivityItemRow";
import { HomeComposer } from "@/components/activity/HomeComposer";

interface Props {
  items: ActivityItem[];
  currentUserId: string;
}

function toItemData(item: ActivityItem): ActivityItemData {
  return {
    id: item.id,
    activityId: item.activityId,
    type: item.type,
    userId: item.userId,
    nickname: item.nickname,
    avatarUrl: item.avatarUrl,
    matchId: item.matchId,
    homeTeamCode: item.homeTeamCode,
    awayTeamCode: item.awayTeamCode,
    detail: item.detail,
    imageUrl: item.imageUrl,
    likes: item.likes,
    likedByMe: item.likedByMe,
    replies: item.replies,
    createdAt: item.createdAt.toISOString(),
  };
}

function FeedHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between" style={{ width: "100%" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 900,
          fontStyle: "italic",
          color: "var(--color-text-primary)",
          letterSpacing: -0.5,
          margin: 0,
        }}
      >
        {title}
      </h2>
      <Link
        href="/activity"
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: "var(--color-bg-elevated)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--color-text-secondary)" }}
        >
          dynamic_feed
        </span>
      </Link>
    </div>
  );
}

export async function ActivityFeed({ items, currentUserId }: Props) {
  const t = await getTranslations("home.feed");
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col gap-3"
        style={{
          borderRadius: 12,
          background: "var(--color-bg-card)",
          padding: 16,
        }}
      >
        <FeedHeader title={t("title")} />
        <HomeComposer />
        <p
          className="text-center py-8"
          style={{ color: "var(--color-text-muted)", margin: 0 }}
        >
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        borderRadius: 12,
        background: "var(--color-bg-card)",
        padding: 16,
        overflow: "hidden",
      }}
    >
      <FeedHeader title={t("title")} />
      <HomeComposer />

      {/* Feed list */}
      <div
        style={{
          borderRadius: 12,
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && (
              <div style={{ height: 1, background: "var(--color-border-subtle)" }} />
            )}
            <ActivityItemRow item={toItemData(item)} currentUserId={currentUserId} />
          </div>
        ))}
      </div>
    </div>
  );
}
