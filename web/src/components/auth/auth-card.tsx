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
    <div className="w-full max-w-md border border-white/15 p-8 text-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {description ? (
          <p className="text-sm text-surface-subtle">{description}</p>
        ) : null}
      </header>
      <div className="mt-6 space-y-4">{children}</div>
      {footer ? (
        <footer className="mt-6 text-sm text-surface-subtle">{footer}</footer>
      ) : null}
    </div>
  );
}
