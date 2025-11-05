import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/profile")}`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
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
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />
      <ProfilePageContent
        user={{
          name: dbUser.name,
          email: dbUser.email,
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
    </div>
  );
}
