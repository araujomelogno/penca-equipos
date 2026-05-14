-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('COMMENT', 'USER_JOINED', 'MATCH_RESULT');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT,
    "userId" TEXT,
    "matchId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_type_createdAt_idx" ON "Activity"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_type_commentId_key" ON "Activity"("type", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_type_userId_key" ON "Activity"("type", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_type_matchId_key" ON "Activity"("type", "matchId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: root comments
INSERT INTO "Activity" ("id", "type", "commentId", "createdAt")
SELECT gen_random_uuid()::text, 'COMMENT', "id", "createdAt"
FROM "Comment"
WHERE "parentId" IS NULL;

-- Backfill: active users
INSERT INTO "Activity" ("id", "type", "userId", "createdAt")
SELECT gen_random_uuid()::text, 'USER_JOINED', "id", "createdAt"
FROM "User"
WHERE "isActive" = true;

-- Backfill: finished matches
INSERT INTO "Activity" ("id", "type", "matchId", "createdAt")
SELECT gen_random_uuid()::text, 'MATCH_RESULT', "id", "kickoffTime"
FROM "Match"
WHERE "status" = 'FINISHED';
