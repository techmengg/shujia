import Image from "next/image";

import type { NewsHeadline } from "@/lib/news/animenewsnetwork";
import { formatRelativeTime } from "@/lib/utils/relative-time";

interface NewsSectionProps {
  items: NewsHeadline[];
}

export function NewsSection({ items }: NewsSectionProps) {
  const top = items.slice(0, 4);
  if (!top.length) {
    return (
      <p className="text-sm italic text-surface-subtle">
        News temporarily unavailable.
      </p>
    );
  }

  const [primary, ...rest] = top;
  // 3 stacked tiles on the right balance the height of the 16:9 primary
  // on the left — keeps both columns roughly equal so the bottom of the
  // section reads as a clean rectangle with no orphan gap.
  const supporting = rest.slice(0, 3);

  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      {primary ? <PrimaryTile item={primary} /> : null}

      {supporting.length ? (
        <div className="flex flex-col divide-y divide-white/10">
          {supporting.map((item, i) => (
            <SecondaryTile
              key={item.url}
              item={item}
              isFirst={i === 0}
              isLast={i === supporting.length - 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryTile({ item }: { item: NewsHeadline }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex h-full flex-col"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/10 bg-white/5">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white transition-colors group-hover:text-accent sm:text-lg">
          {item.title}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
            {item.description}
          </p>
        ) : null}
        <Meta item={item} />
      </div>
    </a>
  );
}

function SecondaryTile({
  item,
  isFirst,
  isLast,
}: {
  item: NewsHeadline;
  isFirst: boolean;
  isLast: boolean;
}) {
  // First row has no top padding (header is the cap); last row has no
  // bottom padding (section margin caps). Middle rows get balanced
  // top+bottom so the dividers space evenly down the column.
  const padClass = isFirst
    ? "pb-3"
    : isLast
      ? "pt-3"
      : "py-3";

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`group flex flex-1 gap-3 ${padClass}`}
    >
      <div className="relative aspect-[4/3] h-16 shrink-0 overflow-hidden border border-white/10 bg-white/5 sm:h-[4.5rem] sm:w-[5.5rem]">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="88px"
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
        <p className="line-clamp-2 text-[0.85rem] font-medium text-white transition-colors group-hover:text-accent sm:text-sm">
          {item.title}
        </p>
        {item.description ? (
          <p className="line-clamp-1 text-[0.7rem] text-surface-subtle">
            {item.description}
          </p>
        ) : null}
        <Meta item={item} compact />
      </div>
    </a>
  );
}

function Meta({ item, compact = false }: { item: NewsHeadline; compact?: boolean }) {
  const sizeClass = compact
    ? "text-[0.65rem] sm:text-[0.7rem]"
    : "text-[0.7rem] sm:text-xs";
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-surface-subtle ${sizeClass}`}
    >
      {typeof item.score === "number" ? (
        <span className="inline-flex items-baseline gap-0.5 tabular-nums">
          <span aria-hidden className="text-emerald-400">
            ↑
          </span>
          <span>{formatScore(item.score)}</span>
        </span>
      ) : null}
      {typeof item.score === "number" && item.publishedAt ? (
        <span aria-hidden className="text-white/15">
          ·
        </span>
      ) : null}
      {item.publishedAt ? <span>{formatRelativeTime(item.publishedAt)}</span> : null}
    </div>
  );
}

function formatScore(score: number): string {
  if (score < 1000) return String(score);
  if (score < 10_000) return `${(score / 1000).toFixed(1)}k`;
  return `${Math.round(score / 1000)}k`;
}
