"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { SETTINGS_NAV_ITEMS } from "@/components/settings/settings-nav-config";

export function SettingsSidebar() {
  const selected = useSelectedLayoutSegment();
  const fallbackSlug = SETTINGS_NAV_ITEMS[0]?.slug ?? "profile";
  const activeSlug =
    SETTINGS_NAV_ITEMS.find((item) => item.slug === selected)?.slug ?? fallbackSlug;

  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit lg:self-start">
      <nav className="space-y-1">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <Link
              key={item.slug}
              href={`/settings/${item.slug}`}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-accent/10 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-white/45">{item.description}</p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

