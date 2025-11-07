"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ReadingListItem, ReadingListResponse } from "@/data/reading-list";

function getMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "message" in body) {
    const m = (body as Record<string, unknown>).message;
    return typeof m === "string" ? m : undefined;
  }
  return undefined;
}

function getFirstIdFromSearch(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const obj = body as Record<string, unknown>;
  const data = obj.data as unknown;
  if (!Array.isArray(data)) return undefined;
  const first = data[0] as unknown;
  if (typeof first !== "object" || first === null) return undefined;
  const id = (first as Record<string, unknown>).id;
  return typeof id === "string" ? id : undefined;
}

type SortOption = "recent" | "alphabetical" | "rating" | "random";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "rating", label: "Rating" },
  { value: "random", label: "Random" },
];

const IMPORT_CONCURRENCY = 6;
const PROGRESS_UPDATE_INTERVAL = 5;

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

export function ReadingListClient() {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [sort, setSort] = useState<SortOption>("recent");
  const [randomKey, setRandomKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ progress: "", rating: "", notes: "" });
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isSubscribed = true;

    const loadReadingList = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reading-list", {
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
          throw new Error("Failed to load your reading list.");
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
  }, []);

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

  const toggleTags = (id: string) =>
    setExpandedTags((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSortChange = (option: SortOption) => {
    if (option === "random") {
      setRandomKey((key) => key + 1);
    }
    setSort(option);
  };

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
    rating?: number;
    notes?: string;
    progress?: string;
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
      let list: ImportItem[] = [];
      if (file.name.toLowerCase().endsWith(".csv") || text.includes(",")) {
        list = parseCsv(text);
      } else {
        const json = JSON.parse(text) as { items?: ImportItem[] } | ImportItem[];
        list = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
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
        try {
          const res = await fetch(
            `/api/manga/search?q=${encodeURIComponent(item.title)}&limit=1`,
            { cache: "no-store" },
          );
          const dataUnknown: unknown = await res.json().catch(() => ({ data: [] }));
          const resolved = res.ok ? getFirstIdFromSearch(dataUnknown) ?? null : null;
          searchCache.set(normalizedTitle, resolved);
          return resolved;
        } catch {
          searchCache.set(normalizedTitle, null);
          return null;
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
            try {
              const resp = await fetch("/api/reading-list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mangaId,
                  ...(currentItem.progress ? { progress: currentItem.progress } : {}),
                  ...(typeof currentItem.rating === "number"
                    ? { rating: currentItem.rating }
                    : {}),
                  ...(currentItem.notes ? { notes: currentItem.notes } : {}),
                }),
              });
              if (resp.ok) {
                added += 1;
              } else {
                skipped += 1;
              }
            } catch {
              skipped += 1;
            }
          }

          processed += 1;
          if (processed === total || processed % PROGRESS_UPDATE_INTERVAL === 0) {
            updateProgress();
          }
        }
      };

      const workerCount = Math.min(IMPORT_CONCURRENCY, uniqueItems.length);
      await Promise.all(Array.from({ length: workerCount }, () => runImportWorker()));

      setImportStatus(`Import complete. Added ${added}, skipped ${skipped}.`);
      try {
        const response = await fetch("/api/reading-list", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as ReadingListResponse;
        setItems(payload.data ?? []);
      } catch {
        // ignore refresh errors
      }
    } catch {
      setImportStatus("Failed to import file.");
    }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const handleDeleteAll = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteStatus("Type DELETE to confirm.");
      return;
    }
    setDeleteStatus("Deleting...");
    try {
      const resp = await fetch("/api/reading-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const dataUnknown: unknown = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = getMessage(dataUnknown);
        setDeleteStatus(msg || "Failed to delete list.");
        return;
      }
      setItems([]);
      setDeleteStatus(getMessage(dataUnknown) || "Deleted.");
      setTimeout(() => {
        setShowDeleteAll(false);
        setDeleteConfirm("");
        setDeleteStatus(null);
      }, 900);
    } catch {
      setDeleteStatus("Network error. Try again.");
    }
  };

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4">

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Curated Reading List
            </h1>
          </div>
          {/* Row 1: Sort only */}
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <span>Sort:</span>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortChange(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold transition ${
                    sort === option.value
                      ? "border-accent/60 bg-accent/20 text-accent"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-accent/40 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Search + Export/Import + Delete */}
          <div className="flex flex-1 flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <div className="min-w-0 grow sm:grow-0">
              <label className="sr-only" htmlFor="reading-list-search">Search</label>
              <input
                id="reading-list-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your list"
                className="w-full min-w-[10rem] rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-[0.8rem] text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <span className="mx-2 hidden h-4 w-px bg-white/20 sm:inline-block" aria-hidden />
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={triggerImport}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,text/csv,.csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.currentTarget.value = "";
              }}
            />
            <span className="mx-2 hidden h-4 w-px bg-white/20 sm:inline-block" aria-hidden />
            <button
              type="button"
              onClick={() => { setShowDeleteAll((s) => !s); setDeleteConfirm(""); setDeleteStatus(null); }}
              className="inline-flex items-center rounded-full border border-red-400/50 bg-red-500/10 px-3 py-1 text-[0.7rem] font-semibold text-red-200 transition hover:border-red-300 hover:text-red-100"
            >
              Delete list
            </button>
            {showDeleteAll ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="hidden sm:inline text-red-200">Type DELETE</span>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="rounded-md border border-red-400/50 bg-transparent px-2 py-1 text-[0.8rem] text-white placeholder:text-red-200/60 focus:border-red-300 focus:outline-none"
                  placeholder="DELETE"
                />
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deleteConfirm.trim().toUpperCase() !== "DELETE"}
                  className="inline-flex items-center rounded-md border border-red-400/60 bg-red-500/20 px-3 py-1 text-[0.75rem] font-semibold text-red-100 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteAll(false); setDeleteConfirm(""); setDeleteStatus(null); }}
                  className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[0.75rem] text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Cancel
                </button>
                {deleteStatus ? (
                  <span className="text-red-200">{deleteStatus}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        {importStatus ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/70">
            {importStatus}
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
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
              Your reading list is empty. Use the search bar to add a series.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
              No matches for your search.
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
          {sortedItems.map((item) => {
            const progressLabel =
              item.progress && item.progress.trim().length
                ? item.progress
                : "Not started yet";
            const ratingDisplay =
              typeof item.rating === "number" ? item.rating.toFixed(1) : "--";
            const tags = item.tags?.length ? item.tags : [];
            const titleInitial =
              item.title && item.title.trim().length
                ? item.title.trim().charAt(0).toUpperCase()
                : "?";

            return (
              <div key={item.id} className="flex flex-col gap-2">
              <article
                className="flex min-w-0 items-stretch gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition hover:border-accent/40 sm:gap-3"
              >
                <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-accent-soft via-surface-muted to-surface shadow-[0_10px_24px_rgba(8,11,24,0.32)] sm:w-16">
                  {item.cover ? (
                    <Image
                      src={item.cover}
                      alt={item.title}
                      fill
                      priority={false}
                      sizes="80px"
                      quality={100}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/40 text-lg font-semibold text-white">
                      {titleInitial}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start sm:gap-4">
                  <div className="min-w-0 space-y-1">
                    {(item.demographic || item.status) ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.demographic ? (
                          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-white/60">
                            {item.demographic}
                          </span>
                        ) : null}
                        {item.status ? (
                          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-white/50">
                            {item.status}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Link
                        href={`/manga/${item.mangaId}`}
                        className="min-w-0 max-w-[86%] truncate whitespace-nowrap pr-2 text-sm font-semibold text-white transition hover:text-accent sm:max-w-[70%] sm:text-base"
                      >
                        {item.title}
                      </Link>
                    </div>
                    <p className="text-[0.55rem] text-white/60 sm:text-[0.6rem]">
                      {progressLabel}
                    </p>
                    {item.notes ? (
                      <p className="max-w-3xl text-[0.7rem] text-white/70 line-clamp-1 sm:text-[0.8rem]">
                        {item.notes}
                      </p>
                    ) : null}
                    {tags.length ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {tags.map((tag, idx) => {
                          const hiddenOnMobile = idx >= 3 && !expandedTags[item.id];
                          return (
                            <span
                              key={tag}
                              className={`${hiddenOnMobile ? "hidden sm:inline-flex" : "inline-flex"} items-center rounded-md border border-white/10 bg-white/5 px-1 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-white/60`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {tags.length > 3 ? (
                          <button
                            type="button"
                            onClick={() => toggleTags(item.id)}
                            className="sm:hidden inline-flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:border-white/40 hover:text-white"
                          >
                            {expandedTags[item.id] ? "Show less" : "Show more"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {/* Mobile meta row */}
                    <div className="flex items-center justify-between gap-3 text-[0.6rem] text-white/60 sm:hidden">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden className="text-white">★</span>
                          {typeof item.rating === "number" ? item.rating.toFixed(1) : "--"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          Upd {formatUpdatedAt(item.updatedAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] text-white/80 transition hover:border-white/40 hover:text-white"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="hidden flex-col justify-start gap-1 text-[0.6rem] text-white/70 sm:flex sm:w-[11rem] sm:self-stretch">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2 py-0.5">
                      <span className="text-[0.5rem] uppercase tracking-[0.18em] text-white/50">
                        Rating
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                        * {ratingDisplay}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-0.5">
                      <p className="text-[0.5rem] uppercase tracking-[0.18em] text-white/50">
                        Updated
                      </p>
                      <p className="text-[0.65rem] text-white/70">
                        {formatUpdatedAt(item.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="mt-1 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </article>
              {editingId === item.id ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
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
                    <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-1 sm:hidden"></label>
                    <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-3">
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
                  <div className="mt-2 flex items-center gap-2">
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
                    {editStatus ? (
                      <span className="text-xs text-white/60">{editStatus}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              </div>
            );
          })}
          </div>
        )}
      </section>
    </main>
  );
}
