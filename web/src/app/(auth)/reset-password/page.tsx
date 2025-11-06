import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Choose a new password",
};

interface ResetPasswordPageProps {
  searchParams: {
    token?: string;
  };
}

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const token = searchParams.token ?? null;

  return (
    <AuthCard
      title="Update password"
      description="Set a fresh password to protect your library progress."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
