"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";

interface CarouselProps {
  children: React.ReactNode;
  options?: EmblaOptionsType;
  className?: string;
}

export function Carousel({ children, options, className }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: true, ...options });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className={["relative", className ?? ""].filter(Boolean).join(" ")}> 
      <div className="overflow-hidden rounded-2xl border border-white/12 bg-black" ref={emblaRef}>
        <div className="flex gap-2 px-3 py-3 sm:gap-3 sm:px-4">{children}</div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-1 right-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-white hover:bg-black/80 disabled:opacity-40 sm:h-8 sm:w-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-white hover:bg-black/80 disabled:opacity-40 sm:h-8 sm:w-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
