import { SiteHeader } from "@/components/layout/site-header";
import { ProfilePageContent } from "@/components/profile/profile-page-content";

export default function ProfilePage() {
  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />
      <ProfilePageContent />
    </div>
  );
}
