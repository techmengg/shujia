import { prisma } from "@/lib/prisma";

export interface FollowingActivityItem {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  manga: {
    provider: string;
    mangaId: string;
    title: string;
  };
  status: string | null;
  rating: number | null;
  progress: string | null;
  updatedAt: string;
}

const ACTIVITY_LIMIT = 10;

/**
 * Recent reading-list activity from users the viewer follows. Not cached at
 * the lib level because the result is per-viewer (cache key would need the
 * viewer id and a list of follow ids — page-level memoization handles it).
 */
export async function getFollowingActivity(
  viewerId: string,
): Promise<FollowingActivityItem[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  if (!follows.length) return [];

  const ids = follows.map((f) => f.followingId);
  const entries = await prisma.readingListEntry.findMany({
    where: { userId: { in: ids } },
    orderBy: { updatedAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      id: true,
      provider: true,
      mangaId: true,
      title: true,
      status: true,
      rating: true,
      progress: true,
      updatedAt: true,
      user: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    user: {
      id: e.user.id,
      username: e.user.username,
      name: e.user.name,
      avatarUrl: e.user.avatarUrl,
    },
    manga: { provider: e.provider, mangaId: e.mangaId, title: e.title },
    status: e.status,
    rating: e.rating,
    progress: e.progress,
    updatedAt: e.updatedAt.toISOString(),
  }));
}
