import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPopularNewTitles } from "@/lib/mangaupdates/service-cached";

export const dynamic = "force-dynamic";

export default async function RandomMangaPage() {
  let pool: Awaited<ReturnType<typeof getPopularNewTitles>> = [];
  try {
    pool = await getPopularNewTitles(100);
  } catch {
    pool = [];
  }

  if (!pool.length) {
    redirect("/explore");
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  redirect(`/manga/${picked.id}`);
}

export const metadata: Metadata = {
  title: "Random comic",
};
