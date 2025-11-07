import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReadingListClient } from "@/components/reading-list/reading-list-client";
import { getCurrentUser } from "@/lib/auth/session";

interface ReadingListPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReadingListPage({ searchParams }: ReadingListPageProps) {
  const params = searchParams ? await searchParams : {};
  const usernameParam = params.username;
  const username =
    typeof usernameParam === "string"
      ? usernameParam
      : Array.isArray(usernameParam)
        ? usernameParam[0]
        : undefined;

  const viewer = await getCurrentUser();

  if (!username && viewer?.username) {
    const target = `/reading-list?username=${encodeURIComponent(viewer.username)}`;
    redirect(target);
  }

  const normalizedUsername = username?.trim().length ? username.trim() : undefined;
  const plainUsername = normalizedUsername?.replace(/^@/, "");
  const normalizedUsernameLower = plainUsername?.toLowerCase();
  const viewerUsernameLower = viewer?.username?.trim().toLowerCase();
  const viewerIsOwner =
    viewerUsernameLower && normalizedUsernameLower
      ? viewerUsernameLower === normalizedUsernameLower
      : Boolean(viewer && !normalizedUsernameLower);
  const initialOwnerLabel = plainUsername ? `@${plainUsername}` : undefined;

  return (
    <ReadingListClient
      username={normalizedUsername}
      viewerIsOwner={viewerIsOwner || undefined}
      initialOwnerLabel={initialOwnerLabel}
    />
  );
}

export async function generateMetadata({
  searchParams,
}: ReadingListPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const usernameParam = params.username;
  const username =
    typeof usernameParam === "string"
      ? usernameParam
      : Array.isArray(usernameParam)
        ? usernameParam[0]
        : undefined;

  const plainUsername = username?.trim().replace(/^@/, "") ?? null;
  const toPossessive = (value: string) =>
    value.endsWith("s") || value.endsWith("S") ? `${value}'` : `${value}'s`;
  const title = plainUsername ? `${toPossessive(plainUsername)} Reading List` : "Reading List";

  return { title };
}
