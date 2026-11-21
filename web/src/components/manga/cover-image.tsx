"use client";

import Image from "next/image";
import { useState } from "react";

interface CoverImageProps {
  src: string | null | undefined;
  /** MangaUpdates series id: lets a dead stored cover recover the current one. */
  mangaId?: string | null;
  title: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Classes for the lettered placeholder shown when there is no cover. */
  placeholderClassName?: string;
}

/**
 * A series cover that heals itself: if the stored URL fails, it asks for
 * the series' current cover once, and if that fails too it shows the
 * title's first letter instead of the browser's broken-image alt text.
 */
export function CoverImage({
  src,
  mangaId,
  title,
  sizes,
  className = "object-cover",
  priority = false,
  placeholderClassName = "text-base font-semibold text-white/70",
}: CoverImageProps) {
  const fresh = mangaId && /^\d+$/.test(mangaId) ? `/api/manga/cover/${mangaId}` : null;
  const [current, setCurrent] = useState<string | null>(src || fresh);

  if (!current) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-white/5 ${placeholderClassName}`}
        aria-label={title}
        role="img"
      >
        {title.charAt(0).toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <Image
      key={current}
      src={current}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized
      className={className}
      onError={() => setCurrent(fresh && current !== fresh ? fresh : null)}
    />
  );
}
