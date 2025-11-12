export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

const UPLOADS_BASE = "https://uploads.mangadex.org/covers";

function buildUpstreamUrl(mangaId: string, file: string, size: "256" | "512" | "orig"): string {
	if (size === "orig") {
		return `${UPLOADS_BASE}/${mangaId}/${file}`;
	}
	return `${UPLOADS_BASE}/${mangaId}/${file}.${size}.jpg`;
}

function parseParams(url: URL) {
	const mangaId = url.searchParams.get("mangaId")?.trim() ?? "";
	const file = url.searchParams.get("file")?.trim() ?? "";
	const sizeParam = url.searchParams.get("size")?.trim() ?? "256";
	const size = sizeParam === "512" ? "512" : sizeParam === "orig" ? "orig" : "256";
	return { mangaId, file, size: size as "256" | "512" | "orig" };
}

async function tryFetch(url: string): Promise<Response | null> {
	try {
		const res = await fetch(url, {
			// We want to proxy the binary as-is; do not cache at fetch level
			cache: "no-store",
			headers: {
				Accept: "image/*,*/*;q=0.8",
				// Some CDNs are picky about User-Agent / Referer
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Shujia/1.0",
				Referer: "https://mangadex.org/",
			},
		});
		if (!res.ok) return null;
		return res;
	} catch {
		return null;
	}
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const { mangaId, file, size } = parseParams(url);

	if (!mangaId || !file) {
		return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
	}

	// Basic allowlist validation
	if (!/^[0-9a-fA-F-]{8,}$/.test(mangaId) || !/^[0-9a-fA-F-]+\.(jpg|jpeg|png|webp|gif)$/i.test(file)) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	// Attempt sequence: requested size -> alternate size -> original
	const candidates: string[] = [];
	candidates.push(buildUpstreamUrl(mangaId, file, size));
	if (size !== "512") candidates.push(buildUpstreamUrl(mangaId, file, "512"));
	if (size !== "256") candidates.push(buildUpstreamUrl(mangaId, file, "256"));
	candidates.push(buildUpstreamUrl(mangaId, file, "orig"));

	for (const candidate of candidates) {
		const res = await tryFetch(candidate);
		if (res) {
			const contentType = res.headers.get("content-type") ?? "image/jpeg";
			const arrayBuffer = await res.arrayBuffer();
			return new NextResponse(arrayBuffer, {
				status: 200,
				headers: {
					"Content-Type": contentType,
					// Cache for a month at the edge; allow revalidation
					"Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
				},
			});
		}
	}

	return NextResponse.json({ error: "Cover not found" }, { status: 404 });
}


