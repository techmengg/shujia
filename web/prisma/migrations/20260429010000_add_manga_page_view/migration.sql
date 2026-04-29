-- CreateTable
CREATE TABLE "MangaPageView" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MangaPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Powers "views per (manga, provider) within a time window" — the read
-- pattern the future internal trending rail will use.
CREATE INDEX "MangaPageView_mangaId_provider_viewedAt_idx"
    ON "MangaPageView"("mangaId", "provider", "viewedAt");

-- CreateIndex
-- Standalone time index for cheap rolling-window pruning later.
CREATE INDEX "MangaPageView_viewedAt_idx"
    ON "MangaPageView"("viewedAt");
