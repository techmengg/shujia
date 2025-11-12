"use client";

import { useSelectedLayoutSegment, useRouter } from "next/navigation";
import { SETTINGS_NAV_ITEMS } from "@/components/settings/settings-nav-config";

export function MobileSettingsNav() {
  const segment = useSelectedLayoutSegment();
  const router = useRouter();
  const current =
    SETTINGS_NAV_ITEMS.find((i) => i.slug === segment) ?? SETTINGS_NAV_ITEMS[0];

  return (
    <div className="lg:hidden">
      <label htmlFor="settings-section" className="sr-only">
        Select settings section
      </label>
      <select
        id="settings-section"
        value={current.slug}
        onChange={(e) => router.push(`/settings/${e.target.value}`)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/85 outline-none transition focus:border-accent"
      >
        {SETTINGS_NAV_ITEMS.map((item) => (
          <option key={item.slug} value={item.slug} className="bg-black">
            {item.label} — {item.description}
          </option>
        ))}
      </select>
    </div>
  );
}


