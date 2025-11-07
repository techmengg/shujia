import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ProfileByUsernamePage, {
  type ProfilePageProps,
  generateMetadata as profileGenerateMetadata,
} from "@/app/profile/[username]/page";

const RESERVED_SEGMENTS = new Set(
  [
    "",
    "_next",
    "api",
    "profile",
    "reading-list",
    "roadmap",
    "settings",
    "users",
    "manga",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
    "favicon.ico",
    "robots.txt",
  ].map((segment) => segment.toLowerCase()),
);

function isReserved(segment: string | undefined) {
  if (!segment) return true;
  const normalized = segment.trim().toLowerCase();
  if (!normalized || normalized.includes(".")) {
    return true;
  }
  return RESERVED_SEGMENTS.has(normalized);
}

export default async function UsernameProfilePage(props: ProfilePageProps) {
  const { username } = await props.params;

  if (isReserved(username)) {
    notFound();
  }

  return ProfileByUsernamePage(props);
}

export async function generateMetadata(context: ProfilePageProps): Promise<Metadata> {
  const { username } = await context.params;

  if (isReserved(username)) {
    return {
      title: "Not found",
    };
  }

  return profileGenerateMetadata(context);
}
