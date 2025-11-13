-- CreateIndex
CREATE INDEX "ReadingListEntry_userId_updatedAt_idx" ON "ReadingListEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

