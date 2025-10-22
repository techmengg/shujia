"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Partial<Record<string, string[]>>;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 422) {
            setFieldErrors(data.errors ?? {});
            setFormError("Please correct the highlighted field.");
          } else {
            setFormError(data.message ?? "Unable to process your request.");
          }
          return;
        }

        setSuccessMessage(
          data.message ??
            "If an account exists for that email, you'll receive a reset link shortly.",
        );

        if (data.resetUrl) {
          setSuccessMessage(
            `${data.message}\nReset link (development only): ${data.resetUrl}`,
          );
        }
      } catch (error) {
        console.error("Password reset request failed", error);
        setFormError("Unable to process your request. Please try again.");
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

      {formError ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {formError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="whitespace-pre-line rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
        Remembered your password?{" "}
        <Link href="/login" className="text-accent transition hover:text-white">
          Back to sign in
        </Link>
        .
      </p>
    </form>
  );
}
