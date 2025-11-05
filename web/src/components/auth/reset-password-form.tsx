"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Partial<Record<string, string[]>>;

interface ResetPasswordFormProps {
  token?: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setFormError("Reset token missing. Please request a new reset link.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, password }),
        });

        if (!response.ok) {
          if (response.status === 422) {
            const data = await response.json();
            setFieldErrors(data.errors ?? {});
            setFormError("Please fix the highlighted field.");
          } else {
            const data = await response.json();
            setFormError(data.message ?? "Unable to reset your password.");
          }
          return;
        }

        router.push("/profile");
        router.refresh();
      } catch (error) {
        console.error("Password reset failed", error);
        setFormError("Unable to reset your password. Please try again.");
      }
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Create a strong password"
          required
        />
        {fieldErrors.password ? (
          <p className="text-xs text-red-400">
            {fieldErrors.password.join(" ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Repeat your password"
          required
        />
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
        {isPending ? "Resetting…" : "Reset password"}
      </button>

      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
        Remembered it?{" "}
        <Link href="/login" className="text-accent transition hover:text-white">
          Back to sign in
        </Link>
        .
      </p>
    </form>
  );
}
