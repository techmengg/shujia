"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MobileQuickActionsProps = {
	settingsHref: string;
	isAuthenticated?: boolean;
};

export function MobileQuickActions({ settingsHref, isAuthenticated = false }: MobileQuickActionsProps) {
	const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
	const [clientAuthed, setClientAuthed] = useState<boolean>(isAuthenticated);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

	// Ensure accurate auth state on the client (helps after client-side logins without full refresh)
	useEffect(() => {
		try {
			if (typeof document !== "undefined") {
				const hasSession = document.cookie.split("; ").some((c) => c.startsWith("mynkdb_session="));
				setClientAuthed(Boolean(isAuthenticated || hasSession));
			}
		} catch {
			setClientAuthed(Boolean(isAuthenticated));
		}
		// Re-check when menu opens to capture latest cookie state after auth flows
	}, [isAuthenticated, open]);

  // Recompute dropdown position when opening / on resize / scroll
  useEffect(() => {
    function updatePosition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const gap = 8;
      setPosition({
        top: Math.round(rect.bottom + gap),
        right: Math.round(Math.max(0, window.innerWidth - rect.right)),
      });
    }
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
    return;
  }, [open]);

  return (
    <div className="relative sm:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open quick actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-transparent text-white/80 transition hover:border-white hover:text-white"
        ref={buttonRef}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      </button>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close quick actions"
                className="fixed inset-0 z-[2147483646] bg-transparent"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                className="fixed z-[2147483647] w-44 max-w-[calc(100vw-16px)] overflow-hidden rounded-md border border-white/15 bg-black p-1 text-sm text-white shadow-2xl"
                style={{
                  top: Math.max(8, position?.top ?? 56),
                  right: Math.max(8, position?.right ?? 12),
                }}
              >
				<Link
					href="/users"
					className="block rounded-[6px] px-3 py-2 text-white/85 transition hover:bg-white/10"
					onClick={() => setOpen(false)}
					role="menuitem"
				>
					Browse users
				</Link>
				{clientAuthed ? (
					<>
						<Link
							href={settingsHref}
							className="block rounded-[6px] px-3 py-2 text-white/85 transition hover:bg-white/10"
							onClick={() => setOpen(false)}
							role="menuitem"
						>
							Account settings
						</Link>
						<Link
							href="/reading-list"
							className="block rounded-[6px] px-3 py-2 text-white/85 transition hover:bg-white/10"
							onClick={() => setOpen(false)}
							role="menuitem"
						>
							Reading list
						</Link>
					</>
				) : (
					<>
						<Link
							href="/login"
							className="block rounded-[6px] px-3 py-2 text-white/85 transition hover:bg-white/10"
							onClick={() => setOpen(false)}
							role="menuitem"
						>
							Log in
						</Link>
						<Link
							href="/register"
							className="block rounded-[6px] px-3 py-2 text-white/85 transition hover:bg-white/10"
							onClick={() => setOpen(false)}
							role="menuitem"
						>
							Sign up
						</Link>
					</>
				)}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}


