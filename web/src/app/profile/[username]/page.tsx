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

  function toProxyCoverUrl(mangaId: string, url?: string | null): string | undefined {
    if (!url) return undefined;
    try {
      if (url.startsWith("/api/images/cover")) {
        const u = new URL(url, "http://localhost");
        u.searchParams.set("mangaId", mangaId);
        u.searchParams.set("size", "256");
        return `${u.pathname}?${u.searchParams.toString()}`;
      }
      const parsed = new URL(url);
      const isUploads =
        parsed.hostname === "uploads.mangadex.org" ||
        parsed.hostname === "uploads-cdn.mangadex.org" ||
        parsed.hostname === "mangadex.org";
      if (!isUploads) {
        return url;
      }
      const segments = parsed.pathname.split("/").filter(Boolean);
      const fileSegment = segments[segments.length - 1] ?? "";
      const originalFile = fileSegment.replace(/\.256\.jpg$|\.512\.jpg$/i, "");
      const params = new URLSearchParams({
        mangaId,
        file: originalFile,
        size: "256",
      });
      return `/api/images/cover?${params.toString()}`;
    } catch {
      return url ?? undefined;
    }
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
