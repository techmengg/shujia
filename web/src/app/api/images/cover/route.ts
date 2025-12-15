export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

function parseParams(url: URL) {
	// MangaUpdates provides full image URLs, we just need to proxy them
	const imageUrl = url.searchParams.get("url")?.trim() ?? "";
	return { imageUrl };
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
				Referer: "https://www.mangaupdates.com/",
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
	const { imageUrl } = parseParams(url);

	if (!imageUrl) {
		return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
	}

	// Validate the URL is from MangaUpdates CDN
	try {
		const parsedUrl = new URL(imageUrl);
		if (!parsedUrl.hostname.includes('mangaupdates.com')) {
			return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
		}
	} catch {
		return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
	}

	const res = await tryFetch(imageUrl);
	if (res) {
		const contentType = res.headers.get("content-type") ?? "image/jpeg";
		const arrayBuffer = await res.arrayBuffer();
		return new NextResponse(arrayBuffer, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				// Cache aggressively at the CDN
				"Cache-Control": "public, s-maxage=31536000, immutable, stale-while-revalidate=86400",
			},
		});
	}

	return NextResponse.json({ error: "Cover not found" }, { status: 404 });
}


