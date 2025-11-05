-- CreateEnum
CREATE TYPE "AuthAttemptType" AS ENUM ('LOGIN', 'REGISTER', 'FORGOT_PASSWORD', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "AuthThrottleScope" AS ENUM ('IP', 'IDENTIFIER');

-- CreateTable
CREATE TABLE "AuthAttempt" (
    "id" TEXT NOT NULL,
    "type" "AuthAttemptType" NOT NULL,
    "scope" "AuthThrottleScope" NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAttempt_type_scope_hash_createdAt_idx" ON "AuthAttempt"("type", "scope", "hash", "createdAt");

