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

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Series status", value: formatNullable(manga.status) },
    { label: "Demographic", value: formatNullable(manga.demographic) },
    { label: "Content rating", value: formatNullable(manga.contentRating) },
    { label: "Publication year", value: formatNullable(manga.year) },
    {
      label: "Latest chapter",
      value: formatNullable(manga.latestChapter ?? manga.lastChapter),
    },
    { label: "Last volume", value: formatNullable(manga.lastVolume) },
    { label: "Followers", value: formatNullable(follows) },
    { label: "Avg rating", value: formatRating(ratingAverage) },
    { label: "Bayesian rating", value: formatRating(ratingBayesian) },
  ];

  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-[-20rem] z-0 h-[40rem] bg-gradient-to-b from-accent/25 via-transparent to-transparent blur-[150px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-gradient-to-t from-black/70 via-surface/40 to-transparent" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">


        <section className="grid gap-8 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] shadow-[0_20px_45px_rgba(8,11,24,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
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
              <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                {formatRating(ratingAverage)} rating
              </div>
            </div>

            <AddToReadingListButton
              mangaId={manga.id}
              isAuthenticated={Boolean(user)}
              initiallyAdded={Boolean(existingEntry)}
              className="w-full"
            />

            <MangaActionBar mangaUrl={manga.url} shareUrl={shareUrl} />

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Creators
              </h2>
              <div className="mt-3 space-y-4 text-sm text-white/75">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                    Authors
                  </p>
                  <div className="mt-2 space-y-1">
                    {authors.length ? (
                      authors.map((author) => (
                        <a
                          key={author.id}
                          href={buildCreatorUrl(author.id, "author")}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-sm text-accent transition hover:text-white"
                        >
                          {author.name}
                          <span aria-hidden="true">-&gt;</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">Unknown</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                    Artists
                  </p>
                  <div className="mt-2 space-y-1">
                    {artists.length ? (
                      artists.map((artist) => (
                        <a
                          key={artist.id}
                          href={buildCreatorUrl(artist.id, "artist")}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-sm text-accent transition hover:text-white"
                        >
                          {artist.name}
                          <span aria-hidden="true">-&gt;</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">Unknown</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Quick links
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <a
                  href={manga.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40"
                >
                  Read on MangaDex
                </a>
                <a
                  href={`https://mangadex.org/title/${manga.id}/chapters`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40"
                >
                  View chapter feed
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
                {manga.demographic ? (
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">
                    {manga.demographic}
                  </span>
                ) : null}
                {manga.status ? (
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">
                    {manga.status}
                  </span>
                ) : null}
                {manga.contentRating ? (
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">
                    {manga.contentRating}
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {manga.title}
              </h1>

              {altTitles.length ? (
                <p className="text-sm text-white/65">
                  Also known as {altTitles.join(" / ")}
                </p>
              ) : null}

              {manga.descriptionFull ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">
                    Synopsis
                  </p>
                  <p className="whitespace-pre-line text-sm text-white/80">
                    {manga.descriptionFull}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {infoRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                >
                  <p className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45">
                    {row.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            {tags.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                  Tags
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <a
                      key={tag}
                      href={`https://mangadex.org/titles?title=${encodeURIComponent(tag)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Series details
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45">
                    Original language
                  </dt>
                  <dd className="mt-1 text-sm text-white/80">
                    {formatNullable(
                      manga.originalLanguage
                        ? mapLanguages([manga.originalLanguage])[0]
                        : null,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45">
                    Publication year
                  </dt>
                  <dd className="mt-1 text-sm text-white/80">
                    {formatNullable(manga.year)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45">
                    Latest chapter
                  </dt>
                  <dd className="mt-1 text-sm text-white/80">
                    {formatNullable(manga.latestChapter ?? manga.lastChapter)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45">
                    Content rating
                  </dt>
                  <dd className="mt-1 text-sm text-white/80">
                    {formatNullable(manga.contentRating)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
