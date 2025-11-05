"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Partial<Record<string, string[]>>;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
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
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email,
            password,
          }),
        });

        if (!response.ok) {
          if (response.status === 422) {
            const data = await response.json();
            setFieldErrors(data.errors ?? {});
            setFormError("Please fix the highlighted fields.");
          } else {
            const data = await response.json();
            setFormError(data.message ?? "Unable to create your account.");
          }
          return;
        }

        router.push("/profile");
        router.refresh();
      } catch (error) {
        console.error("Registration failed", error);
        setFormError("Unable to create your account. Please try again.");
      }
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
        >
          Display name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Yuzu"
        />
        {fieldErrors.name ? (
          <p className="text-xs text-red-400">{fieldErrors.name.join(" ")}</p>
        ) : null}
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
          placeholder="you@example.com"
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-red-400">{fieldErrors.email.join(" ")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
        >
          Password
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
        {isPending ? "Creating…" : "Create account"}
      </button>

      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-accent transition hover:text-white">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
