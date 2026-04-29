import Image from "next/image";
import Link from "next/link";

import { Carousel } from "@/components/ui/carousel";
import type { MostTrackedItem } from "@/lib/home/most-tracked";

interface MostTrackedSectionProps {
  items: MostTrackedItem[];
}

export function MostTrackedSection({ items }: MostTrackedSectionProps) {
  if (!items.length) return null;

  return (
    <Carousel>
      {items.map((item) => {
        const initial = item.title.charAt(0).toUpperCase() || "?";
        const readers = item.readers;
        const readerLabel = `${readers} ${readers === 1 ? "reader" : "readers"}`;

        return (
          <div
            key={`${item.provider}:${item.mangaId}`}
            className="min-w-[80px] max-w-[80px] flex-[0_0_auto] sm:min-w-[104px] sm:max-w-[104px] md:min-w-[116px] md:max-w-[116px]"
          >
            <Link
              href={`/manga/${item.mangaId}`}
              className="group flex h-full flex-col gap-1.5"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden border border-white/10 bg-white/5 transition-colors group-hover:border-white/30">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    fill
                    sizes="(min-width: 768px) 116px, (min-width: 640px) 104px, 80px"
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-semibold text-white/70">
                    {initial}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="space-y-0.5">
                <p className="line-clamp-2 text-[0.7rem] font-semibold leading-tight text-white sm:text-[0.8rem]">
                  {item.title}
                </p>
                <p className="text-[0.6rem] tabular-nums text-surface-subtle sm:text-[0.65rem]">
                  <span className="text-white/65">{readers}</span>
                  <span> {readers === 1 ? "reader" : "readers"}</span>
                </p>
              </div>
              <span className="sr-only">{readerLabel}</span>
            </Link>
          </div>
        );
      })}
    </Carousel>
  );
}
