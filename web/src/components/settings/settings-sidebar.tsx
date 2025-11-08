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
    <aside className="rounded-2xl border border-white/5 bg-black/30 p-4 lg:sticky lg:top-24 lg:h-fit lg:self-start">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
        Sections
      </p>
      <nav className="space-y-2">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <Link
              key={item.slug}
              href={`/settings/${item.slug}`}
              className={`block rounded-xl border px-4 py-3 text-sm transition ${
                isActive
                  ? "border-accent/80 bg-accent/10 text-white"
                  : "border-white/5 text-white/65 hover:border-white/20 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-white/50">{item.description}</p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

