import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface ProfilePageProps {
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
      timezone: true,
      createdAt: true,
      readingListEntries: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!dbUser) {
    notFound();
  }

  const isOwner = viewer?.id === dbUser.id;

  return (
    <ProfilePageContent
      isOwner={isOwner}
      user={{
        name: dbUser.name,
        email: dbUser.email,
        username: dbUser.username,
        bio: dbUser.bio,
        avatarUrl: dbUser.avatarUrl,
        timezone: dbUser.timezone,
        memberSince: dbUser.createdAt.toISOString(),
      }}
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
        coverImage: entry.coverImage,
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
    title: `Shujia | @${handle}`,
  };
}
