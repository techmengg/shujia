import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const DISCOVER_LINKS: FooterLink[] = [
  { label: "Explore", href: "/explore" },
  { label: "Roadmap", href: "/roadmap" },
];

const CONTRIBUTE_LINKS: FooterLink[] = [
  { label: "Add a manga", href: "/add-manga" },
  {
    label: "Submit an issue",
    href: "https://github.com/techmengg/shujia/issues",
    external: true,
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    "text-xs text-white/55 transition hover:text-white";
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-white/10 bg-black/30 text-white sm:mt-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            shujia
          </p>
          <p className="text-xs text-white/50">
            A tracker for manga, manhwa, and manhua.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs sm:grid-cols-[auto_auto]">
          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">
              Discover
            </p>
            <ul className="space-y-1.5">
              {DISCOVER_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">
              Contribute
            </p>
            <ul className="space-y-1.5">
              {CONTRIBUTE_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3 text-[0.65rem] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6 sm:py-4 lg:px-10">
          <p>© {CURRENT_YEAR} shujia.</p>
          <p>
            Metadata provided by{" "}
            <a
              href="https://www.mangaupdates.com"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 underline-offset-2 transition hover:text-white hover:underline"
            >
              MangaUpdates
            </a>
            {" "}and{" "}
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 underline-offset-2 transition hover:text-white hover:underline"
            >
              MangaDex
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
