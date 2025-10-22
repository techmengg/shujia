import { isEmailConfigured, sendEmail } from "@/lib/email/transport";

interface PasswordResetEmailOptions {
  to: string;
  resetUrl: string;
}

export async function dispatchPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailOptions) {
  if (!isEmailConfigured()) {
    throw new Error("Email transport is not configured.");
  }

  const subject = "Reset your ShujiaDB password";
  const text = [
    "You requested to reset the password for your ShujiaDB account.",
    "If this was you, click the secure link below to choose a new password:",
    resetUrl,
    "",
    "If you did not request this reset you can ignore this message.",
  ].join("\n");

  const html = `
    <p>You requested to reset the password for your <strong>ShujiaDB</strong> account.</p>
    <p>If this was you, click the secure link below to choose a new password:</p>
    <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a></p>
    <p>If you did not request this reset you can ignore this message.</p>
  `;

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
}
