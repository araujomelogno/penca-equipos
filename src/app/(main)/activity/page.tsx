import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivityFeed } from "@/lib/queries/activity";
import { ActivityFeedList } from "@/components/activity/ActivityFeedList";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getActivityFeed("all", undefined, undefined, session.user.id);

  const items = data.items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <>
      <ActivityFeedList
        initialItems={items}
        initialNextCursor={data.nextCursor}
        currentUserId={session.user.id}
      />
    </>
  );
}
