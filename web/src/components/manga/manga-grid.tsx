import type { MangaSummary } from "@/lib/manga/types";

import { MangaCard } from "./manga-card";

interface MangaGridProps {
  items: MangaSummary[];
  emptyState?: React.ReactNode;
}

export function MangaGrid({ items, emptyState }: MangaGridProps) {
  if (!items.length) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(88px,1fr))] sm:gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] md:gap-3"
    >
      {items.map((item) => (
        <MangaCard key={item.id} manga={item} variant="grid" />
      ))}
    </div>
  );
}
