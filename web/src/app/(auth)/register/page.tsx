import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create account • ShujiaDB",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create account"
      description="Start tracking your reading journey and curate your personalised shelves."
    >
      <RegisterForm />
    </AuthCard>
  );
}
