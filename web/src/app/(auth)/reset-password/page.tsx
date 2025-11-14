import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Choose a new password",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <AuthCard
      title="Update password"
      description="Set a fresh password to protect your library progress."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
