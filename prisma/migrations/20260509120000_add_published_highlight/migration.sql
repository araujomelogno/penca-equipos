-- CreateTable
CREATE TABLE "PublishedHighlight" (
    "id" TEXT NOT NULL,
    "nuggetType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "userId" TEXT,
    "matchId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublishedHighlight_dedupeKey_key" ON "PublishedHighlight"("dedupeKey");

-- CreateIndex
CREATE INDEX "PublishedHighlight_nuggetType_idx" ON "PublishedHighlight"("nuggetType");

-- CreateIndex
CREATE INDEX "PublishedHighlight_publishedAt_idx" ON "PublishedHighlight"("publishedAt");
