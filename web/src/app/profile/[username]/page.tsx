import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ProfileByUsernamePage({ params }: ProfilePageProps) {
  const { username: incomingUsername } = await params;
  const rawUsername = incomingUsername?.trim();

  if (!rawUsername) {
    notFound();
  }

  const username = decodeURIComponent(rawUsername).toLowerCase();
  const viewer = await getCurrentUser();

  const dbUser = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      profileColor: true,
      favoriteMangaIds: true,
      timezone: true,
      createdAt: true,
      readingListEntries: {
        orderBy: { updatedAt: "desc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          provider: true,
          mangaId: true,
          rating: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  if (!dbUser) {
    notFound();
  }

  const isOwner = viewer?.id === dbUser.id;

  function toProxyCoverUrl(_mangaId: string, url?: string | null): string | undefined {
    return url ?? undefined;
  }

  return (
    <ProfilePageContent
      isOwner={isOwner}
      user={{
        name: dbUser.name,
        email: dbUser.email,
        username: dbUser.username,
        bio: dbUser.bio,
        avatarUrl: dbUser.avatarUrl,
        bannerUrl: dbUser.bannerUrl,
        profileColor: dbUser.profileColor,
        favoriteMangaIds: dbUser.favoriteMangaIds,
        timezone: dbUser.timezone,
        memberSince: dbUser.createdAt.toISOString(),
      }}
      reviews={dbUser.reviews.map((review) => ({
        id: review.id,
        provider: review.provider,
        mangaId: review.mangaId,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt.toISOString(),
      }))}
      readingList={dbUser.readingListEntries.map((entry) => ({
        id: entry.id,
        mangaId: entry.mangaId,
        title: entry.title,
        altTitles: entry.altTitles,
        description: entry.description,
        status: entry.status,
        demographic: entry.demographic,
        latestChapter: entry.latestChapter,
        languages: entry.languages,
        tags: entry.tags,
        coverImage: toProxyCoverUrl(entry.mangaId, entry.coverImage) ?? null,
        url: entry.url,
        progress: entry.progress,
        rating: entry.rating,
        notes: entry.notes,
        updatedAt: entry.updatedAt.toISOString(),
      }))}
    />
  );
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const handle = (username ?? "user").trim();
  return {
    title: handle,
  };
}
