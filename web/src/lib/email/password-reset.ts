import { renderHtmlEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/transport";

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPasswordResetEmail(resetUrl: string) {
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
        <a href="${resetUrl}" class="button">Reset password</a>
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
    text: htmlToText(html),
  };
}

interface DispatchPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
}

export async function dispatchPasswordResetEmail({
  to,
  resetUrl,
}: DispatchPasswordResetEmailOptions) {
  const { subject, html, text } = buildPasswordResetEmail(resetUrl);

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}
