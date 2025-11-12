"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ImportReportItem = { title?: string; url?: string; reason: string };
type ImportReport = {
  ts: number;
  source: "jsoncsv" | "mal";
  total: number;
  added: number;
  skipped: number;
  items: ImportReportItem[];
};

export default function ImportReportPage() {
  const params = useSearchParams();
  const keyParam = params.get("key");
  const [report, setReport] = useState<ImportReport | null>(null);

  const title = useMemo(() => "Import Report", []);

  useEffect(() => {
    try {
      const base = "shujia.importReport";
      const storageKey =
        keyParam && keyParam.trim().length
          ? `${base}.${keyParam}`
          : (() => {
              const last = window.localStorage.getItem(`${base}.last`);
              return last ? `${base}.${last}` : null;
            })();
      if (!storageKey) return;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ImportReport;
      setReport(parsed);
    } catch {
      // ignore
    }
  }, [keyParam]);

  const formattedDate = report
    ? new Date(report.ts).toLocaleString()
    : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-10">
      <header className="space-y-2 sm:space-y-3">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        <p className="text-sm text-white/60">
          {report
            ? `Completed on ${formattedDate} — Source: ${report.source.toUpperCase()}`
            : "No recent report found. Try importing again."}
        </p>
      </header>

      {!report ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Nothing to show yet.
        </div>
      ) : (
        <section className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="flex flex-wrap items-center gap-4">
              <span>Total: <strong className="text-white">{report.total}</strong></span>
              <span>Added: <strong className="text-emerald-300">{report.added}</strong></span>
              <span>Skipped: <strong className="text-amber-300">{report.skipped}</strong></span>
            </div>
          </div>

          {report.skipped === 0 ? (
            <p className="text-sm text-white/60">No skipped items. Great!</p>
          ) : (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Skipped items</h2>
              <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
                {report.items.map((item, idx) => (
                  <li key={`${item.title ?? "untitled"}-${idx}`} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{item.title ?? "(Untitled)"}</p>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent hover:text-white"
                        >
                          {item.url}
                        </a>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[0.7rem] text-white/70">
                      {item.reason.replace(/-/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[0.7rem] text-white/50">Showing up to {report.items.length} skipped entries.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Link href="/reading-list" className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 transition hover:border-white hover:text-white">
              Back to reading list
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}


