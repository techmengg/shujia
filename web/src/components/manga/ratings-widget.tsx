"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ReviewDialog } from "./review-dialog";

const MAX_STARS = 5;
const SHUJIA_MIN_VOTES = 5;

interface RatingsWidgetProps {
  mangaId: string;
  provider: "mangadex" | "mangaupdates";
  /** Bayesian rating from the upstream provider, on a 0-10 scale. */
  bayesian?: number | null;
  /** Vote count behind the bayesian rating. */
  bayesianVotes?: number | null;
  /** Shujia community average, on a 0-5 scale. */
  shujiaAverage?: number | null;
  /** Number of community ratings backing the shujia average. */
  shujiaVotes?: number | null;
  /** Current user's review (if signed in and they've rated). */
  initialUserRating?: number | null; // 1-10
  initialUserBody?: string | null;
  initialUserHasSpoilers?: boolean;
}

type Tab = "shujia" | "bayesian";

function StarRow({
  value,
  scaleMax,
  interactive,
  onPick,
}: {
  value: number;
  scaleMax: number;
  interactive?: boolean;
  onPick?: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const showValue = hovered ?? value;
  const ratio = Math.max(0, Math.min(1, showValue / scaleMax));

  if (!interactive) {
    return (
      <div
        aria-hidden
        className="relative inline-flex items-baseline text-base leading-none tracking-[0.18em]"
      >
        <span className="text-surface-subtle/30">{"★".repeat(MAX_STARS)}</span>
        <span
          className="absolute left-0 top-0 overflow-hidden text-accent"
          style={{ width: `${ratio * 100}%` }}
        >
          {"★".repeat(MAX_STARS)}
        </span>
      </div>
    );
  }

  const filledStars = Math.round(showValue / 2);
  return (
    <div className="inline-flex items-baseline gap-1 text-lg leading-none">
      {Array.from({ length: MAX_STARS }).map((_, i) => {
        const starIndex = i + 1;
        const dbValue = starIndex * 2;
        const isFilled = starIndex <= filledStars;
        return (
          <button
            key={starIndex}
            type="button"
            onMouseEnter={() => setHovered(dbValue)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onPick?.(dbValue)}
            className={[
              "bg-transparent p-0 transition-colors",
              isFilled
                ? "text-accent"
                : "text-surface-subtle/30 hover:text-surface-subtle",
            ].join(" ")}
            aria-label={`${starIndex} of ${MAX_STARS}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function formatVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return new Intl.NumberFormat("en-US").format(n);
}

export function RatingsWidget({
  mangaId,
  provider,
  bayesian,
  bayesianVotes,
  shujiaAverage,
  shujiaVotes,
  initialUserRating,
  initialUserBody,
  initialUserHasSpoilers,
}: RatingsWidgetProps) {
  const { isAuthenticated } = useAuth();

  const [shujiaCommunity, setShujiaCommunity] = useState({
    average: typeof shujiaAverage === "number" ? shujiaAverage : null,
    votes: typeof shujiaVotes === "number" ? shujiaVotes : 0,
  });
  const [userRating, setUserRating] = useState<number | null>(
    typeof initialUserRating === "number" ? initialUserRating : null,
  );
  const [userBody, setUserBody] = useState<string>(initialUserBody ?? "");
  const [userHasSpoilers, setUserHasSpoilers] = useState<boolean>(
    initialUserHasSpoilers ?? false,
  );
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const hasEnoughShujia =
    shujiaCommunity.votes >= SHUJIA_MIN_VOTES &&
    typeof shujiaCommunity.average === "number" &&
    Number.isFinite(shujiaCommunity.average);

  const [tab, setTab] = useState<Tab>(hasEnoughShujia ? "shujia" : "bayesian");

  const hasBayesian =
    typeof bayesian === "number" && Number.isFinite(bayesian);
  const hasBayesianVotes =
    typeof bayesianVotes === "number" &&
    Number.isFinite(bayesianVotes) &&
    bayesianVotes > 0;

  const submitRating = async (newRating: number) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/manga/${mangaId}`;
      return;
    }
    const previous = userRating;
    setPendingRating(newRating);
    setActionError(null);
    setUserRating(newRating);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId,
          provider,
          rating: newRating,
          body: userBody.trim().length > 0 ? userBody.trim() : undefined,
          hasSpoilers: userHasSpoilers,
        }),
      });
      if (!response.ok) {
        let message = "Could not save your rating.";
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) message = payload.message;
        } catch {
          /* ignore */
        }
        setUserRating(previous);
        setActionError(message);
        return;
      }
      // Optimistic community recompute: blend in the new rating.
      setShujiaCommunity((prev) => {
        const newOnFive = newRating / 2;
        if (previous === null) {
          // a new vote
          const totalVotes = prev.votes + 1;
          const oldAvg = prev.average ?? 0;
          const newAvg =
            (oldAvg * prev.votes + newOnFive) / Math.max(1, totalVotes);
          return { average: newAvg, votes: totalVotes };
        }
        // existing vote being changed
        if (prev.votes === 0 || prev.average === null) {
          return { average: newOnFive, votes: 1 };
        }
        const oldOnFive = previous / 2;
        const newAvg =
          (prev.average * prev.votes - oldOnFive + newOnFive) / prev.votes;
        return { average: newAvg, votes: prev.votes };
      });
    } catch (e) {
      console.error(e);
      setUserRating(previous);
      setActionError("Network error.");
    } finally {
      setPendingRating(null);
    }
  };

  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white sm:text-base">
          Ratings
        </h2>
        {tab === "bayesian" && hasBayesianVotes ? (
          <span className="text-[0.7rem] text-surface-subtle sm:text-xs">
            {formatVotes(bayesianVotes ?? 0)} votes
          </span>
        ) : null}
        {tab === "shujia" && hasEnoughShujia ? (
          <span className="text-[0.7rem] text-surface-subtle sm:text-xs">
            {formatVotes(shujiaCommunity.votes)} votes
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-4 text-[0.8rem] sm:gap-5 sm:text-sm">
        <button
          type="button"
          onClick={() => setTab("shujia")}
          className={[
            "shrink-0 bg-transparent p-0 font-medium transition-colors",
            tab === "shujia"
              ? "text-white underline underline-offset-[5px] decoration-accent decoration-2 sm:underline-offset-[6px]"
              : "text-surface-subtle hover:text-white",
          ].join(" ")}
        >
          Shujia
        </button>
        <button
          type="button"
          onClick={() => setTab("bayesian")}
          className={[
            "shrink-0 bg-transparent p-0 font-medium transition-colors",
            tab === "bayesian"
              ? "text-white underline underline-offset-[5px] decoration-accent decoration-2 sm:underline-offset-[6px]"
              : "text-surface-subtle hover:text-white",
          ].join(" ")}
        >
          Bayesian
        </button>
      </div>

      {tab === "shujia" ? (
        <div className="space-y-1">
          {hasEnoughShujia ? (
            <>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-white">
                  {(shujiaCommunity.average as number).toFixed(2)}
                </p>
                <StarRow
                  value={shujiaCommunity.average as number}
                  scaleMax={MAX_STARS}
                />
              </div>
              <p className="text-[0.7rem] text-surface-subtle sm:text-xs">
                /5
                <span className="italic"> · from shujia readers</span>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-white/40">—</p>
                <StarRow value={0} scaleMax={MAX_STARS} />
              </div>
              <p className="text-[0.7rem] text-surface-subtle sm:text-xs">
                /5
                <span className="italic">
                  {shujiaCommunity.votes > 0
                    ? ` · ${shujiaCommunity.votes} of ${SHUJIA_MIN_VOTES} ratings needed`
                    : " · be the first to rate"}
                </span>
              </p>
            </>
          )}

          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <p className="text-[0.7rem] text-surface-subtle sm:text-xs">
              {isAuthenticated ? "your rating" : "rate this series"}
            </p>
            <div className="flex items-baseline gap-3">
              <StarRow
                value={userRating ?? 0}
                scaleMax={10}
                interactive
                onPick={submitRating}
              />
              {pendingRating !== null ? (
                <span className="text-[0.7rem] italic text-surface-subtle">
                  saving…
                </span>
              ) : userRating !== null ? (
                <span className="text-[0.7rem] text-surface-subtle">
                  {userRating / 2} / 5
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = `/login?redirect=/manga/${mangaId}`;
                  return;
                }
                setIsReviewOpen(true);
              }}
              className="bg-transparent p-0 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
            >
              {userRating !== null && (userBody?.length ?? 0) > 0
                ? "edit review →"
                : userRating !== null
                  ? "add a review →"
                  : "write a review →"}
            </button>
            {actionError ? (
              <p className="text-[0.7rem] text-red-300">{actionError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "bayesian" ? (
        <div className="space-y-1">
          {hasBayesian ? (
            <>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-white">
                  {(bayesian as number).toFixed(2)}
                </p>
                <StarRow value={bayesian as number} scaleMax={10} />
              </div>
              <p className="text-[0.7rem] text-surface-subtle sm:text-xs">
                /10
                <span className="italic"> · weighted average</span>
              </p>
            </>
          ) : (
            <p className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
              no bayesian rating from this provider.
            </p>
          )}
        </div>
      ) : null}

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
          }}
          onDeleted={() => {
            setUserRating(null);
            setUserBody("");
            setUserHasSpoilers(false);
            setShujiaCommunity((prev) => {
              const remaining = Math.max(0, prev.votes - 1);
              if (remaining === 0 || prev.average === null) {
                return { average: null, votes: 0 };
              }
              const oldOnFive = (initialUserRating ?? 0) / 2;
              const newAvg =
                (prev.average * prev.votes - oldOnFive) / Math.max(1, remaining);
              return { average: newAvg, votes: remaining };
            });
          }}
        />
      ) : null}
    </div>
  );
}
