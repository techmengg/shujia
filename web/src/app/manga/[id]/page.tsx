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
    title: `Shujia | ${summary.title}`,
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

  function stripLinksFromDescription(input?: string | null): string | null {
    if (!input) return null;
    const lines = input.split(/\r?\n/);
    let cutoff = lines.length;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (
        line === '---' ||
        /^\*\*\s*links?\s*:\s*\*\*/i.test(line) ||
        /^links?\s*:/i.test(line) ||
        /^\*\s*links?/i.test(line)
      ) {
        cutoff = i;
        break;
      }
    }
    const kept = lines.slice(0, cutoff);
    // Trim trailing empty lines
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

  // Minimal inline Markdown to HTML for synopsis: bold, italics, links, line breaks
  function markdownSynopsisToHtml(raw?: string | null): string | null {
    if (!raw) return null;
    const escaped = escapeHtml(raw);
    // Links [text](url)
    let html = escaped.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-accent hover:text-white">$1</a>');
    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
    // Italic *text*
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1<\/em>');
    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  return (
    <div className="min-h-screen bg-surface text-surface-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:pt-10 sm:px-6 lg:px-10">
        <section className="grid grid-cols-[minmax(120px,36%)_1fr] gap-4 sm:gap-6 md:gap-8 lg:gap-12 md:grid-cols-[minmax(200px,280px)_1fr]">
          <div className="space-y-5 sm:space-y-8 min-w-0 text-left">
            <div className="relative mx-0 w-full max-w-[160px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] sm:max-w-none">
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
              {/* Rating overlay removed to avoid obstructing the cover */}
              </div>

            <div className="flex flex-col gap-2">
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

              <MangaActionBar title={manga.title} shareUrl={shareUrl} />
            </div>

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

          <div className="space-y-6 sm:space-y-8 min-w-0">
            <header className="space-y-2 sm:space-y-4 min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
                {manga.demographic ? (
                  <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1">
                    {manga.demographic}
                  </span>
                ) : null}
                {manga.status ? (
                  <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1">
                    {manga.status}
                  </span>
                ) : null}
                {manga.contentRating ? (
                  <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1">
                    {manga.contentRating}
                  </span>
                ) : null}
                {typeof ratingAverage === "number" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-3 py-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3.5 w-3.5 text-white/80"
                      aria-hidden
                    >
                      <path d="M11.48 3.499a.75.75 0 011.04 0l2.286 2.286a.75.75 0 00.53.22h3.236a.75.75 0 01.53 1.28l-2.286 2.286a.75.75 0 00-.22.53v3.236a.75.75 0 01-1.28.53l-2.286-2.286a.75.75 0 00-.53-.22H9.234a.75.75 0 01-.53-1.28l2.286-2.286a.75.75 0 00.22-.53V3.999a.75.75 0 01.27-.5z" />
                    </svg>
                    Avg {formatRating(ratingAverage)}
                  </span>
                ) : null}
              </div>

              <h1 className="text-xl font-semibold text-white sm:text-3xl md:text-4xl">
                {manga.title}
              </h1>

              {altTitles.length ? (
                <p className="text-xs text-white/65 break-words sm:text-sm">Also known as {altTitles.join(" / ")}</p>
              ) : null}
            </header>

            {stripLinksFromDescription(manga.descriptionFull) ? (
              <section className="space-y-2 border-t border-white/10 pt-5 sm:pt-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                  Synopsis
                </h2>
                <div
                  className="break-words text-sm text-white/80"
                  dangerouslySetInnerHTML={{
                    __html: markdownSynopsisToHtml(stripLinksFromDescription(manga.descriptionFull)) ?? "",
                  }}
                />
              </section>
            ) : null}

            {tags.length ? (
              <section className="space-y-3 border-t border-white/10 pt-5 sm:pt-6">
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
                      className="inline-flex items-center rounded-md border border-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3 border-t border-white/10 pt-5 sm:pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                Key facts
              </h2>
              <dl className="grid gap-y-3 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <dt className="text-[0.6rem] uppercase tracking-[0.25em] text-white/45 sm:text-[0.65rem] sm:tracking-[0.28em]">
                      {row.label}
                    </dt>
                    <dd className="text-[0.95rem] text-white break-words sm:text-sm">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {scanlationGroups.length ? (
              <section className="space-y-3 border-t border-white/10 pt-5 sm:pt-6">
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
