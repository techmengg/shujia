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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {heading ? (
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">{heading}</h2>
        ) : null}
        {heading ? (
          <span aria-hidden className="mx-1 hidden h-4 w-px bg-white/25 sm:mx-2 sm:inline-block" />
        ) : null}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-[0.75rem]",
                  isActive
                    ? "border-white bg-white/10 text-white"
                    : "border-white/20 bg-transparent text-surface-subtle hover:border-white/60 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-normal text-white/70">
                  {tab.items.length}
                </span>
              </button>
            );
          })}
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
            <p className="rounded-2xl border border-white/10 bg-[#0d0122]/70 p-6 text-sm text-surface-subtle">
              We could not load titles for this collection right now. Try again
              in a moment.
            </p>
          )
        }
      />
    </div>
  );
}
