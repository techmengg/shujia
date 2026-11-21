"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders its children everywhere except on the exact paths given. */
export function HideOnPaths({ paths, children }: { paths: string[]; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return paths.includes(pathname) ? null : <>{children}</>;
}
