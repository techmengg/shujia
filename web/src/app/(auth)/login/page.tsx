import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in · Shujia",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Access your personalised shelf, reading history, and recommendations."
      footer={
        <>
          By continuing you agree to our{" "}
          <span className="font-semibold text-white">reader&apos;s covenant</span>.
        </>
      }
    >
      <Suspense
        fallback={
          <div className="h-40 w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
