"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service.
    // eslint-disable-next-line no-console
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="mx-4 max-w-lg rounded-2xl border border-white/10 bg-black/70 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
          <p className="mb-4 text-sm text-surface-subtle">
            We hit an unexpected error while loading the page.
          </p>
          {error?.digest ? (
            <p className="mb-4 text-xs text-surface-subtle">Digest: {error.digest}</p>
          ) : null}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/15"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}


