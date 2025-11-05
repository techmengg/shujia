import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfileIndexPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/profile")}`);
  }

  if (!user.username) {
    redirect("/settings?onboarding=complete-profile");
  }

  redirect(`/profile/${user.username}`);
}
