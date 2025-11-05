import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
} = process.env;

const emailConfigured =
  Boolean(SMTP_HOST) &&
  Boolean(SMTP_PORT) &&
  Boolean(SMTP_USER) &&
  Boolean(SMTP_PASS) &&
  Boolean(EMAIL_FROM);

let transporterPromise:
  | ReturnType<typeof nodemailer.createTransport>
  | null = null;

async function getTransporter() {
  if (!emailConfigured) {
    throw new Error("Email transport attempted without SMTP configuration.");
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

export function isEmailConfigured() {
  return emailConfigured;
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
  const transporter = await getTransporter();

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}
