ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "googleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key"
  ON "User"("googleId")
  WHERE "googleId" IS NOT NULL;
