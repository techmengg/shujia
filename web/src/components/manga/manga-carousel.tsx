"use client";

import type { MangaSummary } from "@/lib/mangadex/types";
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
          className="min-w-[108px] max-w-[108px] flex-[0_0_auto] sm:min-w-[130px] sm:max-w-[130px] md:min-w-[140px] md:max-w-[140px]"
        >
          <MangaCard manga={item} />
        </div>
      ))}
    </Carousel>
  );
}
