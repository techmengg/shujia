-- CreateIndex
CREATE INDEX "Session_tokenHash_expiresAt_idx" ON "Session"("tokenHash", "expiresAt");

