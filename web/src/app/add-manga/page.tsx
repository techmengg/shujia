import type { Metadata } from "next";

import { AddMangaSearch } from "@/components/manga/add-manga-search";

export const metadata: Metadata = {
  title: "Add a manga",
  description:
    "Search for manga, manhwa, and manhua to add to your reading list.",
};

export default function AddMangaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
      <h1 className="text-sm font-semibold text-white sm:text-base">
        Add a manga
      </h1>
      <p className="mt-1 text-[0.8rem] text-surface-subtle sm:text-sm">
        Search for a title and add it to your reading list.
      </p>

      <div className="mt-4 sm:mt-6">
        <AddMangaSearch />
      </div>
    </main>
  );
}
