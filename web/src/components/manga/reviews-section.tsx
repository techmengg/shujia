"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ReviewDialog } from "./review-dialog";

interface ReactionCounts {
  thumbs_up: number;
  thumbs_down: number;
  funny: number;
  confusing: number;
  heart: number;
  angry: number;
}

interface ReviewData {
  id: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  rating: number;
  body: string | null;
  hasSpoilers: boolean;
  createdAt: string;
  reactions: ReactionCounts;
  userReactions: string[];
}

interface ReviewsResponse {
  data: ReviewData[];
  total: number;
}

const REACTION_TYPES = [
  { type: "thumbs_up", label: "Helpful", icon: "\u{1F44D}" },
  { type: "thumbs_down", label: "Not helpful", icon: "\u{1F44E}" },
  { type: "heart", label: "Love", icon: "\u2764\uFE0F" },
  { type: "funny", label: "Funny", icon: "\u{1F602}" },
  { type: "confusing", label: "Confusing", icon: "\u{1F914}" },
  { type: "angry", label: "Angry", icon: "\u{1F621}" },
] as const;

function StarDisplay({ rating }: { rating: number }) {
  const stars = Math.round(rating / 2);
  return (
    <span className="text-sm text-accent" aria-label={`${stars} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? "text-accent" : "text-surface-subtle/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function ReviewCard({
  review,
  isAuthenticated,
  onReact,
}: {
  review: ReviewData;
  isAuthenticated: boolean;
  onReact: (reviewId: string, type: string) => void;
}) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const showBody = review.body && (!review.hasSpoilers || spoilerRevealed);
  const displayName = review.authorName ?? review.authorUsername ?? "Anonymous";

  return (
    <div className="space-y-2.5 border-b border-white/10 pb-4 last:border-b-0">
      {/* Header: avatar + name + rating + time */}
      <div className="flex items-center gap-2.5">
        <Link
          href={`/${review.authorUsername ?? ""}`}
          className="shrink-0"
        >
          {review.authorAvatar ? (
            <Image
              src={review.authorAvatar}
              alt={displayName}
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/70">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/${review.authorUsername ?? ""}`}
              className="truncate text-sm font-semibold text-white transition-colors hover:text-accent"
            >
              {displayName}
            </Link>
            <span className="shrink-0 text-[0.7rem] text-surface-subtle">
              {timeAgo(review.createdAt)}
            </span>
          </div>
          <StarDisplay rating={review.rating} />
        </div>
      </div>

      {/* Body */}
      {review.body ? (
        review.hasSpoilers && !spoilerRevealed ? (
          <div>
            <button
              type="button"
              onClick={() => setSpoilerRevealed(true)}
              className="bg-transparent p-0 text-xs font-medium text-accent transition-colors hover:text-white"
            >
              show spoiler
            </button>
          </div>
        ) : showBody ? (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-white/80">
            {review.body}
          </p>
        ) : null
      ) : null}

      {/* Reactions */}
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_TYPES.map(({ type, label, icon }) => {
          const count = review.reactions[type as keyof ReactionCounts];
          const isActive = review.userReactions.includes(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onReact(review.id, type)}
              disabled={!isAuthenticated}
              title={isAuthenticated ? label : "Log in to react"}
              className={[
                "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[0.7rem] transition-colors sm:text-xs",
                isActive
                  ? "border-accent/40 bg-accent/10 text-white"
                  : "border-white/10 bg-transparent text-surface-subtle hover:border-white/25 hover:text-white",
                !isAuthenticated ? "cursor-default opacity-60" : "",
              ].join(" ")}
            >
              <span>{icon}</span>
              {count > 0 ? <span>{count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ReviewsSectionProps {
  mangaId: string;
  provider: "mangadex" | "mangaupdates";
  initialUserRating?: number | null;
  initialUserBody?: string | null;
  initialUserHasSpoilers?: boolean;
}

export function ReviewsSection({
  mangaId,
  provider,
  initialUserRating = null,
  initialUserBody = null,
  initialUserHasSpoilers = false,
}: ReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating ?? null);
  const [userBody, setUserBody] = useState<string>(initialUserBody ?? "");
  const [userHasSpoilers, setUserHasSpoilers] = useState(initialUserHasSpoilers);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reviews?provider=${encodeURIComponent(provider)}&mangaId=${encodeURIComponent(mangaId)}&limit=20`,
      );
      if (!res.ok) throw new Error("Failed to load reviews.");
      const payload = (await res.json()) as ReviewsResponse;
      setReviews(payload.data);
      setTotal(payload.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [mangaId, provider]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReact = useCallback(
    async (reviewId: string, type: string) => {
      if (!isAuthenticated) return;

      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id !== reviewId) return r;
          const wasActive = r.userReactions.includes(type);
          const delta = wasActive ? -1 : 1;
          return {
            ...r,
            reactions: {
              ...r.reactions,
              [type]: Math.max(0, r.reactions[type as keyof ReactionCounts] + delta),
            },
            userReactions: wasActive
              ? r.userReactions.filter((t) => t !== type)
              : [...r.userReactions, type],
          };
        }),
      );

      try {
        await fetch("/api/reviews/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewId, type }),
        });
      } catch {
        // Revert on failure
        fetchReviews();
      }
    },
    [isAuthenticated, fetchReviews],
  );

  if (isLoading) {
    return (
      <section className="space-y-2 border-t border-white/10 pt-4 sm:pt-5">
        <h2 className="text-sm font-semibold text-white sm:text-base">
          Reviews
        </h2>
        <p className="text-sm italic text-surface-subtle">Loading reviews...</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 border-t border-white/10 pt-4 sm:space-y-4 sm:pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white sm:text-base">
          Reviews
          {total > 0 ? (
            <span className="ml-1.5 text-[0.7rem] font-normal text-surface-subtle sm:text-xs">
              ({total})
            </span>
          ) : null}
        </h2>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="group inline-flex shrink-0 items-baseline gap-1 bg-transparent p-0 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
          >
            <span className="underline-offset-4 group-hover:underline">
              {userRating !== null ? "edit review" : "write a review"}
            </span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>
        ) : (
          <Link
            href={`/login?redirect=/manga/${mangaId}`}
            className="group inline-flex shrink-0 items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
          >
            <span className="underline-offset-4 group-hover:underline">
              log in to review
            </span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        )}
      </div>

      {error ? (
        <p className="text-sm italic text-red-300">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm italic text-surface-subtle">
          No reviews yet — be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isAuthenticated={isAuthenticated}
              onReact={handleReact}
            />
          ))}
        </div>
      )}

      {isReviewOpen ? (
        <ReviewDialog
          mangaId={mangaId}
          provider={provider}
          initialRating={userRating}
          initialBody={userBody}
          initialHasSpoilers={userHasSpoilers}
          onClose={() => setIsReviewOpen(false)}
          onSaved={(next) => {
            setUserRating(next.rating);
            setUserBody(next.body ?? "");
            setUserHasSpoilers(next.hasSpoilers);
            fetchReviews();
          }}
          onDeleted={() => {
            setUserRating(null);
            setUserBody("");
            setUserHasSpoilers(false);
            fetchReviews();
          }}
        />
      ) : null}
    </section>
  );
}
