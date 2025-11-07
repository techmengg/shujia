import crypto from "node:crypto";

import * as OTPAuth from "otpauth";

import { hashToken } from "@/lib/auth/session";

const ISSUER = "Shujia";
const RECOVERY_CODE_GROUPS = 4;
const RECOVERY_CODE_LENGTH = 10;

function createTotp(secret: OTPAuth.Secret, label: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    secret,
    digits: 6,
    period: 30,
  });
}

export function generateTwoFactorSecret(email: string) {
  const secret = new OTPAuth.Secret();
  const totp = createTotp(secret, email);

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export function sanitizeTotpInput(code: string) {
  return code.replace(/\s+/g, "");
}

export function verifyTotpCode(secret: string, code: string) {
  const sanitized = sanitizeTotpInput(code);
  if (!sanitized) {
    return false;
  }

  try {
    const secretObj = OTPAuth.Secret.fromBase32(secret);
    const totp = createTotp(secretObj, "");
    const delta = totp.validate({
      token: sanitized,
      window: 1,
    });
    return typeof delta === "number";
  } catch (error) {
    console.error("TOTP verification failed", error);
    return false;
  }
}

function createRecoveryCode() {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LENGTH);
  const raw = bytes.toString("base64").replace(/[^A-Z0-9]/gi, "").slice(0, 4 * RECOVERY_CODE_GROUPS);
  const grouped = raw.match(new RegExp(`.{1,4}`, "g")) ?? [];
  return grouped.slice(0, RECOVERY_CODE_GROUPS).join("-").toUpperCase();
}

export function generateRecoveryCodes(count = 10) {
  const codes = Array.from({ length: count }, () => createRecoveryCode().toUpperCase());
  const hashed = codes.map((code) => hashToken(code));

  return { codes, hashed };
}

export function consumeRecoveryCode(hashedCodes: string[], candidate: string) {
  const normalized = candidate.trim().toUpperCase();
  if (!normalized) {
    return { matched: false, remaining: hashedCodes };
  }

  const candidateHash = hashToken(normalized);
  const index = hashedCodes.findIndex((value) => value === candidateHash);

  if (index === -1) {
    return { matched: false, remaining: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(index, 1);
  return { matched: true, remaining };
}
