import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { AddToReadingListButton } from "@/components/manga/add-to-reading-list-button";
import { MangaActionBar } from "@/components/manga/manga-action-bar";
import { RatingsWidget } from "@/components/manga/ratings-widget";
import { TagList } from "@/components/manga/tag-list";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getMangaDetails,
  getMangaSummaryById,
  inferProviderFromId,
  providerLabel,
} from "@/lib/manga";

interface MangaPageProps {
  params: Promise<{
    id: string;
  }>;
}

const FALLBACK_TEXT = "—";

function formatNullable(value?: string | number | null): string {
  if (value === undefined || value === null) return FALLBACK_TEXT;
  if (typeof value === "number") return new Intl.NumberFormat("en-US").format(value);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_TEXT;
}

function formatRating(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return FALLBACK_TEXT;
  return value.toFixed(2);
}

/** Trim cosmetic noise from a chapter/volume string ("152.0" -> "152"). Returns null when unusable. */
function cleanCount(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(0(\.0+)?|null|none|n\/a|unknown|tbd)$/i.test(trimmed)) return null;
  // Strip pure-zero decimals: "152.0" -> "152", but keep "152.5"
  return trimmed.replace(/\.0+$/, "");
}

type CompletionState = "complete" | "ongoing" | "hiatus" | "discontinued";

interface SeriesStats {
  chapters: number | null;
  extras: number | null;
  volumes: number | null;
  completion: CompletionState | null;
}

/**
 * Parses chapter/volume/completion info out of provider-supplied status text.
 * MangaUpdates ships rich multi-line strings like
 *   "201 Chapters (Including Prologue; Complete)\n14 Volumes (Complete)\n…"
 * and MangaDex ships short tokens like "completed" / "ongoing".
 */
function parseSeriesStats(
  status: string | undefined,
  fallbackChapter: string | undefined,
  fallbackVolume: string | undefined,
): SeriesStats {
  const text = status ?? "";

  let chapters: number | null = null;
  let extras: number | null = null;
  let volumes: number | null = null;

  const chapMatch = text.match(/(\d+)\s+chapters?(?:\s*\+\s*(\d+)\s+(?:extra|side|bonus|special)s?)?/i);
  if (chapMatch) {
    chapters = Number(chapMatch[1]);
    if (chapMatch[2]) extras = Number(chapMatch[2]);
  }

  const volMatch = text.match(/(\d+)\s+volumes?/i);
  if (volMatch) volumes = Number(volMatch[1]);

  // Fall back to dedicated integer fields when the status text didn't carry counts.
  if (chapters === null) {
    const fc = cleanCount(fallbackChapter);
    if (fc) {
      const n = Number(fc);
      if (Number.isFinite(n)) chapters = n;
    }
  }
  if (volumes === null) {
    const fv = cleanCount(fallbackVolume);
    if (fv) {
      const n = Number(fv);
      if (Number.isFinite(n)) volumes = n;
    }
  }

  let completion: CompletionState | null = null;
  const lower = text.toLowerCase();
  if (/\b(complete|completed|finished)\b/.test(lower)) completion = "complete";
  else if (/\bhiatus\b/.test(lower)) completion = "hiatus";
  else if (/\b(discontinued|cancelled|canceled|axed|dropped)\b/.test(lower)) completion = "discontinued";
  else if (/\bongoing\b/.test(lower)) completion = "ongoing";

  return { chapters, extras, volumes, completion };
}

function completionLabel(state: CompletionState | null): string | null {
  switch (state) {
    case "complete":
      return "Completed";
    case "ongoing":
      return "Ongoing";
    case "hiatus":
      return "Hiatus";
    case "discontinued":
      return "Discontinued";
    default:
      return null;
  }
}

function buildCountLine(stats: SeriesStats): string | null {
  const parts: string[] = [];
  if (stats.chapters !== null) {
    let chap = `${stats.chapters} Chapter${stats.chapters === 1 ? "" : "s"}`;
    if (stats.extras !== null && stats.extras > 0) {
      chap += ` + ${stats.extras} Extra${stats.extras === 1 ? "" : "s"}`;
    }
    parts.push(chap);
  }
  if (stats.volumes !== null) {
    parts.push(`${stats.volumes} Volume${stats.volumes === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" · ") : null;
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

function StatRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[0.7rem] text-surface-subtle sm:text-xs">{label}</p>
      <div className="mt-0.5 break-words text-sm text-white/85">{children}</div>
    </div>
  );
}

export async function generateMetadata({ params }: MangaPageProps): Promise<Metadata> {
  const { id } = await params;
  const mangaId = decodeURIComponent(id);
  const provider = inferProviderFromId(mangaId);
  const summary = await getMangaSummaryById(mangaId, provider);

  if (!summary) {
    return { title: "Manga Not Found" };
  }

  return {
    title: summary.title,
    description: summary.description,
    openGraph: {
      title: summary.title,
      description: summary.description,
      images: summary.coverImage ? [{ url: summary.coverImage }] : undefined,
    },
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;
  const mangaId = decodeURIComponent(id);
  const provider = inferProviderFromId(mangaId);
  const isMangaUpdates = provider === "mangaupdates";

  const [user, manga] = await Promise.all([
    getCurrentUser(),
    getMangaDetails(mangaId, provider),
  ]);

  if (!manga) {
    notFound();
  }

  const authors = manga.contributors.filter((c) => c.role === "author");
  const artists = manga.contributors.filter((c) => c.role === "artist");

  const [existingEntry, existingReview, shujiaAggregate] = await Promise.all([
    user
      ? prisma.readingListEntry.findUnique({
          where: {
            userId_provider_mangaId: {
              userId: user.id,
              provider,
              mangaId,
            },
          },
          select: { id: true, progress: true, rating: true, notes: true },
        })
      : Promise.resolve(null),
    user
      ? prisma.review.findUnique({
          where: {
            authorId_provider_mangaId: {
              authorId: user.id,
              provider,
              mangaId,
            },
          },
          select: { rating: true, body: true, hasSpoilers: true },
        }).catch(() => null)
      : Promise.resolve(null),
    // Aggregate community ratings from the Review table (canonical source post-migration).
    prisma.review
      .aggregate({
        where: { provider, mangaId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      .catch(() => null),
  ]);

  const shujiaCount = shujiaAggregate?._count.rating ?? 0;
  const shujiaAverageOnFive =
    shujiaAggregate && shujiaAggregate._avg.rating !== null
      ? shujiaAggregate._avg.rating / 2
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
  const baseUrl = baseUrlEnv.endsWith("/") ? baseUrlEnv.slice(0, -1) : baseUrlEnv;
  const shareUrl = `${baseUrl}/manga/${mangaId}`;

  const originalLanguageLabel = manga.originalLanguage
    ? mapLanguages([manga.originalLanguage])[0]
    : FALLBACK_TEXT;

  const languageNames = manga.availableLanguages.length
    ? mapLanguages(manga.availableLanguages).join(", ")
    : FALLBACK_TEXT;

  const scanlationGroups = manga.scanlationGroups ?? [];
  const hasOriginalLanguage = Boolean(manga.originalLanguage);
  const hasTranslations = manga.availableLanguages.length > 0;

  const stats = parseSeriesStats(
    manga.status,
    manga.lastChapter ?? manga.latestChapter,
    manga.lastVolume,
  );
  const completionStatus = completionLabel(stats.completion);
  const countLine = buildCountLine(stats);

  // Inline meta strip under the title (skips blanks)
  const metaBits: string[] = [];
  if (manga.demographic) metaBits.push(manga.demographic);
  if (completionStatus) metaBits.push(completionStatus);
  if (manga.contentRating) metaBits.push(manga.contentRating);
  if (manga.year) metaBits.push(String(manga.year));

  function stripLinksFromDescription(input?: string | null): string | null {
    if (!input) return null;
    const lines = input.split(/\r?\n/);
    let cutoff = lines.length;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (
        line === "---" ||
        /^\*\*\s*links?\s*:\s*\*\*/i.test(line) ||
        /^links?\s*:/i.test(line) ||
        /^\*\s*links?/i.test(line)
      ) {
        cutoff = i;
        break;
      }
    }
    const kept = lines.slice(0, cutoff);
    while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
    return kept.join("\n");
  }

  function escapeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markdownSynopsisToHtml(raw?: string | null): string | null {
    if (!raw) return null;
    const escaped = escapeHtml(raw);
    let html = escaped.replace(
      /\[([^\]]+)\]\((https?:[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-accent underline-offset-4 hover:text-white hover:underline">$1</a>',
    );
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1<\/strong>");
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1<\/em>");
    html = html.replace(/\n/g, "<br/>");
    return html;
  }

  const synopsisText = stripLinksFromDescription(manga.descriptionFull);
  const synopsisHtml = markdownSynopsisToHtml(synopsisText);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:px-10">
      <div className="grid gap-5 md:grid-cols-[200px_1fr] md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden bg-white/5 md:mx-0 md:max-w-none">
            {manga.coverImage ? (
              <Image
                src={manga.coverImage.replace("size=256", "size=512")}
                alt={manga.title}
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 180px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl font-semibold text-white/70">
                {manga.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <AddToReadingListButton
              mangaId={manga.id}
              provider={provider}
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
            <MangaActionBar title={manga.title} shareUrl={shareUrl} />
          </div>

          <RatingsWidget
            mangaId={mangaId}
            provider={provider}
            bayesian={ratingBayesian}
            bayesianVotes={manga.statistics?.rating?.votes}
            providerLabel={providerLabel(provider)}
            shujiaAverage={shujiaAverageOnFive}
            shujiaVotes={shujiaCount}
            initialUserRating={existingReview?.rating ?? null}
            initialUserBody={existingReview?.body ?? null}
            initialUserHasSpoilers={existingReview?.hasSpoilers ?? false}
          />

          <div className="space-y-2.5 border-t border-white/10 pt-4 sm:space-y-3">
            {hasOriginalLanguage ? (
              <StatRow label="Language">{originalLanguageLabel}</StatRow>
            ) : null}

            <StatRow label="Author(s)">
              {authors.length > 0 ? (
                <div className="space-y-0.5">
                  {authors.map((author, index) => (
                    <p key={`${author.id ?? "a"}-${index}`}>
                      {isMangaUpdates ? (
                        <span>{author.name}</span>
                      ) : (
                        <a
                          href={buildCreatorUrl(author.id, "author")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
                        >
                          {author.name}
                        </a>
                      )}
                    </p>
                  ))}
                </div>
              ) : (
                <span className="text-surface-subtle">N/A</span>
              )}
            </StatRow>

            <StatRow label="Artist(s)">
              {artists.length > 0 ? (
                <div className="space-y-0.5">
                  {artists.map((artist, index) => (
                    <p key={`${artist.id ?? "a"}-${index}`}>
                      {isMangaUpdates ? (
                        <span>{artist.name}</span>
                      ) : (
                        <a
                          href={buildCreatorUrl(artist.id, "artist")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
                        >
                          {artist.name}
                        </a>
                      )}
                    </p>
                  ))}
                </div>
              ) : (
                <span className="text-surface-subtle">N/A</span>
              )}
            </StatRow>

            {manga.year ? (
              <StatRow label="Year">{manga.year}</StatRow>
            ) : null}

            {(countLine || completionStatus) ? (
              <StatRow label="Status in COO">
                <div className="space-y-0.5">
                  {countLine ? <p>{countLine}</p> : null}
                  {completionStatus ? <p>({completionStatus})</p> : null}
                </div>
              </StatRow>
            ) : null}

            {manga.demographic ? (
              <StatRow label="Demographic">{manga.demographic}</StatRow>
            ) : null}

            {manga.contentRating ? (
              <StatRow label="Content rating">{manga.contentRating}</StatRow>
            ) : null}

            {typeof follows === "number" ? (
              <StatRow label="Followers">{formatNullable(follows)}</StatRow>
            ) : null}

            {hasTranslations ? (
              <StatRow label="Translations">{languageNames}</StatRow>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className="space-y-2.5 border-t border-white/10 pt-4">
              <h2 className="text-sm font-semibold text-white sm:text-base">
                Tags
              </h2>
              <TagList tags={tags} linkable={!isMangaUpdates} initialLimit={20} />
            </div>
          ) : null}
        </aside>

        {/* Main */}
        <article className="min-w-0 space-y-5 sm:space-y-7">
          <header className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
              {manga.title}
            </h1>
            {altTitles.length > 0 ? (
              <p className="break-words text-xs text-surface-subtle sm:text-sm">
                also known as {altTitles.join(" / ")}
              </p>
            ) : null}
            {(metaBits.length > 0 || typeof ratingAverage === "number") ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.8rem] text-surface-subtle sm:text-sm">
                {metaBits.map((bit, index) => (
                  <Fragment key={bit}>
                    {index > 0 ? (
                      <span aria-hidden className="text-surface-subtle/40">
                        ·
                      </span>
                    ) : null}
                    <span>{bit}</span>
                  </Fragment>
                ))}
                {typeof ratingAverage === "number" ? (
                  <>
                    {metaBits.length > 0 ? (
                      <span aria-hidden className="text-surface-subtle/40">
                        ·
                      </span>
                    ) : null}
                    <span className="text-white">
                      ★ {formatRating(ratingAverage)}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </header>

          {synopsisHtml ? (
            <section className="space-y-2 border-t border-white/10 pt-4 sm:pt-5">
              <h2 className="text-sm font-semibold text-white sm:text-base">
                Synopsis
              </h2>
              <div
                className="break-words text-sm leading-relaxed text-white/80 sm:text-[0.95rem]"
                dangerouslySetInnerHTML={{ __html: synopsisHtml }}
              />
            </section>
          ) : null}

          {scanlationGroups.length > 0 ? (
            <section className="space-y-2.5 border-t border-white/10 pt-4 sm:pt-5">
              <h2 className="text-sm font-semibold text-white sm:text-base">
                Scanlation groups
              </h2>
              <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[0.8rem] sm:text-sm">
                {scanlationGroups.map((group, index) => (
                  <Fragment key={group.id}>
                    {index > 0 ? (
                      <span aria-hidden className="text-surface-subtle/40">
                        ·
                      </span>
                    ) : null}
                    <a
                      href={buildScanlationGroupUrl(group.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      {group.name}
                    </a>
                  </Fragment>
                ))}
              </p>
            </section>
          ) : null}

          <p className="border-t border-white/10 pt-4 text-[0.7rem] italic text-surface-subtle sm:pt-5 sm:text-xs">
            metadata from{" "}
            <a
              href={manga.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {providerLabel(provider)}
            </a>
            .
          </p>
        </article>
      </div>
    </main>
  );
}
