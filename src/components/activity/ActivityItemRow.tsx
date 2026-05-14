import { TimeAgo } from "@/components/ui/TimeAgo";
import { Avatar } from "@/components/ui/Avatar";
import { SocialRow } from "@/components/activity/SocialRow";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { HighlightsNuggetList } from "@/components/activity/HighlightsNuggetList";

export interface ActivityItemData {
  id: string;
  activityId: string;
  type: "comment" | "match_result" | "user_joined" | "daily_highlights";
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  matchId: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  detail: string;
  imageUrl: string | null;
  likes: number;
  likedByMe: boolean;
  replies: number;
  createdAt: string;
  highlightNuggets?: { type: string; text: string; priority: number }[];
}

function IconCircle({ bg, icon, iconColor }: { bg: string; icon: string; iconColor: string }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{ width: 40, height: 40, borderRadius: "50%", background: bg }}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{ fontSize: 20, color: iconColor }}
      >
        {icon}
      </span>
    </div>
  );
}

function MatchRef({ homeTeamCode, awayTeamCode }: { homeTeamCode: string | null; awayTeamCode: string | null }) {
  if (!homeTeamCode || !awayTeamCode) return null;
  return (
    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
      {homeTeamCode} vs {awayTeamCode}
    </span>
  );
}


interface ActivityItemRowProps {
  item: ActivityItemData;
  currentUserId?: string;
  onDeleted?: (id: string) => void;
}

export function ActivityItemRow({ item, currentUserId = "", onDeleted }: ActivityItemRowProps) {
  const headerRow = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[14px] font-bold truncate" style={{ color: "#e5deff" }}>
          {item.nickname}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MatchRef homeTeamCode={item.homeTeamCode} awayTeamCode={item.awayTeamCode} />
        <span style={{ fontSize: 11, color: "#d0c5b2CC", fontWeight: 700, letterSpacing: 1 }}>
          <TimeAgo date={item.createdAt} />
        </span>
      </div>
    </div>
  );

  const detailText = (
    <p
      className="text-[13px] leading-[1.4]"
      style={{
        color: "#d0c5b2",
        whiteSpace: "pre-wrap",
        ...(item.type !== "comment" ? {
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        } : {}),
      }}
    >
      {item.detail}
    </p>
  );

  let left: React.ReactNode;
  if (item.type === "comment") {
    left = <Avatar nickname={item.nickname} avatarUrl={item.avatarUrl} />;
  } else if (item.type === "match_result") {
    left = <IconCircle bg="#6366f11A" icon="scoreboard" iconColor="#818cf8" />;
  } else if (item.type === "daily_highlights") {
    left = (
      <div className="shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
        <img src="/logo-octopus.png" alt="" width={40} height={40} />
      </div>
    );
  } else {
    left = <IconCircle bg="#e9c46a1A" icon="person_add" iconColor="#e9c46a" />;
  }

  const social = item.type === "comment" ? (
    <SocialRow
      commentId={item.id}
      likes={item.likes}
      likedByMe={item.likedByMe}
      replies={item.replies}
      userId={item.userId}
      currentUserId={currentUserId}
      onDeleted={onDeleted ? () => onDeleted(item.id) : undefined}
    />
  ) : (
    <SocialRow
      activityId={item.activityId}
      likes={item.likes}
      likedByMe={item.likedByMe}
      replies={item.replies}
      userId=""
      currentUserId={currentUserId}
    />
  );

  const detail = item.type === "daily_highlights" && item.highlightNuggets?.length
    ? <HighlightsNuggetList nuggets={item.highlightNuggets} />
    : detailText;

  const body = (
    <div className="flex gap-3" style={{ padding: "16px 16px 16px 10px" }}>
      {left}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {headerRow}
        {detail}
        {item.type === "comment" && item.imageUrl && (
          <div className="overflow-hidden mt-1" style={{ borderRadius: 10, maxHeight: 400 }}>
            <ImageLightbox src={item.imageUrl} />
          </div>
        )}
        {social}
      </div>
    </div>
  );

  if (item.matchId) {
    return (
      <div>
        <a href={`/matches/${item.matchId}`} className="block hover:bg-white/[0.02] transition-colors">
          {body}
        </a>
      </div>
    );
  }

  return <div>{body}</div>;
}
