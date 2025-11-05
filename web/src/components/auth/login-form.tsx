"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Partial<Record<string, string[]>>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 422) {
            setFieldErrors((data as { errors?: FieldErrors }).errors ?? {});
            setFormError("Please correct the highlighted fields.");
          } else {
            setFormError((data as { message?: string }).message ?? "Unable to sign in.");
          }
          return;
        }

        const username =
          typeof (data as { user?: { username?: string | null } }).user?.username === "string"
            ? (data as { user?: { username?: string | null } }).user!.username
            : null;

        let resolvedRedirect = redirectTo;
        if (redirectTo.startsWith("/profile")) {
          if (!username) {
            resolvedRedirect = "/settings?onboarding=complete-profile";
          } else if (redirectTo === "/profile") {
            resolvedRedirect = `/profile/${username}`;
          } else {
            resolvedRedirect = `/profile/${username}${redirectTo.slice("/profile".length)}`;
          }
        }

        router.push(resolvedRedirect);
        router.refresh();
      } catch (error) {
        console.error("Login failed", error);
        setFormError("Unable to sign in. Please try again.");
      }
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="you@example.com"
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-red-400">{fieldErrors.email.join(" ")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
          <label htmlFor="password">Password</label>
          <Link
            href="/forgot-password"
            className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-accent transition hover:text-white"
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="••••••••"
          required
        />
        {fieldErrors.password ? (
          <p className="text-xs text-red-400">
            {fieldErrors.password.join(" ")}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
        No account yet?{" "}
        <Link
          href="/register"
          className="text-accent transition hover:text-white"
        >
          Create one
        </Link>
        .
      </p>
    </form>
  );
}
