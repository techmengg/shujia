import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Register"
      description="Start tracking your reading journey and curate your personalised shelves."
    >
      <RegisterForm />
    </AuthCard>
  );
}
