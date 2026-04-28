"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { ReadingListItem, ReadingListResponse } from "@/data/reading-list";
import { normalizeStatus, statusLabel, type NormalizedStatus } from "@/lib/manga/status";

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
  { value: "recent", label: "Recent" },
  { value: "alphabetical", label: "A-Z" },
  { value: "rating", label: "Rating" },
  { value: "random", label: "Random" },
];

type StatusFilterValue = "all" | NormalizedStatus;

const STATUS_FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "plan-to-read", label: "Plan to read" },
  { value: "on-hold", label: "On hold" },
  { value: "dropped", label: "Dropped" },
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
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");

  const isOwner = Boolean(viewerIsOwner);
  const normalizedUsername = username?.trim().replace(/^@/, "") || null;
  const displayOwnerLabel =
    initialOwnerLabel ?? (normalizedUsername ? `@${normalizedUsername}` : null);
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

  const statusCounts = useMemo(() => {
    const counts: Record<NormalizedStatus, number> = {
      completed: 0,
      reading: 0,
      "on-hold": 0,
      dropped: 0,
      "plan-to-read": 0,
      unknown: 0,
    };
    for (const item of items) {
      counts[normalizeStatus(item.status)] += 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((i) => normalizeStatus(i.status) === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => {
        if (i.title.toLowerCase().includes(q)) return true;
        if (i.altTitles && i.altTitles.some((t) => t.toLowerCase().includes(q))) return true;
        if (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    return list;
  }, [items, query, statusFilter]);

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
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[0.7rem] text-white/55 sm:text-xs">
          <span>Progress</span>
          <input
            type="text"
            value={editForm.progress}
            onChange={(e) => setEditForm((f) => ({ ...f, progress: e.target.value }))}
            className="border-b border-white/15 bg-transparent py-1 text-sm text-white placeholder:italic placeholder:text-white/30 focus:border-accent focus:outline-none"
            placeholder="e.g. Chapter 12"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] text-white/55 sm:text-xs">
          <span>Rating (0&ndash;10)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={editForm.rating}
            onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value }))}
            className="border-b border-white/15 bg-transparent py-1 text-sm text-white placeholder:italic placeholder:text-white/30 focus:border-accent focus:outline-none"
            placeholder="8.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] text-white/55 sm:col-span-2 sm:text-xs">
          <span>Notes</span>
          <textarea
            rows={2}
            value={editForm.notes}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            className="border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white placeholder:italic placeholder:text-white/30 focus:border-accent focus:outline-none"
            placeholder="Optional notes"
          />
        </label>
      </div>
      <div className="flex items-baseline gap-4">
        <button
          type="button"
          onClick={() => saveEdit(item)}
          className="group inline-flex items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
        >
          <span className="underline-offset-4 group-hover:underline">save</span>
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="text-[0.7rem] font-medium text-white/45 transition hover:text-white sm:text-xs"
        >
          cancel
        </button>
        {editStatus ? (
          <span className="text-[0.7rem] italic text-surface-subtle sm:text-xs">{editStatus}</span>
        ) : null}
      </div>
    </div>
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

      // Deduplicate by title; MAL XML does not contain MangaDex IDs
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
      mangaId: findIdx(["mangaid", "id", "manga_id", "mdid", "mangadexid", "manga dex id"]),
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
                `Importing (${Math.min(processed + 1, total)}/${total}). MangaDex is rate limiting us, retrying in ${retrySeconds}s...`,
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
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold text-white sm:text-2xl">Reading list</h1>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="group inline-flex items-baseline gap-1 text-xs font-medium text-accent transition-colors hover:text-white"
            >
              <span className="underline-offset-4 group-hover:underline">actions</span>
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                &rarr;
              </span>
            </button>
            {actionsOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-48 border border-white/15 bg-surface">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    handleExport();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    handleExportCsv();
                  }}
                  className="block w-full border-t border-white/10 px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Export CSV
                </button>
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        triggerImport();
                      }}
                      className="block w-full border-t border-white/10 px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Import JSON / CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        malFileInputRef.current?.click();
                      }}
                      className="block w-full border-t border-white/10 px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Import MAL XML
                      <span className="ml-1 text-[0.65rem] italic text-surface-subtle">(legacy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        if (
                          window.confirm(
                            "Delete your entire reading list? This cannot be undone.",
                          )
                        ) {
                          handleDeleteAll();
                        }
                      }}
                      className="block w-full border-t border-white/10 px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      Delete all
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-1 text-[0.7rem] text-white/40 sm:text-xs">
          {!isOwner && normalizedUsername ? (
            <>
              <Link
                href={`/${encodeURIComponent(normalizedUsername.toLowerCase())}`}
                className="text-accent transition-colors hover:text-white"
              >
                @{normalizedUsername}
              </Link>
              <span className="mx-1.5 text-white/15">&middot;</span>
            </>
          ) : null}
          <span className="tabular-nums text-white/60">{items.length}</span>
          <span> entries</span>
        </p>
      </header>

      {/* Toolbar: search + sort */}
      <div className="mb-4 grid gap-3 sm:mb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-6">
        <div className="relative">
          <label className="sr-only" htmlFor="reading-list-search">
            Search
          </label>
          <input
            id="reading-list-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your list"
            className="w-full border-b border-white/15 bg-transparent py-1.5 pr-7 text-sm text-white placeholder:italic placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-sm leading-none text-white/40 transition hover:text-white"
            >
              &times;
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.7rem] sm:text-xs">
          <span className="text-white/35">sort</span>
          {SORT_OPTIONS.map((option, i) => (
            <Fragment key={option.value}>
              {i > 0 ? <span className="text-white/15">&middot;</span> : null}
              <button
                type="button"
                onClick={() => handleSortChange(option.value)}
                className={`font-medium transition ${
                  sort === option.value
                    ? "text-white underline underline-offset-[5px] decoration-accent decoration-2"
                    : "text-surface-subtle hover:text-white"
                }`}
              >
                {option.label.toLowerCase()}
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Status filter chips */}
      {items.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-white/10 pb-3 text-[0.7rem] sm:mb-5 sm:gap-x-5 sm:text-xs">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.value === "all" ? items.length : statusCounts[filter.value];
            if (filter.value !== "all" && count === 0) return null;
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`group inline-flex items-baseline gap-1 font-medium transition ${
                  active
                    ? "text-white underline underline-offset-[5px] decoration-accent decoration-2"
                    : "text-surface-subtle hover:text-white"
                }`}
              >
                <span>{filter.label.toLowerCase()}</span>
                <span
                  className={`tabular-nums ${
                    active ? "text-accent" : "text-white/25 group-hover:text-white/45"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Status messages */}
      {importStatus ? (
        <p className="mb-4 border border-white/15 px-3 py-2 text-[0.7rem] italic text-surface-subtle sm:px-4 sm:text-xs">
          {importStatus}
        </p>
      ) : null}

      {/* Body */}
      {isLoading ? (
        <p className="text-sm italic text-surface-subtle">Loading…</p>
      ) : isAuthenticated === false ? (
        <p className="text-sm italic text-surface-subtle">
          Log in to manage your reading list.
        </p>
      ) : error ? (
        <p className="text-sm italic text-red-300">{error}</p>
      ) : sortedItems.length === 0 ? (
        items.length === 0 ? (
          <p className="text-sm italic text-surface-subtle">{emptyListMessage}</p>
        ) : (
          <p className="text-sm italic text-surface-subtle">
            {query ? `No matches for "${query}".` : "No entries match this filter."}
          </p>
        )
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {sortedItems.map((item) => {
            const cleanStatus = statusLabel(item.status);
            const ratingDisplay =
              typeof item.rating === "number" ? item.rating.toFixed(1) : null;
            const tags = item.tags?.length ? item.tags : [];
            const tagsPreview = tags.slice(0, 3);
            const remainingTags = Math.max(tags.length - tagsPreview.length, 0);
            const titleInitial =
              item.title?.trim().charAt(0).toUpperCase() || "?";
            const isEditing = editingId === item.id;
            const metaTopBits = [cleanStatus, item.demographic, ...tagsPreview].filter(
              Boolean,
            ) as string[];
            const progressLabel = item.progress?.trim() || null;

            return (
              <li
                key={item.id}
                className={`relative transition-colors ${
                  isEditing
                    ? "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-accent"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3 px-1 py-2.5 sm:gap-4 sm:px-2 sm:py-3">
                  <Link
                    href={`/manga/${item.mangaId}`}
                    className="relative h-16 w-11 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85 sm:h-20 sm:w-14"
                  >
                    {item.cover ? (
                      <Image
                        src={item.cover}
                        alt={item.title}
                        fill
                        sizes="56px"
                        quality={90}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
                        {titleInitial}
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/manga/${item.mangaId}`}
                        className="line-clamp-1 min-w-0 text-sm font-medium text-white transition hover:text-accent sm:text-[0.95rem]"
                      >
                        {item.title}
                      </Link>
                      {ratingDisplay ? (
                        <span className="shrink-0 text-xs font-medium tabular-nums text-accent sm:text-sm">
                          {ratingDisplay}
                        </span>
                      ) : null}
                    </div>

                    {metaTopBits.length > 0 ? (
                      <p className="line-clamp-1 text-[0.65rem] text-white/45 sm:text-[0.7rem]">
                        {metaTopBits.join(" · ")}
                        {remainingTags > 0 ? (
                          <span className="text-white/30"> +{remainingTags}</span>
                        ) : null}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.65rem] text-white/45 sm:text-[0.7rem]">
                      {progressLabel ? (
                        <span className="text-white/65">{progressLabel}</span>
                      ) : (
                        <span className="italic text-white/30">Not started</span>
                      )}
                      <span className="text-white/15">&middot;</span>
                      <span>{formatUpdatedAt(item.updatedAt)}</span>
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => (isEditing ? cancelEdit() : openEdit(item))}
                          className="group ml-auto inline-flex items-baseline gap-1 font-medium text-accent transition-colors hover:text-white"
                        >
                          <span className="underline-offset-4 group-hover:underline">
                            {isEditing ? "close" : "edit"}
                          </span>
                          <span
                            aria-hidden
                            className="transition-transform duration-200 group-hover:translate-x-0.5"
                          >
                            &rarr;
                          </span>
                        </button>
                      ) : null}
                    </div>

                    {item.notes ? (
                      <p className="mt-0.5 line-clamp-2 text-[0.7rem] italic text-white/55 sm:text-xs">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="border-l-2 border-accent/40 px-3 pb-3 pt-1 sm:pl-6">
                    {renderEditFields(item)}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden file inputs */}
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
              setImportStatus(
                "Unsupported file type. Please select a .json or .csv file.",
              );
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
              setImportStatus(
                "Unsupported file type. Please select a MAL .xml file.",
              );
            } else {
              handleImportMalXml(file);
            }
          }
          e.currentTarget.value = "";
        }}
      />
    </main>
  );
}
