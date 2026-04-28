"use client";

import type { MangaSummary } from "@/lib/manga/types";
import { Carousel } from "@/components/ui/carousel";
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
    <Carousel>
      {items.map((item) => (
        <div
          key={item.id}
          className="min-w-[80px] max-w-[80px] flex-[0_0_auto] sm:min-w-[104px] sm:max-w-[104px] md:min-w-[116px] md:max-w-[116px]"
        >
          <MangaCard manga={item} />
        </div>
      ))}
    </Carousel>
  );
}
