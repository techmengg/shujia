import type { ReactElement } from "react";

/**
 * Site-wide maintenance bar. Renders only when MAINTENANCE_MODE=true is
 * set in env. Used during the Neon migration cutover (or any future brief
 * read-only window) to warn users that writes will fail.
 *
 * Pair with the middleware write block in web/src/middleware.ts so banner
 * copy matches actual API behavior - toggling MAINTENANCE_MODE in env
 * flips both at once.
 */
export function MaintenanceBar(): ReactElement | null {
  if (process.env.MAINTENANCE_MODE !== "true") return null;

  return (
    <div className="border-b border-white/15 bg-surface">
      <div className="mx-auto flex max-w-7xl items-baseline justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 lg:px-10">
        <p className="text-center text-[0.7rem] text-white/85 sm:text-xs">
          <span className="font-semibold">Brief maintenance in progress.</span>{" "}
          <span className="italic text-surface-subtle">
            New ratings, reviews, and reading-list edits won&apos;t save for a few minutes.
          </span>
        </p>
      </div>
    </div>
  );
}
