-- CreateTable
CREATE TABLE "MangaTitleOverride" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaTitleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MangaTitleOverride_provider_mangaId_key" ON "MangaTitleOverride"("provider", "mangaId");

-- CreateIndex
CREATE INDEX "MangaTitleOverride_provider_mangaId_idx" ON "MangaTitleOverride"("provider", "mangaId");
