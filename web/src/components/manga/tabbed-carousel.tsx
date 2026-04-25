"use client";

import { useEffect, useMemo, useState } from "react";

import type { MangaSummary } from "@/lib/mangadex/types";

import { MangaCarousel } from "./manga-carousel";

interface TabDefinition {
  id: string;
  label: string;
  description?: string;
  items: MangaSummary[];
}

interface TabbedCarouselProps {
  tabs: TabDefinition[];
  heading?: string;
  emptyState?: React.ReactNode;
}

export function TabbedCarousel({ tabs, heading, emptyState }: TabbedCarouselProps) {
  const firstAvailableTab = useMemo(() => {
    if (!tabs.length) return undefined;
    return tabs.find((tab) => tab.items.length > 0) ?? tabs[0];
  }, [tabs]);

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return firstAvailableTab?.id ?? null;
  });

  useEffect(() => {
    if (!tabs.length) {
      setActiveTabId(null);
      return;
    }

    const isCurrentTabValid =
      activeTabId != null &&
      tabs.some((tab) => tab.id === activeTabId && tab.items.length > 0);

    if (!isCurrentTabValid) {
      setActiveTabId(firstAvailableTab?.id ?? tabs[0]?.id ?? null);
    }
  }, [activeTabId, firstAvailableTab, tabs]);

  const activeTab = useMemo(() => {
    if (!tabs.length) {
      return undefined;
    }

    return (
      tabs.find((tab) => tab.id === activeTabId) ??
      tabs.find((tab) => tab.items.length > 0) ??
      tabs[0]
    );
  }, [activeTabId, tabs]);

  if (!activeTab) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex w-full items-baseline gap-2 sm:gap-4">
        {heading ? (
          <>
            <h2 className="shrink-0 text-sm font-semibold text-white sm:text-base">
              {heading}
            </h2>
            <span
              aria-hidden
              className="shrink-0 select-none text-sm text-surface-subtle/60 sm:text-base"
            >
              |
            </span>
          </>
        ) : null}
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <div className="flex items-baseline gap-3 whitespace-nowrap sm:gap-5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={[
                    "shrink-0 bg-transparent p-0 text-[0.8rem] font-medium transition-colors sm:text-sm",
                    isActive
                      ? "text-white underline underline-offset-[5px] decoration-accent decoration-2 sm:underline-offset-[6px]"
                      : "text-surface-subtle hover:text-white",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab.description ? (
        <p className="max-w-2xl text-[0.75rem] text-surface-subtle sm:text-sm">
          {activeTab.description}
        </p>
      ) : null}

      <MangaCarousel
        items={activeTab.items}
        emptyState={
          emptyState ?? (
            <p className="text-sm italic text-surface-subtle">
              Could not load titles for this collection right now.
            </p>
          )
        }
      />
    </div>
  );
}
