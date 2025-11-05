import { SiteHeader } from "@/components/layout/site-header";
import { ReadingListClient } from "@/components/reading-list/reading-list-client";

export default function ReadingListPage() {
  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />
      <ReadingListClient />
    </div>
  );
}
