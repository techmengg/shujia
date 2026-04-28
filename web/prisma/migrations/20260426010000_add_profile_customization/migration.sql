-- AlterTable
ALTER TABLE "User" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "profileColor" TEXT;
ALTER TABLE "User" ADD COLUMN "favoriteMangaIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
