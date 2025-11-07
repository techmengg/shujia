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

export function buildEmailVerificationMessage(verifyUrl: string) {
  const subject = "Confirm your Shujia email";
  const previewText = "Verify your email to finish creating your Shujia account.";

  const html = renderHtmlEmail({
    title: "Verify your email",
    previewText,
    body: `
      <p>Thanks for joining <strong>Shujia</strong>.</p>
      <p>
        Before we finish creating your account, confirm that this email belongs to you.
        The link expires in 60 minutes.
      </p>
      <p>
        <a href="${verifyUrl}" class="button">Verify email</a>
      </p>
      <p style="color:#94a3b8;">
        If you didn&apos;t request this, you can safely ignore this message.
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

interface DispatchEmailVerificationOptions {
  to: string;
  verifyUrl: string;
}

export async function dispatchEmailVerificationEmail({
  to,
  verifyUrl,
}: DispatchEmailVerificationOptions) {
  const { subject, html, text } = buildEmailVerificationMessage(verifyUrl);

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}
