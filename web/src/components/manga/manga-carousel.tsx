import type { MangaSummary } from "@/lib/mangadex/types";

import { MangaCard } from "./manga-card";

interface MangaCarouselProps {
  items: MangaSummary[];
  emptyState?: React.ReactNode;
}

export function MangaCarousel({ items, emptyState }: MangaCarouselProps) {
  if (!items.length) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] px-3 sm:px-4">
      <ul className="grid snap-x snap-mandatory auto-cols-[130px] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain px-4 py-4 sm:auto-cols-[140px] sm:px-5 md:auto-cols-[150px] md:px-6 scrollbar-themed">
        {items.map((item) => (
          <li
            key={item.id}
            className="w-[130px] flex-none snap-start sm:w-[140px] md:w-[150px]"
          >
            <MangaCard manga={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
