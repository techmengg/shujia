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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {items.map((item) => (
        <MangaCard key={item.id} manga={item} variant="grid" />
      ))}
    </div>
  );
}
