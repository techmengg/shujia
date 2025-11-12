import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold uppercase tracking-[0.3em] text-white/80">
          Profile not found
        </h1>
        <p className="text-sm text-white/60">
          This profile doesn&apos;t exist or may have been removed.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/users"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white hover:text-white"
          >
            Browse users
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}


