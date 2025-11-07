import nodemailer from "nodemailer";
import { Resend } from "resend";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
  RESEND_API_KEY,
} = process.env;

const smtpConfigured =
  Boolean(SMTP_HOST) &&
  Boolean(SMTP_PORT) &&
  Boolean(SMTP_USER) &&
  Boolean(SMTP_PASS) &&
  Boolean(EMAIL_FROM);

const resendConfigured = Boolean(RESEND_API_KEY) && Boolean(EMAIL_FROM);

let transporterPromise:
  | ReturnType<typeof nodemailer.createTransport>
  | null = null;
let resendClient: Resend | null = null;

async function getSmtpTransporter() {
  if (!smtpConfigured) {
    throw new Error("SMTP transport attempted without configuration.");
  }

  if (transporterPromise) {
    return transporterPromise;
  }

  const port = Number.parseInt(SMTP_PORT ?? "", 10);
  const secure =
    typeof SMTP_SECURE === "string"
      ? SMTP_SECURE.toLocaleLowerCase() === "true"
      : port === 465;

  transporterPromise = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporterPromise;
}

function getResendClient() {
  if (!resendConfigured) {
    throw new Error("Resend attempted without configuration.");
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY!);
  }

  return resendClient;
}

export function isEmailConfigured() {
  return resendConfigured || smtpConfigured;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) {
  if (resendConfigured) {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: EMAIL_FROM!,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      throw new Error(`Resend email failed: ${error.message}`);
    }

    return;
  }

  if (smtpConfigured) {
    const transporter = await getSmtpTransporter();

    await transporter.sendMail({
      from: EMAIL_FROM!,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  throw new Error("Email transport attempted without configuration.");
}
