import Image from "next/image";

import type { MangaSummary } from "@/lib/mangadex/types";

interface MangaCardProps {
  manga: MangaSummary;
  variant?: "carousel" | "grid";
}

export function MangaCard({ manga, variant = "carousel" }: MangaCardProps) {
  const isGrid = variant === "grid";

  const containerClasses = [
    "group flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] transition hover:-translate-y-[4px] hover:border-accent/60 hover:bg-accent-soft/20",
    isGrid
      ? "w-full"
      : "min-w-[130px] max-w-[130px] sm:min-w-[140px] sm:max-w-[140px] md:min-w-[150px] md:max-w-[150px]",
  ].join(" ");

  const bodyClasses = [
    "flex flex-1 flex-col",
    isGrid ? "gap-1.5 p-2" : "gap-2 p-2.5 sm:p-3",
  ].join(" ");

  const titleClasses = [
    "line-clamp-2 font-semibold text-white/90 group-hover:text-white",
    isGrid ? "text-[0.75rem] sm:text-[0.8rem]" : "text-[0.85rem] sm:text-sm",
  ].join(" ");

  const subtitleClasses = [
    "line-clamp-1 text-surface-subtle/90",
    isGrid ? "text-[0.55rem] sm:text-[0.6rem]" : "text-[0.6rem] sm:text-[0.7rem]",
  ].join(" ");

  const badgeRowClasses = [
    "mt-auto flex flex-wrap uppercase tracking-[0.25em] text-surface-subtle",
    "gap-1 text-[0.5rem] sm:text-[0.55rem]",
  ].join(" ");

  const tagsClasses = [
    "line-clamp-2 text-surface-subtle/70",
    isGrid ? "text-[0.55rem] sm:text-[0.6rem]" : "text-[0.6rem] sm:text-[0.65rem]",
  ].join(" ");

  return (
    <a
      href={manga.url}
      target="_blank"
      rel="noreferrer"
      className={containerClasses}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-accent-soft via-surface-muted to-surface">
        {manga.coverImage ? (
          <Image
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 1024px) 200px, 45vw"
            src={manga.coverImage}
            alt={manga.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/40 to-surface-muted text-lg font-semibold text-accent">
            {manga.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
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
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-white/80">
                {manga.status}
              </span>
            ) : null}
            {manga.demographic ? (
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-white/60">
                {manga.demographic}
              </span>
            ) : null}
            {manga.year ? (
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-white/60">
                {manga.year}
              </span>
            ) : null}
          </div>
        ) : null}
        {manga.tags.length > 0 ? (
          <p className={tagsClasses}>{manga.tags.slice(0, 3).join(" / ")}</p>
        ) : null}
      </div>
    </a>
  );
}
