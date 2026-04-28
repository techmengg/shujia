"use client";

import { Fragment, useState } from "react";

interface TagListProps {
  tags: string[];
  /** When true, each tag is rendered as a link to MangaDex tag search. */
  linkable: boolean;
  /** Cap the number of tags shown before "show all". Defaults to 20. */
  initialLimit?: number;
}

export function TagList({ tags, linkable, initialLimit = 20 }: TagListProps) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = tags.length > initialLimit;
  const visibleTags = showAll ? tags : tags.slice(0, initialLimit);

  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[0.8rem] sm:text-sm">
      {visibleTags.map((tag, index) => (
        <Fragment key={tag}>
          {index > 0 ? (
            <span aria-hidden className="text-surface-subtle/40">
              ·
            </span>
          ) : null}
          {linkable ? (
            <a
              href={`https://mangadex.org/titles?title=${encodeURIComponent(tag)}`}
              target="_blank"
              rel="noreferrer"
              className="text-surface-subtle underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              {tag}
            </a>
          ) : (
            <span className="text-surface-subtle">{tag}</span>
          )}
        </Fragment>
      ))}
      {hasMore ? (
        <>
          <span aria-hidden className="text-surface-subtle/40">
            ·
          </span>
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="bg-transparent p-0 text-[0.8rem] font-medium text-accent transition-colors hover:text-white sm:text-sm"
          >
            {showAll ? "show fewer" : `show all (${tags.length})`}
          </button>
        </>
      ) : null}
    </p>
  );
}
