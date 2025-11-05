import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      {children}
    </main>
  );
}
