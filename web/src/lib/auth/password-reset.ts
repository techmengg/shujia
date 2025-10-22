"use server";

import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

import { hashToken } from "./session";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!record) {
    return null;
  }

  await prisma.passwordResetToken.update({
    where: {
      id: record.id,
    },
    data: {
      usedAt: new Date(),
    },
  });

  return record.userId;
}
