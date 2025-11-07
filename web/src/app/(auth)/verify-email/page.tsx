import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata = {
  title: "Verify your email",
};

interface VerifyEmailPageProps {
  searchParams: {
    token?: string;
  };
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = searchParams.token ?? null;

  return (
    <AuthCard
      title="Confirm your email"
      description="Click the secure link we emailed you to activate your account."
    >
      <VerifyEmailClient token={token} />
    </AuthCard>
  );
}
