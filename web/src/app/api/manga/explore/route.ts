import { NextResponse } from "next/server";
import { mangadexFetch } from "@/lib/mangadex/client";
import type {
  MangaDexCollectionResponse,
  MangaDexManga,
  MangaSummary,
} from "@/lib/mangadex/types";

function getPreferredLocaleText(
  textRecord: Record<string, string>,
  preferredLocales: string[] = ["en", "en-us", "en-gb"],
): string | undefined {
  for (const locale of preferredLocales) {
    const value = textRecord[locale] ?? textRecord[locale.toLowerCase()];
    if (value) return value;
  }

  const firstValue = Object.values(textRecord).find(Boolean);
  return firstValue?.trim() ? firstValue : undefined;
}

function buildCoverArtUrl(mangaId: string, fileName: string): string {
  const params = new URLSearchParams({
    mangaId,
    file: fileName,
    size: "256",
  });
  return `/api/images/cover?${params.toString()}`;
}

function createMangaSummary(manga: MangaDexManga): MangaSummary {
  const { attributes, id, relationships } = manga;

  const coverRelationship = relationships.find(
    (relationship) => relationship.type === "cover_art",
  );

  const coverFileName =
    coverRelationship?.attributes &&
    "fileName" in coverRelationship.attributes
      ? (coverRelationship.attributes.fileName as string)
      : undefined;

  const altTitles = attributes.altTitles
    .map(
      (record) =>
        getPreferredLocaleText(record, ["en", "en-us", "en-gb"]) ||
        getPreferredLocaleText(record),
    )
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  return {
    id,
    title:
      getPreferredLocaleText(attributes.title, ["en", "en-us", "en-gb"]) ??
      (attributes.altTitles.length
        ? (attributes.altTitles
            .map((rec) => getPreferredLocaleText(rec, ["en", "en-us", "en-gb"]))
            .find((v) => Boolean(v)) as string | undefined)
        : undefined) ??
      getPreferredLocaleText(attributes.title) ??
      getPreferredLocaleText(attributes.altTitles[0] ?? {}) ??
      "Untitled series",
    altTitles,
    description: getPreferredLocaleText(attributes.description),
    status: attributes.status ?? undefined,
    year: attributes.year ?? undefined,
    contentRating: attributes.contentRating ?? undefined,
    demographic: attributes.publicationDemographic ?? undefined,
    latestChapter: attributes.latestUploadedChapter ?? undefined,
    languages: attributes.availableTranslatedLanguages ?? [],
    originalLanguage: attributes.originalLanguage ?? undefined,
    tags: attributes.tags
      .map((tag) => getPreferredLocaleText(tag.attributes.name))
      .filter((value): value is string => Boolean(value)),
    coverImage:
      coverFileName !== undefined
        ? buildCoverArtUrl(id, coverFileName)
        : undefined,
    url: `https://mangadex.org/title/${id}`,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const orderField = searchParams.get("orderField") || "followedCount";
    const orderDirection = searchParams.get("orderDirection") || "desc";
    
    const contentRatings = searchParams.getAll("contentRating[]");
    const originalLanguages = searchParams.getAll("originalLanguage[]");
    const demographics = searchParams.getAll("demographic[]");
    const statuses = searchParams.getAll("status[]");

    const searchParamsForAPI: Record<string, string | number | string[]> = {
      limit,
      offset,
      "includes[]": ["cover_art"],
      [`order[${orderField}]`]: orderDirection,
      hasAvailableChapters: "true",
    };

    // Add content ratings or default to safe + suggestive
    if (contentRatings.length > 0) {
      searchParamsForAPI["contentRating[]"] = contentRatings;
    } else {
      searchParamsForAPI["contentRating[]"] = ["safe", "suggestive"];
    }

    // Add original languages if specified
    if (originalLanguages.length > 0) {
      searchParamsForAPI["originalLanguage[]"] = originalLanguages;
    }

    // Add demographics if specified
    if (demographics.length > 0) {
      searchParamsForAPI["publicationDemographic[]"] = demographics;
    }

    // Add statuses if specified
    if (statuses.length > 0) {
      searchParamsForAPI["status[]"] = statuses;
    }

    const response = await mangadexFetch<
      MangaDexCollectionResponse<MangaDexManga>
    >("/manga", {
      searchParams: searchParamsForAPI,
      next: {
        revalidate: 60 * 5, // 5 minutes
      },
    });

    const mangas = response.data.map(createMangaSummary);

    return NextResponse.json({
      data: mangas,
      total: response.total,
      limit: response.limit,
      offset: response.offset,
      hasMore: response.offset + response.data.length < response.total,
    });
  } catch (error) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manga" },
      { status: 500 },
    );
  }
}

