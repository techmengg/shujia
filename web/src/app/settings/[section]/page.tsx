import { notFound } from "next/navigation";

import { loadSettingsData } from "@/app/settings/load-settings-data";
import { SettingsPageContent } from "@/components/settings/settings-page-content";
import { SETTINGS_NAV_ITEMS } from "@/components/settings/settings-nav-config";

// Force dynamic rendering for auth-sensitive settings
export const dynamic = "force-dynamic";

type SettingsSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SettingsSectionPage({ params }: SettingsSectionPageProps) {
  const { section } = await params;
  const nav = SETTINGS_NAV_ITEMS.find((item) => item.slug === section);

  if (!nav) {
    notFound();
  }

  const { user, sessionCount } = await loadSettingsData();

  return <SettingsPageContent user={user} sessionCount={sessionCount} sections={nav.sections} />;
}
