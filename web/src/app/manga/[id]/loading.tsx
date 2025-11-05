"use client";

export default function MangaPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-white">
      <div className="animate-pulse text-sm uppercase tracking-[0.3em] text-white/60">
        Loading series...
      </div>
    </div>
  );
}
