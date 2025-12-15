"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { ReadingListItem, ReadingListResponse } from "@/data/reading-list";

type ReadingListClientProps = {
  username?: string;
  viewerIsOwner?: boolean;
  initialOwnerLabel?: string;
};

function getMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "message" in body) {
    const m = (body as Record<string, unknown>).message;
    return typeof m === "string" ? m : undefined;
  }
  return undefined;
}

// legacy helper removed (server-side resolver now used)

type SortOption = "recent" | "alphabetical" | "rating" | "random";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "rating", label: "Rating" },
  { value: "random", label: "Random" },
];

const IMPORT_DEFAULT_CONCURRENCY = 12; // Increased from 6
const IMPORT_LARGE_CONCURRENCY = 8;    // Increased from 2
const LARGE_IMPORT_THRESHOLD = 200;
const IMPORT_THROTTLE_DELAY_MS = 50;   // Reduced from 120ms
const IMPORT_RETRY_ATTEMPTS = 5;
const IMPORT_RETRY_BASE_DELAY_MS = 600;
const IMPORT_RETRY_MAX_DELAY_MS = 6000;
const PROGRESS_UPDATE_INTERVAL = 3;    // Update UI more frequently
const RESOLVE_BATCH_SIZE = 20;         // Resolve titles in batches
const TABLE_COLUMNS = 6;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfterMs(headerValue: string | null, fallbackMs: number): number {
  if (!headerValue) return fallbackMs;

  const seconds = Number.parseFloat(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(fallbackMs, seconds * 1000);
  }

  const dateTarget = Date.parse(headerValue);
  if (Number.isFinite(dateTarget)) {
    const diff = dateTarget - Date.now();
    if (diff > 0) {
      return Math.max(fallbackMs, diff);
    }
  }

  return fallbackMs;
}

function sortReadingList(items: ReadingListItem[], sort: SortOption, seed = 0) {
  const list = [...items];

  switch (sort) {
    case "alphabetical":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return list.sort((a, b) => {
        const ratingB = typeof b.rating === "number" ? b.rating : Number.NEGATIVE_INFINITY;
        const ratingA = typeof a.rating === "number" ? a.rating : Number.NEGATIVE_INFINITY;
        return ratingB - ratingA;
      });
    case "random": {
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const random = Math.abs(Math.sin((i + 1) * (seed || Math.random() + 1)));
        const j = Math.floor(random * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    case "recent":
    default:
      return list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

function formatUpdatedAt(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function ReadingListClient({
  username,
  viewerIsOwner,
  initialOwnerLabel,
}: ReadingListClientProps) {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [sort, setSort] = useState<SortOption>("recent");
  const [randomKey, setRandomKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const malFileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ progress: "", rating: "", notes: "" });
  const [actionsOpen, setActionsOpen] = useState(false);

  const isOwner = Boolean(viewerIsOwner);
  const normalizedUsername = username?.trim().replace(/^@/, "") || null;
  const displayOwnerLabel =
    initialOwnerLabel ?? (normalizedUsername ? `@${normalizedUsername}` : null);
  const headingTitle = displayOwnerLabel
    ? `${displayOwnerLabel} Reading List`
    : isOwner
      ? "Your Reading List"
      : "Curated Reading List";
  const emptyListMessage = isOwner
    ? "Your reading list is empty. Use the search bar to add a series."
    : displayOwnerLabel
      ? `${displayOwnerLabel} has not added any series yet.`
      : "This reading list is empty.";

  useEffect(() => {
    let isSubscribed = true;

    const loadReadingList = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (normalizedUsername && !isOwner) {
          params.set("username", normalizedUsername.replace(/^@/, ""));
        }
        const endpoint = `/api/reading-list${params.toString() ? `?${params.toString()}` : ""}`;

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!isSubscribed) return;
          setIsAuthenticated(false);
          setItems([]);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load the reading list.");
        }

        const payload = (await response.json()) as ReadingListResponse;

        if (!isSubscribed) return;

        setItems(payload.data ?? []);
        setIsAuthenticated(true);
      } catch (error_) {
        console.error("Failed to load reading list", error_);
        if (!isSubscribed) return;
        setError("Could not load your reading list. Try again shortly.");
        setIsAuthenticated((previous) =>
          previous === false ? previous : true,
        );
      } finally {
        if (!isSubscribed) return;
        setIsLoading(false);
      }
    };

    loadReadingList();

    return () => {
      isSubscribed = false;
    };
  }, [isOwner, normalizedUsername]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      if (i.title.toLowerCase().includes(q)) return true;
      if (i.altTitles && i.altTitles.some((t) => t.toLowerCase().includes(q))) return true;
      if (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [items, query]);

  const sortedItems = useMemo(
    () => sortReadingList(filteredItems, sort, randomKey),
    [filteredItems, sort, randomKey],
  );

  const openEdit = (item: ReadingListItem) => {
    setEditingId(item.id);
    setEditStatus(null);
    setEditForm({
      progress: item.progress ?? "",
      rating: typeof item.rating === "number" ? String(item.rating) : "",
      notes: item.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStatus(null);
  };

  const saveEdit = async (item: ReadingListItem) => {
    if (editStatus === "Saving...") return;
    setEditStatus("Saving...");
    try {
      const ratingText = editForm.rating.trim();
      let ratingNumber: number | undefined;
      if (ratingText) {
        const n = Number.parseFloat(ratingText);
        if (Number.isFinite(n)) ratingNumber = n;
      }

      const resp = await fetch("/api/reading-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId: item.mangaId,
          progress: editForm.progress.trim() || undefined,
          rating: ratingNumber,
          notes: editForm.notes.trim() || undefined,
        }),
      });

      if (!resp.ok) {
        const bodyUnknown: unknown = await resp.json().catch(() => ({}));
        const msg = getMessage(bodyUnknown);
        setEditStatus(msg || "Failed to save changes.");
        return;
      }

      // Update local list
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                progress: editForm.progress.trim() || null,
                rating:
                  typeof ratingNumber === "number" && Number.isFinite(ratingNumber)
                    ? ratingNumber
                    : null,
                notes: editForm.notes.trim() || null,
                updatedAt: new Date().toISOString(),
              }
            : i,
        ),
      );
      setEditStatus("Saved.");
      setTimeout(() => {
        setEditingId(null);
        setEditStatus(null);
      }, 900);
    } catch {
      setEditStatus("Network error while saving.");
    }
  };

  const handleSortChange = (option: SortOption) => {
    if (option === "random") {
      setRandomKey((key) => key + 1);
    }
    setSort(option);
  };

  const renderEditFields = (item: ReadingListItem) => (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-white/70">
          <span>Progress</span>
          <input
            type="text"
            value={editForm.progress}
            onChange={(e) => setEditForm((f) => ({ ...f, progress: e.target.value }))}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-0"
            placeholder="e.g. Chapter 12"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          <span>Rating</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={editForm.rating}
            onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value }))}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-0"
            placeholder="8.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70 md:col-span-3">
          <span>Notes</span>
          <textarea
            rows={2}
            value={editForm.notes}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-0"
            placeholder="Optional notes"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => saveEdit(item)}
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/20"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Cancel
        </button>
        {editStatus ? <span className="text-xs text-white/60">{editStatus}</span> : null}
      </div>
    </>
  );

  const exportRows = useMemo(
    () =>
      items.map((item) => ({
        mangaId: item.mangaId,
        title: item.title,
        url: item.url,
        progress: item.progress?.trim() || "",
        rating: typeof item.rating === "number" ? item.rating : "",
        notes: (item.notes ?? "").replace(/\r?\n/g, " ").trim(),
      })),
    [items],
  );

  const jsonExportContent = useMemo(() => {
    if (!exportRows.length) {
      return null;
    }
    return JSON.stringify({
      source: "shujia",
      version: 1,
      exportedAt: new Date().toISOString(),
      items: exportRows,
    });
  }, [exportRows]);

  const csvExportContent = useMemo(() => {
    if (!exportRows.length) {
      return null;
    }
    const headers = ["mangaId", "title", "url", "progress", "rating", "notes"];
    const escape = (value: string | number) => {
      const str = String(value ?? "");
      return /[,"\\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.join(",")];
    for (const row of exportRows) {
      lines.push(
        [
          row.mangaId,
          row.title,
          row.url,
          row.progress,
          row.rating,
          row.notes,
        ]
          .map((value) => escape(value as string | number))
          .join(","),
      );
    }
    return lines.join("\n");
  }, [exportRows]);

  const downloadExport = (content: string | null, mime: string, extension: string) => {
    if (!content) {
      const message = "Nothing to export yet.";
      setImportStatus(message);
      window.setTimeout(() => {
        setImportStatus((current) => (current === message ? null : current));
      }, 4000);
      return;
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reading-list-${new Date().toISOString().slice(0,10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => downloadExport(jsonExportContent, "application/json", "json");

  const handleExportCsv = () => downloadExport(csvExportContent, "text/csv;charset=utf-8", "csv");

  type ImportItem = {
    title?: string;
    url?: string;
    mangaId?: string;
    rating?: number | string;
    notes?: string;
    progress?: string;
  } | string;

  type NormalizedImportItem = {
    title?: string;
    mangaId?: string;
    url?: string;
    rating?: number;
    notes?: string;
    progress?: string;
  };

  const handleImportMalXml = async (file: File) => {
    try {
      setImportStatus("Parsing MAL XML...");
      const text = await file.text();

      let doc: Document | null = null;
      try {
        const parser = new DOMParser();
        doc = parser.parseFromString(text, "application/xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Invalid XML");
        }
      } catch {
        setImportStatus("Invalid XML. Please export your MAL list as XML and try again.");
        return;
      }

      const getText = (parent: Element, tagNames: string[]): string | null => {
        for (const name of tagNames) {
          const el = parent.querySelector(name);
          if (el && el.textContent) {
            const val = el.textContent.trim();
            if (val) return val;
          }
        }
        return null;
      };

      const nodes = Array.from(doc.querySelectorAll("manga"));
      if (!nodes.length) {
        const altNodes = Array.from(doc.querySelectorAll("myanimelist > manga"));
        if (altNodes.length) {
          nodes.push(...altNodes);
        }
      }

      if (!nodes.length) {
        setImportStatus("No manga entries found in this MAL XML.");
        return;
      }

      const normalized: (NormalizedImportItem & { altTitles?: string[] })[] = [];

      for (const node of nodes) {
        const seriesId =
          getText(node, ["series_mangadb_id", "manga_mangadb_id", "mangadb_id"]) ?? "";
        const primaryTitle =
          getText(node, ["manga_title", "series_english", "series_title"]) ?? "";
        const synonymsRaw = getText(node, ["series_synonyms"]) ?? "";
        const jpTitle = getText(node, ["series_synonyms_japanese", "series_japanese"]) ?? "";
        const altTitles: string[] = [];
        if (synonymsRaw) {
          const parts = synonymsRaw.split(/;|\n|,|\|/).map((p) => p.trim()).filter(Boolean);
          for (const p of parts) {
            if (p && !altTitles.includes(p)) altTitles.push(p);
          }
        }
        if (jpTitle && !altTitles.includes(jpTitle)) altTitles.push(jpTitle);

        const chapters = getText(node, ["my_read_chapters"]);
        const volumes = getText(node, ["my_read_volumes"]);
        const scoreText = getText(node, ["my_score"]);
        const comments = getText(node, ["my_comments"]) ?? "";
        const tags = getText(node, ["my_tags"]) ?? "";

        const progressParts: string[] = [];
        if (chapters && Number.parseInt(chapters, 10) > 0) progressParts.push(`Ch ${chapters}`);
        if (volumes && Number.parseInt(volumes, 10) > 0) progressParts.push(`Vol ${volumes}`);
        const progress = progressParts.join(" • ");

        let rating: number | undefined;
        if (scoreText) {
          const n = Number.parseFloat(scoreText);
          if (Number.isFinite(n) && n > 0) rating = n;
        }

        const notesCombined = [comments, tags].filter((t) => t && t.trim().length).join(" | ");

        if (!primaryTitle) continue;

        const out: NormalizedImportItem & { altTitles?: string[] } = {
          title: primaryTitle,
          url: seriesId ? `https://myanimelist.net/manga/${seriesId}` : undefined,
          rating,
          progress: progress || undefined,
          notes: notesCombined || undefined,
          altTitles: altTitles.length ? altTitles : undefined,
        };

        normalized.push(out);
      }

      if (!normalized.length) {
        setImportStatus("No valid items found in MAL file.");
        return;
      }

      // Deduplicate by title; MAL XML does not contain MangaUpdates IDs
      const uniqueItems: (NormalizedImportItem & { altTitles?: string[] })[] = [];
      const seen = new Set<string>();
      for (const item of normalized) {
        const key = item.title ? `title:${item.title.toLowerCase()}` : null;
        if (!key) {
          continue;
        }
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        uniqueItems.push(item);
      }

      if (!uniqueItems.length) {
        setImportStatus("No new items left to import.");
        return;
      }

      // Resolution and bulk import (lightweight reuse of existing pipeline)
      let added = 0;
      let skipped = 0;
      let processed = 0;
      const total = uniqueItems.length;
      const searchCache = new Map<string, string | null>();

      const updateProgress = () => {
        setImportStatus(`Importing from MAL (${processed}/${total}). Please keep this tab open.`);
      };
      updateProgress();

      const getNextIndex = (() => {
        let cursor = 0;
        return () => {
          if (cursor >= uniqueItems.length) return null;
          const cur = cursor;
          cursor += 1;
          return cur;
        };
      })();

      const resolveMangaId = async (item: NormalizedImportItem & { altTitles?: string[] }) => {
        if (item.mangaId) return item.mangaId;
        if (!item.title) return null;
        const t = item.title.toLowerCase();
        if (searchCache.has(t)) return searchCache.get(t) ?? null;
        try {
          const resp = await fetch("/api/manga/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  title: item.title,
                  url: item.url,
                  alts: Array.isArray(item.altTitles) ? item.altTitles.slice(0, 5) : undefined,
                },
              ],
            }),
          });
          const payload = (await resp.json().catch(() => ({ data: [] }))) as {
            data?: Array<{ mangaId: string | null; title?: string }>;
          };
          const id = resp.ok ? payload?.data?.[0]?.mangaId ?? null : null;
          searchCache.set(t, id);
          return id;
        } catch {
          searchCache.set(t, null);
          return null;
        }
      };

      const pendingBatch: Array<{ mangaId: string; progress?: string; rating?: number; notes?: string }> = [];
      const BATCH_SIZE = 50;
      let isFlushing = false;

      const flushBatch = async () => {
        if (isFlushing) return;
        if (!pendingBatch.length) return;
        isFlushing = true;
        try {
          const batch = pendingBatch.splice(0, BATCH_SIZE);
          const resp = await fetch("/api/reading-list/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch }),
          });
          if (resp.ok) {
            const result = (await resp.json().catch(() => ({}))) as {
              data?: { added?: number; updated?: number; skipped?: number };
            };
            added += Number(result?.data?.added ?? 0);
            skipped += Number(result?.data?.skipped ?? 0);
          } else {
            skipped += batch.length;
          }
        } catch {
          // ignore network errors here
        } finally {
          isFlushing = false;
          if (pendingBatch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        }
      };

      const worker = async () => {
        while (true) {
          const index = getNextIndex();
          if (index === null) break;
          const item = uniqueItems[index];
          const mangaId = await resolveMangaId(item);
          if (!mangaId) {
            skipped += 1;
          } else {
            pendingBatch.push({
              mangaId,
              ...(item.progress ? { progress: item.progress } : {}),
              ...(typeof item.rating === "number" ? { rating: item.rating } : {}),
              ...(item.notes ? { notes: item.notes } : {}),
            });
            if (pendingBatch.length >= BATCH_SIZE && !isFlushing) {
              await flushBatch();
            }
          }
          processed += 1;
          if (processed === total || processed % PROGRESS_UPDATE_INTERVAL === 0) {
            updateProgress();
          }
        }
      };

      await Promise.all([worker(), worker(), worker()]);

      if (pendingBatch.length) {
        await flushBatch();
      }

      setImportStatus(`MAL import complete. Added ${added}, skipped ${skipped}.`);
      try {
        const response = await fetch("/api/reading-list", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as ReadingListResponse;
        setItems(payload.data ?? []);
      } catch {
        // ignore refresh errors
      }
    } catch (error) {
      // Report a more helpful message when possible
      const message =
        (error && typeof error === "object" && "message" in error && typeof (error as { message?: string }).message === "string")
          ? (error as { message: string }).message
          : null;
      console.error("MAL import failed:", error);
      setImportStatus(message ? `Failed to import MAL file: ${message}` : "Failed to import MAL file.");
    }
  };
  const parseCsv = (text: string): ImportItem[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    // CSV line parser supporting quotes
    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            cur += ch;
          }
        } else {
          if (ch === ',') {
            out.push(cur);
            cur = "";
          } else if (ch === '"') {
            inQuotes = true;
          } else {
            cur += ch;
          }
        }
      }
      out.push(cur);
      return out.map((c) => c.trim());
    };

    const header = splitLine(lines[0]).map((h) => h.toLowerCase());
    const findIdx = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
    const idx = {
      mangaId: findIdx(["mangaid", "id", "manga_id", "muid", "mangaupdatesid", "manga updates id"]),
      title: findIdx(["title", "name"]),
      url: findIdx(["url", "link"]),
      rating: findIdx(["rating", "score", "my_score", "rate", "stars"]),
      notes: findIdx(["notes", "comment", "comments", "review"]),
      progress: findIdx(["progress", "chapter", "chapters", "status"]),
    };
    const hasHeader = idx.title >= 0 || idx.mangaId >= 0 || idx.url >= 0;
    const start = hasHeader ? 1 : 0;
    if (!hasHeader && lines.length) {
      // Assume single-column titles when no header
      return lines.map((l) => l.trim());
    }
    const items: ImportItem[] = [];
    for (let i = start; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      items.push({
        title: idx.title >= 0 ? cols[idx.title] : undefined,
        mangaId: idx.mangaId >= 0 ? cols[idx.mangaId] : undefined,
        url: idx.url >= 0 ? cols[idx.url] : undefined,
        rating: idx.rating >= 0 ? cols[idx.rating] : undefined,
        notes: idx.notes >= 0 ? cols[idx.notes] : undefined,
        progress: idx.progress >= 0 ? cols[idx.progress] : undefined,
      });
    }
    return items;
  };

  const handleImportFile = async (file: File) => {
    try {
      setImportStatus("Parsing file...");
      const text = await file.text();
      const nameLower = file.name.toLowerCase();
      const trimmed = text.trim();

      const looksLikeJson = nameLower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[");
      const looksLikeCsv =
        nameLower.endsWith(".csv") ||
        (!looksLikeJson && /,/.test(trimmed) && !/^\{|\[/.test(trimmed));

      if (!looksLikeJson && !looksLikeCsv) {
        setImportStatus("Unsupported file format. Please upload a .json or .csv file.");
        return;
      }

      let list: ImportItem[] = [];
      if (looksLikeCsv) {
        list = parseCsv(text);
      } else {
        try {
          const json = JSON.parse(text) as { items?: ImportItem[] } | ImportItem[];
          list = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
        } catch {
          setImportStatus("Invalid JSON. Please upload a valid .json file.");
          return;
        }
      }
      if (!list.length) {
        setImportStatus("No items found in file.");
        return;
      }

      const normalized: NormalizedImportItem[] = [];
      let skipped = 0;

      for (const entry of list) {
        if (typeof entry === "string") {
          const title = entry.trim();
          if (title) {
            normalized.push({ title });
          } else {
            skipped += 1;
          }
          continue;
        }

        const normalizedItem: NormalizedImportItem = {};
        const title = (entry.title || "").toString().trim();
        let mangaId = (entry.mangaId || "").toString().trim();
        if (!mangaId && entry.url) {
          const match = String(entry.url).match(/title\/([0-9a-f-]{6,})/i);
          if (match?.[1]) {
            mangaId = match[1];
          }
        }
        if (title) normalizedItem.title = title;
        if (mangaId) normalizedItem.mangaId = mangaId;
        if (entry.url) normalizedItem.url = String(entry.url);
        if (entry.rating !== undefined && entry.rating !== null) {
          const parsedRating =
            typeof entry.rating === "number"
              ? entry.rating
              : Number.parseFloat(String(entry.rating));
          if (Number.isFinite(parsedRating)) {
            normalizedItem.rating = parsedRating as number;
          }
        }
        if (entry.notes) {
          normalizedItem.notes = String(entry.notes);
        }
        if (entry.progress) {
          normalizedItem.progress = String(entry.progress).trim();
        }

        if (normalizedItem.title || normalizedItem.mangaId) {
          normalized.push(normalizedItem);
        } else {
          skipped += 1;
        }
      }

      if (!normalized.length) {
        setImportStatus("No valid items found in file.");
        return;
      }

      const uniqueItems: NormalizedImportItem[] = [];
      const seen = new Set<string>();
      for (const item of normalized) {
        const key =
          (item.mangaId ? `id:${item.mangaId.toLowerCase()}` : null) ??
          (item.title ? `title:${item.title.toLowerCase()}` : null);
        if (!key) {
          skipped += 1;
          continue;
        }
        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);
        uniqueItems.push(item);
      }

      if (!uniqueItems.length) {
        setImportStatus("No new items left to import.");
        return;
      }

      let added = 0;
      let processed = 0;
      const total = uniqueItems.length;
      const searchCache = new Map<string, string | null>();

      const updateProgress = () => {
        setImportStatus(
          `Importing (${processed}/${total}). Please do not refresh or close this tab.`,
        );
      };
      updateProgress();

      const getNextIndex = (() => {
        let cursor = 0;
        return () => {
          if (cursor >= uniqueItems.length) {
            return null;
          }
          const current = cursor;
          cursor += 1;
          return current;
        };
      })();

      // Batch resolve multiple titles at once for better performance
      const resolveBatch = async (items: NormalizedImportItem[]) => {
        const itemsToResolve = items.filter((item) => {
          if (item.mangaId) return false;
          if (!item.title) return false;
          const normalized = item.title.toLowerCase();
          return !searchCache.has(normalized);
        });

        if (itemsToResolve.length === 0) return;

        try {
          const resp = await fetch("/api/manga/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: itemsToResolve.map((it) => ({ title: it.title, url: it.url })),
            }),
          });
          const payload = (await resp.json().catch(() => ({ data: [] }))) as {
            data?: Array<{ mangaId: string | null; title?: string }>;
          };
          if (resp.ok && payload?.data) {
            payload.data.forEach((result, idx) => {
              const item = itemsToResolve[idx];
              if (item?.title) {
                const normalized = item.title.toLowerCase();
                searchCache.set(normalized, result?.mangaId ?? null);
              }
            });
          }
        } catch {
          // Cache nulls for failed items to avoid re-trying
          itemsToResolve.forEach((item) => {
            if (item.title) {
              searchCache.set(item.title.toLowerCase(), null);
            }
          });
        }
      };

      const resolveMangaId = async (item: NormalizedImportItem) => {
        if (item.mangaId) {
          return item.mangaId;
        }
        if (!item.title) {
          return null;
        }
        const normalizedTitle = item.title.toLowerCase();
        if (searchCache.has(normalizedTitle)) {
          return searchCache.get(normalizedTitle) ?? null;
        }
        // If not in cache, it should have been batch-resolved
        return null;
      };

      // Note: Throttle is not needed as the bulk endpoint handles its own rate limiting
      // const shouldThrottle = total >= LARGE_IMPORT_THRESHOLD;

      const importEntry = async (mangaId: string, currentItem: NormalizedImportItem) => {
        const bodyPayload = {
          mangaId,
          ...(currentItem.progress ? { progress: currentItem.progress } : {}),
          ...(typeof currentItem.rating === "number" ? { rating: currentItem.rating } : {}),
          ...(currentItem.notes ? { notes: currentItem.notes } : {}),
        };

        let attempt = 0;
        let waitMs = IMPORT_RETRY_BASE_DELAY_MS;

        while (attempt < IMPORT_RETRY_ATTEMPTS) {
          attempt += 1;
          try {
            const resp = await fetch("/api/reading-list", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyPayload),
            });

            if (resp.ok) {
              // No throttle delay needed for bulk endpoint - it handles its own rate limiting
              return true;
            }

            const isRetriable =
              attempt < IMPORT_RETRY_ATTEMPTS &&
              (resp.status === 429 || resp.status === 503 || resp.status === 504 || resp.status === 500);

            if (isRetriable) {
              const retryDelay = parseRetryAfterMs(resp.headers.get("retry-after"), waitMs);
              const retrySeconds = Math.max(1, Math.ceil(retryDelay / 1000));
              setImportStatus(
                `Importing (${Math.min(processed + 1, total)}/${total}). MangaUpdates is rate limiting us, retrying in ${retrySeconds}s...`,
              );
              await sleep(retryDelay);
              waitMs = Math.min(
                Math.max(IMPORT_RETRY_BASE_DELAY_MS, retryDelay * 2),
                IMPORT_RETRY_MAX_DELAY_MS,
              );
              continue;
            }

            return false;
          } catch {
            if (attempt >= IMPORT_RETRY_ATTEMPTS) {
              return false;
            }
            await sleep(waitMs);
            waitMs = Math.min(waitMs * 2, IMPORT_RETRY_MAX_DELAY_MS);
          }
        }

        return false;
      };

      const pendingBatch: Array<{
        mangaId: string;
        progress?: string;
        rating?: number;
        notes?: string;
      }> = [];
      const BATCH_SIZE = 100; // Increased from 50 for better throughput
      let isFlushing = false;

      const flushBatch = async () => {
        if (isFlushing) return;
        if (!pendingBatch.length) return;
        isFlushing = true;
        try {
          const batch = pendingBatch.splice(0, BATCH_SIZE);
          const resp = await fetch("/api/reading-list/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch }),
          });
          if (resp.ok) {
            const result = (await resp.json().catch(() => ({}))) as {
              data?: { added?: number; updated?: number; skipped?: number };
            };
            const addedCount = Number(result?.data?.added ?? 0);
            added += addedCount;
            skipped += Number(result?.data?.skipped ?? 0);
          } else if (resp.status === 429) {
            // If rate limited on our API, briefly pause then retry once
            await sleep(1000);
            pendingBatch.unshift(...batch);
          } else {
            // Count failures as skipped to keep progress responsive
            // Fallback: try legacy per-item import to avoid losing progress
            for (const it of batch) {
              const ok = await importEntry(it.mangaId, {
                progress: it.progress,
                rating: it.rating,
                notes: it.notes,
              });
              if (ok) {
                added += 1;
              } else {
                skipped += 1;
              }
            }
          }
        } catch {
          // On network error, fallback to per-item
          // Reconstruct a temp batch from what we just attempted
          // (cannot rely on pendingBatch which was spliced)
          // No-op: nothing to retry here safely; count as skipped to surface issue
          // In next iterations, items will continue processing.
        } finally {
          isFlushing = false;
          if (pendingBatch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        }
      };

      const runImportWorker = async () => {
        while (true) {
          const index = getNextIndex();
          if (index === null) {
            break;
          }
          const currentItem = uniqueItems[index];
          const mangaId = await resolveMangaId(currentItem);
          if (!mangaId) {
            skipped += 1;
          } else {
            // Queue for bulk sending
            const payload = {
              mangaId,
              ...(currentItem.progress ? { progress: currentItem.progress } : {}),
              ...(typeof currentItem.rating === "number" ? { rating: currentItem.rating } : {}),
              ...(currentItem.notes ? { notes: currentItem.notes } : {}),
              ...(currentItem.title ? { title: currentItem.title } : {}),
              ...(currentItem.url ? { url: currentItem.url } : {}),
            };
            pendingBatch.push(payload);
            if (pendingBatch.length >= BATCH_SIZE && !isFlushing) {
              await flushBatch();
            }
          }

          processed += 1;
          if (processed === total || processed % PROGRESS_UPDATE_INTERVAL === 0) {
            updateProgress();
          }
        }
      };

      // Pre-resolve titles in batches for better performance
      const itemsNeedingResolution = uniqueItems.filter((item) => !item.mangaId && item.title);
      for (let i = 0; i < itemsNeedingResolution.length; i += RESOLVE_BATCH_SIZE) {
        const batch = itemsNeedingResolution.slice(i, i + RESOLVE_BATCH_SIZE);
        await resolveBatch(batch);
        setImportStatus(`Resolving titles (${Math.min(i + RESOLVE_BATCH_SIZE, itemsNeedingResolution.length)}/${itemsNeedingResolution.length})...`);
      }
      
      setImportStatus(`Importing ${total} items...`);
      
      const workerCount =
        total >= LARGE_IMPORT_THRESHOLD
          ? Math.min(IMPORT_LARGE_CONCURRENCY, total)
          : Math.min(IMPORT_DEFAULT_CONCURRENCY, total);
      await Promise.all(Array.from({ length: workerCount }, () => runImportWorker()));

      // Flush remaining batch
      if (pendingBatch.length) {
        await flushBatch();
      }

      setImportStatus(`Import complete. Added ${added}, skipped ${skipped}.`);
      try {
        const response = await fetch("/api/reading-list", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as ReadingListResponse;
        setItems(payload.data ?? []);
      } catch {
        // ignore refresh errors
      }
    } catch (error) {
      const message =
        (error && typeof error === "object" && "message" in error && typeof (error as { message?: string }).message === "string")
          ? (error as { message: string }).message
          : null;
      console.error("Import failed:", error);
      setImportStatus(message ? `Failed to import file: ${message}` : "Failed to import file.");
    }
  };

  const triggerImport = () => fileInputRef.current?.click();


  const handleDeleteAll = async () => {
    try {
      const resp = await fetch("/api/reading-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!resp.ok) {
        return;
      }
      setItems([]);
    } catch {
      // ignore
    }
  };

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-10 pt-6 sm:gap-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold text-white sm:text-3xl">{headingTitle}</h1>
              <span className="text-[0.7rem] text-white/50 sm:text-xs">{items.length} entries</span>
            </div>
            {!isOwner && displayOwnerLabel ? (
              <p className="mt-1 text-sm text-white/60">
                Viewing {displayOwnerLabel}&rsquo;s saved series.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0 grow sm:grow-0">
              <label className="sr-only" htmlFor="reading-list-search">Search</label>
              <input
                id="reading-list-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your list"
                className="w-full min-w-[10rem] rounded-md border border-white/20 bg-white/5 px-3 py-2 text-[0.8rem] text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:min-w-[14rem] sm:text-[0.9rem]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="sort-select">Sort</label>
              <div className="relative">
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="appearance-none rounded-md border border-white/15 bg-white/5 px-3 pr-8 py-2 text-[0.8rem] text-white/80 outline-none transition hover:border-white/30 focus:border-accent focus:text-white sm:text-[0.9rem]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0b1220]">
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
                >
                  <path d="M5.25 7.5L10 12.25L14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[0.85rem] text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Actions
                </button>
                {actionsOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-white/10 bg-white/5 p-1 shadow-lg backdrop-blur">
                    <button
                      type="button"
                      onClick={() => { setActionsOpen(false); handleExport(); }}
                      className="block w-full rounded-[6px] px-3 py-2 text-left text-[0.85rem] text-white/85 transition hover:bg-white/10"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActionsOpen(false); handleExportCsv(); }}
                      className="block w-full rounded-[6px] px-3 py-2 text-left text-[0.85rem] text-white/85 transition hover:bg-white/10"
                    >
                      Export CSV
                    </button>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setActionsOpen(false); triggerImport(); }}
                          className="block w-full rounded-[6px] px-3 py-2 text-left text-[0.85rem] text-white/85 transition hover:bg-white/10"
                        >
                      Import JSON/CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActionsOpen(false); malFileInputRef.current?.click(); }}
                      className="mt-1 block w-full rounded-[6px] px-3 py-2 text-left text-[0.85rem] text-white/85 transition hover:bg-white/10"
                    >
                      Import MAL (XML)
                        </button>
                        <div className="px-3 py-2 text-[0.7rem] text-white/50">
                      MAL works but not recommended.
                        </div>
                      </>
                    ) : null}
                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          if (window.confirm("Delete your entire reading list? This cannot be undone.")) {
                            handleDeleteAll();
                          }
                        }}
                        className="block w-full rounded-[6px] px-3 py-2 text-left text-[0.85rem] text-red-200 transition hover:bg-red-500/10"
                      >
                        Delete all
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,text/csv,.csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const nameLower = file.name.toLowerCase();
                  if (!nameLower.endsWith(".json") && !nameLower.endsWith(".csv")) {
                    setImportStatus("Unsupported file type. Please select a .json or .csv file.");
                  } else {
                    handleImportFile(file);
                  }
                }
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={malFileInputRef}
              type="file"
              accept="application/xml,.xml,text/xml"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const nameLower = file.name.toLowerCase();
                  if (!nameLower.endsWith(".xml")) {
                    setImportStatus("Unsupported file type. Please select a MAL .xml file.");
                  } else {
                    handleImportMalXml(file);
                  }
                }
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        {importStatus ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center text-[0.6rem] text-white/70 sm:rounded-2xl sm:p-3 sm:text-xs">
            {importStatus}
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-2.5 sm:rounded-2xl sm:p-4"
              >
                <div className="h-24 w-16 shrink-0 rounded-lg bg-white/10" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-1/3 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : isAuthenticated === false ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
            Log in to manage your reading list.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
            {error}
          </div>
          ) : sortedItems.length === 0 ? (
          items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
              {emptyListMessage}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
              No matches for your search.
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_25px_50px_rgba(2,6,23,0.35)] md:block">
            <table className="w-full table-fixed border-collapse text-sm text-white/80">
              <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.2em] text-white/50">
                <tr>
                  <th className="w-[42%] px-4 py-3 text-left font-medium">Series</th>
                  <th className="w-[16%] px-4 py-3 text-left font-medium">Progress</th>
                  <th className="w-[10%] px-4 py-3 text-left font-medium">Rating</th>
                  <th className="w-[12%] px-4 py-3 text-left font-medium">Updated</th>
                  <th className="w-[14%] px-4 py-3 text-left font-medium">Notes</th>
                  <th className="w-[8%] px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const progressLabel =
                    item.progress && item.progress.trim().length
                      ? item.progress
                      : "Not started yet";
                  const ratingDisplay =
                    typeof item.rating === "number" ? item.rating.toFixed(1) : "--";
                  const tags = item.tags?.length ? item.tags : [];
                  const tagsPreview = tags.slice(0, 3);
                  const remainingTags = Math.max(tags.length - tagsPreview.length, 0);
                  const titleInitial =
                    item.title && item.title.trim().length
                      ? item.title.trim().charAt(0).toUpperCase()
                      : "?";
                  const editFields = renderEditFields(item);

                  return (
                    <Fragment key={item.id}>
                      <tr className="border-t border-white/5 text-white/80 transition hover:bg-white/5 first:border-t-0">
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-stretch gap-3">
                            <div className="relative h-20 w-14 overflow-hidden rounded-md border border-white/10 bg-white/10 sm:h-24 sm:w-16">
                              {item.cover ? (
                                <Image
                                  src={item.cover}
                                  alt={item.title}
                                  fill
                                  sizes="60px"
                                  quality={90}
                                  unoptimized
                                  referrerPolicy="no-referrer"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm font-semibold text-white">
                                  {titleInitial}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <Link
                                href={`/manga/${item.mangaId}`}
                                className="block min-w-0 truncate text-[0.95rem] font-semibold text-white transition hover:text-accent md:max-w-[32rem] xl:max-w-[40rem]"
                              >
                                {item.title}
                              </Link>
                              {(item.demographic || item.status) ? (
                                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-white/50">
                                  {[item.demographic, item.status].filter(Boolean).join(" / ")}
                                </p>
                              ) : null}
                              {tagsPreview.length ? (
                                <div className="flex flex-wrap gap-1 text-[0.6rem] text-white/60">
                                  {tagsPreview.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-white/5 px-2 py-0.5 uppercase tracking-[0.14em]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {remainingTags > 0 ? (
                                    <span className="text-white/40">+{remainingTags} more</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-[0.85rem] text-white/80">
                          {progressLabel}
                        </td>
                        <td className="px-4 py-3 align-top text-center text-base font-semibold text-accent">
                          {ratingDisplay}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-white/60">
                          {formatUpdatedAt(item.updatedAt)}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-white/70">
                          {item.notes ? (
                            <p className="max-w-[14rem] text-white/80 line-clamp-2">
                              {item.notes.split(" ").slice(0, 25).join(" ")}
                              {item.notes.split(" ").length > 25 ? "…" : ""}
                            </p>
                          ) : (
                            <span className="text-white/30">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isOwner ? (
                            <div className="flex justify-end gap-2 text-[0.75rem]">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="rounded-full border border-white/15 px-3 py-1 text-white/80 transition hover:border-accent/40 hover:text-white"
                              >
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                      {editingId === item.id ? (
                        <tr className="border-t border-white/5 bg-white/5">
                          <td className="px-4 pb-5 pt-3" colSpan={TABLE_COLUMNS}>
                            {editFields}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {sortedItems.map((item) => {
              const progressLabel =
                item.progress && item.progress.trim().length
                  ? item.progress
                  : "Not started yet";
              const ratingDisplay =
                typeof item.rating === "number" ? item.rating.toFixed(1) : "--";
              const titleInitial =
                item.title && item.title.trim().length
                  ? item.title.trim().charAt(0).toUpperCase()
                  : "?";
              const editFields = renderEditFields(item);

              return (
                <Fragment key={`mobile-${item.id}`}>
                  <article className="rounded-md border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_12px_20px_rgba(3,7,18,0.35)] sm:rounded-2xl sm:p-3">
                    <div className="flex gap-2.5">
                      <div className="relative h-20 w-14 overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:h-24 sm:w-16">
                        {item.cover ? (
                          <Image
                            src={item.cover}
                            alt={item.title}
                            fill
                            sizes="96px"
                            quality={90}
                            unoptimized
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm font-semibold text-white sm:text-lg">
                            {titleInitial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/manga/${item.mangaId}`}
                            className="block min-w-0 truncate text-[0.9rem] font-semibold text-white transition hover:text-accent sm:text-base"
                          >
                            {item.title}
                          </Link>
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[0.65rem] text-white/80 transition hover:border-accent/40 hover:text-white sm:hidden"
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[0.7rem] text-white/70 sm:text-[0.8rem]">{progressLabel}</p>
                        <p className="text-[0.6rem] text-white/55 sm:text-[0.7rem]">
                          <span aria-hidden className="mr-1">★</span>
                          {ratingDisplay} • {formatUpdatedAt(item.updatedAt)}
                        </p>
                        {item.notes ? (
                          <p className="text-[0.65rem] text-white/60 line-clamp-1 sm:text-[0.75rem]">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>

                  </article>
                  {editingId === item.id ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 sm:rounded-2xl sm:p-3">
                      {editFields}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
        )}

      </section>
    </main>
  );
}
