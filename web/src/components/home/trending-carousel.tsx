"use client";

import { useState } from "react";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import type { MangaSummary } from "@/lib/mangaupdates/types";

interface TrendingCarouselProps {
  initialData: MangaSummary[];
  userPrefs: {
    showMatureContent: boolean;
    showExplicitContent: boolean;
    showPornographicContent: boolean;
  };
}

type Timeframe = '7d' | '1m' | '3m' | 'mixed';

const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string; description: string }> = [
  { value: 'mixed', label: 'Smart Mix', description: 'Korean action/adventure/romance webtoons' },
  { value: '7d', label: '7 Days', description: 'This week' },
  { value: '1m', label: '1 Month', description: 'This month' },
  { value: '3m', label: '3 Months', description: 'This quarter' },
];

export function TrendingCarousel({
  initialData,
  userPrefs,
}: TrendingCarouselProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('mixed');
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrendingData = async (timeframe: Timeframe) => {
    setIsLoading(true);
    try {
      if (timeframe === 'mixed') {
        // Smart Mix: Prioritize Korean action/adventure/romance webtoons
        // Fetch more Korean content (80%) and less of others (10% each)
        const koRes = await fetch(`/api/manga/trending?language=ko&timeframe=${timeframe}&limit=80&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`);
        const jaRes = await fetch(`/api/manga/trending?language=ja&timeframe=${timeframe}&limit=10&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`);
        const zhRes = await fetch(`/api/manga/trending?language=zh&timeframe=${timeframe}&limit=10&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`);

        const [koData, jaData, zhData] = await Promise.all([
          koRes.json(),
          jaRes.json(),
          zhRes.json(),
        ]);

        // Filter Korean content for action/adventure/romance genres
        const koItems = (koData.data || []).filter((item: any) => {
          const tags = (item.tags || []).map((tag: string) => tag.toLowerCase());
          const hasTargetGenre = tags.some((tag: string) => 
            tag.includes('action') || 
            tag.includes('adventure') || 
            tag.includes('romance') ||
            tag.includes('fantasy') ||
            tag.includes('drama')
          );
          return hasTargetGenre;
        });

        // Combine: 80% Korean (action/adventure/romance), 20% others for variety
        const combined = [
          ...koItems,
          ...(jaData.data || []).slice(0, 5),
          ...(zhData.data || []).slice(0, 5),
        ];

        // Light shuffle to maintain Korean dominance but add randomness
        const shuffled = combined.sort(() => Math.random() - 0.5);
        setData(shuffled);
      } else {
        // Other timeframes: Equal mix of all languages
        const [jaRes, koRes, zhRes] = await Promise.all([
          fetch(`/api/manga/trending?language=ja&timeframe=${timeframe}&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`),
          fetch(`/api/manga/trending?language=ko&timeframe=${timeframe}&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`),
          fetch(`/api/manga/trending?language=zh&timeframe=${timeframe}&showMatureContent=${userPrefs.showMatureContent}&showExplicitContent=${userPrefs.showExplicitContent}&showPornographicContent=${userPrefs.showPornographicContent}`),
        ]);

        const [jaData, koData, zhData] = await Promise.all([
          jaRes.json(),
          koRes.json(),
          zhRes.json(),
        ]);

        // Combine all languages equally
        const combined = [
          ...(jaData.data || []),
          ...(koData.data || []),
          ...(zhData.data || []),
        ];

        // Shuffle for variety
        const shuffled = combined.sort(() => Math.random() - 0.5);
        setData(shuffled);
      }
    } catch (error) {
      console.error(`Error fetching trending data:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeframeChange = async (newTimeframe: Timeframe) => {
    setSelectedTimeframe(newTimeframe);
    await fetchTrendingData(newTimeframe);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-white sm:text-lg">
          Trending
        </h2>
        
        {/* Timeframe Selector */}
        <div className="flex flex-wrap gap-2">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeframeChange(option.value)}
              disabled={isLoading}
              className={`group relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                selectedTimeframe === option.value
                  ? 'bg-accent text-white shadow-lg'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              } ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              title={option.description}
            >
              {option.label}
              {selectedTimeframe === option.value && !isLoading && (
                <span className="ml-1 text-xs">✓</span>
              )}
              {isLoading && selectedTimeframe === option.value && (
                <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          </div>
        )}
        
        <MangaCarousel
          items={data}
          emptyState={
            <p className="rounded-2xl border border-white/10 bg-[#0d0122]/70 p-6 text-sm text-surface-subtle">
              No trending manga found.
            </p>
          }
        />
      </div>
    </section>
  );
}

