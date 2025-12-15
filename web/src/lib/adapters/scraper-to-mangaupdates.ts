/**
 * Adapter functions to convert Scraper API types to existing MangaUpdates types
 * This allows us to use the scraper API without changing the entire app structure
 */

import type { ShujiaApiManga, ShujiaApiSearchResult } from "../shujiaApi";
import type { MangaDetails, MangaSummary, MangaContributor, MangaScanlationGroup, MangaStatistics } from "../mangaupdates/types";

/**
 * Convert scraper API search result to MangaSummary
 */
export function scraperSearchResultToSummary(
  result: ShujiaApiSearchResult
): MangaSummary {
  return {
    id: result.providerId,
    title: result.title,
    altTitles: [],
    description: undefined,
    status: undefined,
    year: result.year,
    contentRating: undefined,
    demographic: result.type,
    latestChapter: undefined,
    languages: [],
    originalLanguage: undefined,
    tags: [],
    coverImage: result.coverImage,
    url: `https://www.mangaupdates.com/series/${result.providerId}`,
  };
}

/**
 * Convert scraper API manga to MangaDetails
 */
export function scraperMangaToDetails(manga: ShujiaApiManga): MangaDetails {
  // Convert authors and artists to contributors
  const contributors: MangaContributor[] = [
    ...manga.authors.map((author) => ({
      id: author.id || author.name.toLowerCase().replace(/\s+/g, "-"),
      name: author.name,
      role: "author" as const,
    })),
    ...manga.artists.map((artist) => ({
      id: artist.id || artist.name.toLowerCase().replace(/\s+/g, "-"),
      name: artist.name,
      role: "artist" as const,
    })),
  ];

  // Extract scanlation groups from whereToRead if available
  const scanlationGroups: MangaScanlationGroup[] = [];

  // Create statistics object
  const statistics: MangaStatistics | undefined = manga.rating
    ? {
        rating: {
          average: manga.rating.average,
          bayesian: manga.rating.bayesian,
        },
        follows: manga.rating.votes,
      }
    : undefined;

  // Combine genres and tags
  const allTags = [...new Set([...manga.genres, ...manga.tags])];

  // Build cover image URL (already proxied if needed)
  const coverImage = manga.coverImage;

  return {
    // MangaSummary fields
    id: manga.providerId,
    title: manga.title,
    altTitles: manga.alternativeTitles,
    description: manga.description,
    status: manga.status,
    year: manga.year,
    contentRating: undefined, // Not available from scraper
    demographic: manga.type,
    latestChapter: manga.latestChapter
      ? String(manga.latestChapter)
      : undefined,
    languages: [], // Not easily extractable from whereToRead
    originalLanguage: manga.type, // Use type as a proxy
    tags: manga.genres,
    coverImage,
    url: manga.sourceUrl,

    // MangaDetails additional fields
    descriptionFull: manga.description,
    lastChapter: manga.latestChapter ? String(manga.latestChapter) : undefined,
    lastVolume: undefined, // Not available from scraper
    contributors,
    scanlationGroups: scanlationGroups.length > 0 ? scanlationGroups : undefined,
    statistics,
    tagsDetailed: allTags,
    availableLanguages: [
      ...new Set(
        manga.whereToRead
          .map((link) => link.language)
          .filter((lang): lang is string => Boolean(lang))
      ),
    ],
  };
}

/**
 * Convert scraper API manga to MangaSummary
 */
export function scraperMangaToSummary(manga: ShujiaApiManga): MangaSummary {
  return {
    id: manga.providerId,
    title: manga.title,
    altTitles: manga.alternativeTitles,
    description: manga.description,
    status: manga.status,
    year: manga.year,
    contentRating: undefined,
    demographic: manga.type,
    latestChapter: manga.latestChapter ? String(manga.latestChapter) : undefined,
    languages: [
      ...new Set(
        manga.whereToRead
          .map((link) => link.language)
          .filter((lang): lang is string => Boolean(lang))
      ),
    ],
    originalLanguage: manga.type,
    tags: manga.genres,
    coverImage: manga.coverImage,
    url: manga.sourceUrl,
  };
}

