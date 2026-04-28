import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Access your personalised shelf, reading history, and recommendations."
    >
      <Suspense fallback={<div className="h-40 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
