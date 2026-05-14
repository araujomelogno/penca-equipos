import { prisma } from "@/lib/prisma";

export interface LikerInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

/** Get the list of users who liked a comment (max 50). */
export async function getCommentLikers(commentId: string): Promise<LikerInfo[]> {
  const likes = await prisma.commentLike.findMany({
    where: { commentId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
  });
  return likes.map((l) => l.user);
}

/** Get the list of users who liked an activity (max 50). */
export async function getActivityLikers(activityId: string): Promise<LikerInfo[]> {
  const likes = await prisma.activityLike.findMany({
    where: { activityId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
  });
  return likes.map((l) => l.user);
}
