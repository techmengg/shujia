import type { MangaSummary } from "@/lib/mangadex/types";

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
      className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:gap-3 md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
    >
      {items.map((item) => (
        <MangaCard key={item.id} manga={item} variant="grid" />
      ))}
    </div>
  );
}
