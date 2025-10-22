import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-black/80 p-8 text-white shadow-2xl shadow-black/40 backdrop-blur">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.2em]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-white/65">{description}</p>
        ) : null}
      </header>
      <div className="mt-6 space-y-4">{children}</div>
      {footer ? <footer className="mt-6 text-sm text-white/60">{footer}</footer> : null}
    </div>
  );
}
