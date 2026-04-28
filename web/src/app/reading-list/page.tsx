import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface LegacyReadingListPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickUsernameParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().replace(/^@/, "");
  return trimmed.length ? trimmed.toLowerCase() : undefined;
}

export default async function LegacyReadingListPage({
  searchParams,
}: LegacyReadingListPageProps) {
  const params = searchParams ? await searchParams : {};
  const requested = pickUsernameParam(params.username);

  if (requested) {
    redirect(`/${encodeURIComponent(requested)}/reading-list`);
  }

  const viewer = await getCurrentUser();
  if (viewer?.username) {
    redirect(`/${encodeURIComponent(viewer.username.toLowerCase())}/reading-list`);
  }

  redirect("/login?redirect=/reading-list");
}

export const metadata: Metadata = {
  title: "Reading list",
};
