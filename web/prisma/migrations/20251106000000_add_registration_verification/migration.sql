-- Add VERIFY_EMAIL to auth attempt enum if needed
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'VERIFY_EMAIL'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'AuthAttemptType'
      )
  ) THEN
    ALTER TYPE "AuthAttemptType" ADD VALUE 'VERIFY_EMAIL';
  END IF;
END$$;

-- Create table for pending registration verifications
CREATE TABLE IF NOT EXISTS "RegistrationVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationVerification_pkey" PRIMARY KEY ("id")
);

-- Ensure uniqueness constraints
CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_email_key"
  ON "RegistrationVerification"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_username_key"
  ON "RegistrationVerification"("username");

CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_tokenHash_key"
  ON "RegistrationVerification"("tokenHash");
