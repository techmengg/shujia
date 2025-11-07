"use server";

import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { hashToken } from "./session";

const REGISTRATION_TOKEN_TTL_MS = 1000 * 60 * 60; // 60 minutes
const REGISTRATION_CLEANUP_PROBABILITY = 0.05;

interface CreateRegistrationVerificationOptions {
  email: string;
  username: string;
  name?: string | null;
  passwordHash: string;
}

export async function createRegistrationVerification({
  email,
  username,
  name,
  passwordHash,
}: CreateRegistrationVerificationOptions) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_TTL_MS);

  await prisma.registrationVerification.deleteMany({
    where: {
      OR: [{ email }, { username }],
    },
  });

  await prisma.registrationVerification.create({
    data: {
      email,
      username,
      name: name ?? null,
      passwordHash,
      tokenHash,
      expiresAt,
    },
  });

  if (Math.random() < REGISTRATION_CLEANUP_PROBABILITY) {
    const cutoff = new Date(Date.now() - REGISTRATION_TOKEN_TTL_MS * 2);
    void prisma.registrationVerification
      .deleteMany({
        where: {
          expiresAt: {
            lt: cutoff,
          },
        },
      })
      .catch((error) => {
        console.error("Registration verification cleanup failed", error);
      });
  }

  return {
    token,
    expiresAt,
  };
}

type PendingRegistration = {
  email: string;
  username: string;
  name: string | null;
  passwordHash: string;
};

export async function consumeRegistrationVerificationToken(
  token: string,
): Promise<PendingRegistration | null> {
  const tokenHash = hashToken(token);

  const record = await prisma.registrationVerification.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!record) {
    return null;
  }

  try {
    await prisma.registrationVerification.delete({
      where: {
        id: record.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }
    throw error;
  }

  return {
    email: record.email,
    username: record.username,
    name: record.name,
    passwordHash: record.passwordHash,
  };
}
