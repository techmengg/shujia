import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddToReadingListButton } from "@/components/manga/add-to-reading-list-button";
import { MangaActionBar } from "@/components/manga/manga-action-bar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMangaDetails, getMangaSummaryById } from "@/lib/mangadex/service";

interface MangaPageProps {
  params: Promise<{
    id: string;
  }>;
}

const FALLBACK_TEXT = "--";

function formatNullable(value?: string | number | null): string {
  if (value === undefined || value === null) {
    return FALLBACK_TEXT;
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_TEXT;
}

function formatRating(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return FALLBACK_TEXT;
  }

  return value.toFixed(2);
}

const languageDisplayNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;

function mapLanguages(codes: string[]): string[] {
  return codes.map((code) => {
    try {
      const name =
        languageDisplayNames?.of(code.toLowerCase()) ??
        languageDisplayNames?.of(code) ??
        null;
      return name ?? code.toUpperCase();
    } catch {
      return code.toUpperCase();
    }
  });
}

function buildCreatorUrl(id: string, role: "author" | "artist"): string {
  const base = role === "author" ? "author" : "artist";
  return `https://mangadex.org/${base}/${id}`;
}

function buildScanlationGroupUrl(id: string): string {
  return `https://mangadex.org/group/${id}`;
}

export async function generateMetadata({
  params,
}: MangaPageProps): Promise<Metadata> {
  const { id } = await params;
  const mangaId = decodeURIComponent(id);
  const summary = await getMangaSummaryById(mangaId);

  if (!summary) {
    return {
      title: "Manga Not Found | Shujia",
    };
  }

  return {
    title: `${summary.title} | Shujia`,
    description: summary.description,
    openGraph: {
      title: summary.title,
      description: summary.description,
      images: summary.coverImage
        ? [
            {
              url: summary.coverImage,
            },
          ]
        : undefined,
    },
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;
  const mangaId = decodeURIComponent(id);

  const [user, manga] = await Promise.all([
    getCurrentUser(),
    getMangaDetails(mangaId),
  ]);

  if (!manga) {
    notFound();
  }

  const authors = manga.contributors.filter(
    (contributor) => contributor.role === "author",
  );
  const artists = manga.contributors.filter(
    (contributor) => contributor.role === "artist",
  );

  const existingEntry = user
    ? await prisma.readingListEntry.findUnique({
        where: {
          userId_mangaId: {
            userId: user.id,
            mangaId,
          },
        },
        select: {
          id: true,
          progress: true,
          rating: true,
          notes: true,
        },
      })
    : null;

  const tags = manga.tagsDetailed.length
    ? manga.tagsDetailed
    : manga.tags.length
      ? manga.tags
      : [];

  const ratingAverage = manga.statistics?.rating?.average ?? null;
  const ratingBayesian = manga.statistics?.rating?.bayesian ?? null;
  const follows = manga.statistics?.follows ?? null;

  const altTitles = manga.altTitles.filter((title) => title.trim().length);

  const baseUrlEnv =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3000";
  const baseUrl = baseUrlEnv.endsWith("/")
    ? baseUrlEnv.slice(0, -1)
    : baseUrlEnv;
  const shareUrl = `${baseUrl}/manga/${mangaId}`;

  const originalLanguageLabel = manga.originalLanguage
    ? mapLanguages([manga.originalLanguage])[0]
    : FALLBACK_TEXT;

  const languageNames = manga.availableLanguages.length
    ? mapLanguages(manga.availableLanguages).join(", ")
    : FALLBACK_TEXT;

  const scanlationGroups = manga.scanlationGroups ?? [];

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Original language", value: originalLanguageLabel },
    { label: "Series status", value: formatNullable(manga.status) },
    { label: "Demographic", value: formatNullable(manga.demographic) },
    { label: "Content rating", value: formatNullable(manga.contentRating) },
    { label: "Publication year", value: formatNullable(manga.year) },
    { label: "Followers", value: formatNullable(follows) },
    { label: "Avg rating", value: formatRating(ratingAverage) },
    { label: "Bayesian rating", value: formatRating(ratingBayesian) },
    { label: "Translations", value: languageNames },
  ];

  return (
    <div className="min-h-screen bg-surface text-surface-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <section className="grid gap-12 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <div className="space-y-8 min-w-0 text-center lg:text-left">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              {manga.coverImage ? (
                <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  width={520}
                  height={780}
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-4xl font-semibold text-white/70">
                  {manga.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute left-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                {formatRating(ratingAverage)} rating
              </div>
            </div>

            <AddToReadingListButton
              mangaId={manga.id}
              isAuthenticated={Boolean(user)}
              initiallyAdded={Boolean(existingEntry)}
              initialEntry={
                existingEntry
                  ? {
                      progress: existingEntry.progress,
                      rating: existingEntry.rating,
                      notes: existingEntry.notes,
                    }
                  : null
              }
              className="w-full"
            />

            <MangaActionBar mangaUrl={manga.url} shareUrl={shareUrl} />

            <section className="space-y-4 border-t border-white/10 pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Creators
              </h2>
              <div className="grid gap-4 text-sm text-white/75">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Authors</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {authors.length ? (
                      authors.map((author) => (
                        <a
                          key={author.id}
                          href={buildCreatorUrl(author.id, "author")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-accent transition hover:text-white"
                        >
                          {author.name}
                          <span aria-hidden="true">&rarr;</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">Unknown</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Artists</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {artists.length ? (
                      artists.map((artist) => (
                        <a
                          key={artist.id}
                          href={buildCreatorUrl(artist.id, "artist")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-accent transition hover:text-white"
                        >
                          {artist.name}
                          <span aria-hidden="true">&rarr;</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">Unknown</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8 min-w-0">
            <header className="space-y-4 min-w-0 text-center lg:text-left">
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
                {manga.demographic ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    {manga.demographic}
                  </span>
                ) : null}
                {manga.status ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    {manga.status}
                  </span>
                ) : null}
                {manga.contentRating ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    {manga.contentRating}
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {manga.title}
              </h1>

              {altTitles.length ? (
                <p className="text-sm text-white/65 break-words">Also known as {altTitles.join(" / ")}</p>
              ) : null}
            </header>

            {manga.descriptionFull ? (
              <section className="space-y-2 border-t border-white/10 pt-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                  Synopsis
                </h2>
                <p className="whitespace-pre-line break-words text-sm text-white/80">
                  {manga.descriptionFull}
                </p>
              </section>
            ) : null}

            {tags.length ? (
              <section className="space-y-3 border-t border-white/10 pt-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <a
                      key={tag}
                      href={`https://mangadex.org/titles?title=${encodeURIComponent(tag)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3 border-t border-white/10 pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Key facts
              </h2>
              <dl className="grid gap-y-3 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <dt className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                      {row.label}
                    </dt>
                    <dd className="text-sm text-white break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {scanlationGroups.length ? (
              <section className="space-y-3 border-t border-white/10 pt-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                  Scanlation groups
                </h2>
                <div className="flex flex-wrap gap-2">
                  {scanlationGroups.map((group) => (
                    <a
                      key={group.id}
                      href={buildScanlationGroupUrl(group.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
                    >
                      {group.name}
                      <span aria-hidden="true">&rarr;</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
