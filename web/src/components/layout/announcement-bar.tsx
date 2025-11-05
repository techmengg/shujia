import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="border-b border-white/10 bg-white/5 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium text-white/70 sm:px-6 sm:text-sm">
        <span>Shujia is still in active development.</span>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-1 text-white transition hover:text-accent"
        >
          See the roadmap
          <span aria-hidden="true" className="text-[0.6rem]">
            &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
