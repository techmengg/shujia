import type { PasswordResetToken } from "@prisma/client";

import { renderHtmlEmail } from "@/lib/email/render";

export function buildPasswordResetEmail(token: PasswordResetToken) {
  const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/reset-password?token=${token.id}`;

  const subject = "Reset your Shujia password";
  const previewText = "You requested to reset the password for your Shujia account.";

  const html = renderHtmlEmail({
    title: "Reset your password",
    previewText,
    body: `
      <p>You requested to reset the password for your <strong>Shujia</strong> account.</p>
      <p>
        Click the button below to choose a new password. The link expires in 30 minutes.
      </p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background-color:#6366f1;color:#ffffff;border-radius:9999px;text-decoration:none;font-weight:600;">Reset password</a>
      </p>
      <p style="color:#94a3b8;">
        If you did not request this, you can safely ignore this email.
      </p>
    `,
  });

  return {
    subject,
    previewText,
    html,
  };
}
