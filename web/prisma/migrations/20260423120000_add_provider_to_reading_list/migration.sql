-- Add provider column; existing rows backfill to 'mangadex' via the default.
ALTER TABLE "ReadingListEntry"
    ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mangadex';

-- Replace the (userId, mangaId) unique with (userId, provider, mangaId) so the
-- same user can track the same series id across multiple providers.
DROP INDEX "ReadingListEntry_userId_mangaId_key";
CREATE UNIQUE INDEX "ReadingListEntry_userId_provider_mangaId_key"
    ON "ReadingListEntry"("userId", "provider", "mangaId");
