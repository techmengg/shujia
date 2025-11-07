"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Status = "pending" | "success" | "error";

interface VerifyEmailClientProps {
  token?: string | null;
}

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(() =>
    token ? "pending" : "error",
  );
  const [message, setMessage] = useState<string>(() =>
    token
      ? "Verifying your email..."
      : "Verification token is missing. Request a new link to finish signing up.",
  );
  const [details, setDetails] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    async function verify() {
      setStatus("pending");
      setMessage("Verifying your email...");
      setDetails(null);

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!cancelled) {
            setStatus("error");
            setMessage(
              (data as { message?: string }).message ??
                "Unable to verify your email right now.",
            );
            if (response.status === 422) {
              setDetails("The verification token was not included.");
            }
          }
          return;
        }

        const username =
          typeof (data as { user?: { username?: string | null } }).user
            ?.username === "string"
            ? (data as { user?: { username?: string | null } }).user!.username
            : null;

        const destination = username
          ? `/profile/${username}`
          : "/settings?onboarding=complete-profile";

        if (!cancelled) {
          setStatus("success");
          setMessage("Email verified! Redirecting you to your library...");
          setDetails(null);
        }

        redirectTimer = setTimeout(() => {
          if (!cancelled) {
            router.replace(destination);
            router.refresh();
          }
        }, 1200);
      } catch (error) {
        console.error("Email verification failed", error);
        if (!cancelled) {
          setStatus("error");
          setMessage("Unable to verify your email right now.");
          setDetails("Please try again in a moment or request a new link.");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [token, attempt, router]);

  return (
    <div className="space-y-4 text-sm text-white/80">
      <div
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/80"
        role="status"
      >
        <p className="font-medium text-white">{message}</p>
        {details ? <p className="mt-1 text-xs text-white/60">{details}</p> : null}
      </div>

      {status === "pending" ? (
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
          Sit tight—this page will refresh when we finish checking your token.
        </p>
      ) : null}

      {status === "error" ? (
        <div className="space-y-2 text-xs text-white/70">
          {token ? (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="w-full rounded-full bg-white/10 px-4 py-2 font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
            >
              Try again
            </button>
          ) : null}
          <p className="text-white/60">
            Need a fresh link?{" "}
            <Link
              href="/register"
              className="text-accent transition hover:text-white"
            >
              Restart registration
            </Link>
            .
          </p>
        </div>
      ) : null}

      {status === "success" ? (
        <p className="text-xs text-emerald-200">
          You&apos;re all set. We&apos;re loading your account now.
        </p>
      ) : null}
    </div>
  );
}
