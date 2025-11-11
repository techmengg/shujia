import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore",
};

export default function ExplorePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Explore</h1>
      <p className="text-sm text-white/60 sm:text-base">
        This space is currently being worked on. Check back soon for curated discoveries.
      </p>
    </main>
  );
}


