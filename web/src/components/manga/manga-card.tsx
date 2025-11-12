"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { MangaSummary } from "@/lib/mangadex/types";

interface MangaCardProps {
  manga: MangaSummary;
  variant?: "carousel" | "grid";
}

export function MangaCard({ manga, variant = "carousel" }: MangaCardProps) {
	const [imgSrc, setImgSrc] = useState<string | null>(
    manga.coverImage ?? null,
  );
	const [triedFallback512, setTriedFallback512] = useState(false);
	const [triedOriginal, setTriedOriginal] = useState(false);

  function deriveFallbackUrl(url: string): string | null {
    try {
      // Try switching between .256.jpg and .512.jpg, then fall back to the original file (no size suffix)
      if (url.endsWith(".256.jpg") && !triedFallback512) {
        setTriedFallback512(true);
        return url.replace(/\.256\.jpg$/i, ".512.jpg");
      }
      if (url.endsWith(".512.jpg") && !triedFallback512) {
        setTriedFallback512(true);
        return url.replace(/\.512\.jpg$/i, ".256.jpg");
      }
      if (!triedOriginal) {
        setTriedOriginal(true);
        return url.replace(/\.256\.jpg$|\.512\.jpg$/i, "");
      }
    } catch {
      // ignore
    }
    return null;
  }

  function handleImageError() {
    if (!imgSrc) return;
    const next = deriveFallbackUrl(imgSrc);
    if (next) {
      setImgSrc(next);
      return;
    }
    setImgSrc(null);
  }

  const isGrid = variant === "grid";

  const containerClasses = [
    "group flex h-full flex-col overflow-hidden rounded-xl border border-white/15 bg-black transition hover:-translate-y-[3px] hover:border-white",
    "w-full",
  ].join(" ");

  const bodyClasses = ["flex flex-1 flex-col", "gap-1.5 p-1.5 sm:p-2"].join(" ");

  const titleClasses = [
    "line-clamp-2 font-semibold text-white group-hover:text-white",
    "text-[0.7rem] sm:text-[0.8rem]",
  ].join(" ");

  const subtitleClasses = [
    "line-clamp-1 text-surface-subtle",
    "text-[0.5rem] sm:text-[0.6rem]",
  ].join(" ");

  const badgeRowClasses = [
    "mt-auto flex flex-wrap text-surface-subtle",
    "gap-1 text-[0.5rem] sm:text-[0.6rem]",
  ].join(" ");

  const tagsClasses = [
    "line-clamp-2 text-surface-subtle/80",
    "text-[0.5rem] sm:text-[0.6rem]",
  ].join(" ");

  return (
    <Link href={`/manga/${manga.id}`} className={containerClasses}>
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
        {imgSrc ? (
          <Image
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 1024px) 200px, 45vw"
            src={imgSrc}
            alt={manga.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            priority={false}
				unoptimized
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white/10 text-lg font-semibold text-white">
            {manga.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className={bodyClasses}>
        <div className="space-y-1">
          <h3 className={titleClasses}>{manga.title}</h3>
          {manga.altTitles.length > 0 ? (
            <p className={subtitleClasses}>{manga.altTitles[0]}</p>
          ) : null}
        </div>
        {isGrid ? (
          <div className={badgeRowClasses}>
            {manga.status ? (
              <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-white/80">
                {manga.status}
              </span>
            ) : null}
            {manga.demographic ? (
              <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-white/60">
                {manga.demographic}
              </span>
            ) : null}
            {manga.year ? (
              <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-white/60">
                {manga.year}
              </span>
            ) : null}
          </div>
        ) : null}
        {manga.tags.length > 0 ? (
          <p className={tagsClasses}>{manga.tags.slice(0, 3).join(" / ")}</p>
        ) : null}
      </div>
    </Link>
  );
}
