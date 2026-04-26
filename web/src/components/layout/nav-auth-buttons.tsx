"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/auth-provider";

interface NavAuthButtonsProps {
  avatar?: string;
  username?: string | null;
}

interface MenuLinkProps {
  href: string;
  label: string;
  onClose: () => void;
}

function MenuLink({ href, label, onClose }: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="block px-4 py-2 text-sm text-white/80 transition-colors hover:text-white"
    >
      {label}
    </Link>
  );
}

export function NavAuthButtons({ avatar, username }: NavAuthButtonsProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  const profileHref = username ? `/profile/${username}` : "/profile";

  const close = useCallback(() => setOpen(false), []);

  // Position the menu below the trigger, right-aligned
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Close on route change (link clicks handle this via onClick, but
  // browser back/forward needs this)
  useEffect(() => {
    if (!open) return;
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menu = open
    ? createPortal(
        <>
          {/* Backdrop — catches all outside clicks reliably */}
          <div
            className="fixed inset-0 z-40"
            onClick={close}
            aria-hidden
          />
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 w-48 border border-white/15 bg-black py-1"
            style={{ top: pos.top, right: pos.right }}
          >
            {isAuthenticated && username ? (
              <p className="border-b border-white/10 px-4 py-2 text-xs text-surface-subtle">
                @{username}
              </p>
            ) : null}

            {isAuthenticated ? (
              <>
                <MenuLink href={profileHref} label="Profile" onClose={close} />
                <MenuLink href="/reading-list" label="Reading list" onClose={close} />
                <div className="my-1 border-t border-white/10" />
                <MenuLink href="/explore" label="Explore" onClose={close} />
                <MenuLink href="/users" label="Users" onClose={close} />
                <div className="my-1 border-t border-white/10" />
                <MenuLink href="/settings/profile" label="Settings" onClose={close} />
              </>
            ) : (
              <>
                <MenuLink href="/explore" label="Explore" onClose={close} />
                <MenuLink href="/users" label="Users" onClose={close} />
                <div className="my-1 border-t border-white/10" />
                <MenuLink href="/login" label="Log in" onClose={close} />
                <MenuLink href="/register" label="Create account" onClose={close} />
              </>
            )}
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <>
      {/* Desktop text links — hidden on mobile */}
      <Link
        href="/explore"
        className="hidden text-sm text-white/70 transition-colors hover:text-white sm:inline-flex"
      >
        Explore
      </Link>
      <Link
        href="/users"
        className="hidden text-sm text-white/70 transition-colors hover:text-white sm:inline-flex"
      >
        Users
      </Link>

      {!isAuthenticated ? (
        <Link
          href="/login"
          className="hidden text-sm text-accent transition-colors hover:text-white sm:inline-flex"
        >
          Log in
        </Link>
      ) : null}

      {/* Trigger — avatar (auth) or hamburger (guest / mobile) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className={
          isAuthenticated
            ? "inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-transparent transition hover:border-white sm:h-10 sm:w-10"
            : "inline-flex h-8 w-8 items-center justify-center border border-white/20 bg-transparent text-white/80 transition hover:border-white hover:text-white sm:hidden"
        }
      >
        {isAuthenticated ? (
          avatar ? (
            <Image
              src={avatar}
              alt=""
              width={160}
              height={160}
              sizes="(max-width: 640px) 36px, 40px"
              className="h-full w-full object-cover"
              quality={100}
              priority
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-white/10 text-xs font-semibold text-white/70">
              {(username ?? "?").charAt(0).toUpperCase()}
            </span>
          )
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 7h14M5 12h14M5 17h14"
            />
          </svg>
        )}
      </button>

      {menu}
    </>
  );
}
