import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/profile")}`);
  }

  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />
      <ProfilePageContent userName={user.name} userEmail={user.email} />
    </div>
  );
}
