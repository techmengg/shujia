-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_provider_mangaId_idx" ON "Review"("provider", "mangaId");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE INDEX "Review_provider_mangaId_createdAt_idx" ON "Review"("provider", "mangaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_provider_mangaId_key" ON "Review"("authorId", "provider", "mangaId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy existing ReadingListEntry ratings into Review so the community
-- aggregate doesn't lose pre-existing scores. ReadingListEntry.rating is Float
-- (0-10), Review.rating is Int (1-10) — round + clamp on the way in.
INSERT INTO "Review" ("id", "authorId", "provider", "mangaId", "rating", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "userId",
  "provider",
  "mangaId",
  GREATEST(1, LEAST(10, ROUND("rating")::int)),
  "updatedAt",
  "updatedAt"
FROM "ReadingListEntry"
WHERE "rating" IS NOT NULL
ON CONFLICT ("authorId", "provider", "mangaId") DO NOTHING;
