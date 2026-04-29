"use client";

import { useEffect } from "react";

/**
 * Forces the window to scroll to the top whenever the keyed value changes.
 * Used on the manga detail page so that navigating between two `/manga/<id>`
 * routes (which share the same route segment and thus don't always trigger
 * Next.js's default scroll-to-top behavior) consistently lands the reader
 * at the top of the new page.
 */
export function ScrollToTopOnMount({ trigger }: { trigger: string | number }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [trigger]);
  return null;
}
