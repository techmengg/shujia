"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Partial<Record<string, string[]>>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/profile";
  const googleRedirectParam =
    typeof redirectTo === "string" && redirectTo.startsWith("/")
      ? redirectTo
      : "/profile";
  const googleAuthUrl =
    googleRedirectParam === "/profile"
      ? "/api/auth/google?context=login"
      : `/api/auth/google?context=login&redirect=${encodeURIComponent(googleRedirectParam)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = { email, password };

        if (twoFactorRequired) {
          if (useRecoveryCode) {
            payload.recoveryCode = recoveryCode;
          } else {
            payload.totp = twoFactorCode;
          }
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 422) {
            setFieldErrors((data as { errors?: FieldErrors }).errors ?? {});
            setFormError("Please correct the highlighted fields.");
          } else if ((data as { requiresTwoFactor?: boolean }).requiresTwoFactor) {
            setTwoFactorRequired(true);
            setFormError(
              (data as { message?: string }).message ??
                "Enter the code from your authenticator app.",
            );
          } else {
            setFormError((data as { message?: string }).message ?? "Unable to sign in.");
          }
          return;
        }

        setTwoFactorRequired(false);
        setTwoFactorCode("");
        setRecoveryCode("");
        setUseRecoveryCode(false);

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
      <div className="space-y-4">
        <Link
          href={googleAuthUrl}
          prefetch={false}
          className="flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/10"
        >
          <span className="text-base">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                d="M22 12.23c0-.79-.07-1.54-.21-2.27H12v4.29h5.62c-.24 1.37-.98 2.53-2.09 3.31v2.75h3.39c1.98-1.82 3.08-4.5 3.08-8.08Z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.7 0 4.97-.9 6.63-2.43l-3.39-2.75c-.94.63-2.15 1-3.24 1-2.49 0-4.59-1.68-5.34-3.94H3.16v2.85C4.8 20.98 8.16 23 12 23Z"
                fill="#34A853"
              />
              <path
                d="M6.66 14.88c-.21-.63-.33-1.31-.33-2.01 0-.7.12-1.38.33-2.01V8.01H3.16A10.96 10.96 0 0 0 2 12.87c0 1.74.4 3.39 1.16 4.86l3.5-2.85Z"
                fill="#FBBC05"
              />
              <path
                d="M12 7.46c1.46 0 2.78.5 3.8 1.47l2.85-2.85C16.97 4.38 14.7 3.5 12 3.5 8.16 3.5 4.8 5.52 3.16 8.99l3.5 2.85C7.41 9.58 9.51 7.46 12 7.46Z"
                fill="#EA4335"
              />
            </svg>
          </span>
          Continue with Google
        </Link>
        <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
          <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
        </div>
      </div>

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
          required
        />
        {fieldErrors.password ? (
          <p className="text-xs text-red-400">
            {fieldErrors.password.join(" ")}
          </p>
        ) : null}
      </div>

      {twoFactorRequired ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
            <label htmlFor="two-factor-code">
              {useRecoveryCode ? "Recovery code" : "Authenticator code"}
            </label>
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode((prev) => !prev);
                setTwoFactorCode("");
                setRecoveryCode("");
              }}
              className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-accent transition hover:text-white"
            >
              Use {useRecoveryCode ? "authenticator" : "recovery"} code
            </button>
          </div>
          <input
            id="two-factor-code"
            type="text"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            value={useRecoveryCode ? recoveryCode : twoFactorCode}
            onChange={(event) =>
              useRecoveryCode
                ? setRecoveryCode(event.target.value.toUpperCase())
                : setTwoFactorCode(event.target.value)
            }
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-white/50">
            Keep this browser handy—we’ll ask for a code whenever two-factor is enabled.
          </p>
        </div>
      ) : null}

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
