import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset access"
      description="Enter the email linked to your account and we'll send a secure reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
