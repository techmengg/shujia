CREATE TABLE "ReadingListEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "altTitles" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "year" INTEGER,
    "contentRating" TEXT,
    "demographic" TEXT,
    "latestChapter" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "coverImage" TEXT,
    "url" TEXT NOT NULL,
    "progress" TEXT,
    "rating" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingListEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadingListEntry_userId_mangaId_key" ON "ReadingListEntry"("userId", "mangaId");

ALTER TABLE "ReadingListEntry"
    ADD CONSTRAINT "ReadingListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
