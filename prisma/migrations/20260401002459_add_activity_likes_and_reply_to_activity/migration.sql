-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "activityId" TEXT;

-- CreateTable
CREATE TABLE "ActivityLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLike_activityId_idx" ON "ActivityLike"("activityId");

-- CreateIndex
CREATE INDEX "ActivityLike_userId_idx" ON "ActivityLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLike_userId_activityId_key" ON "ActivityLike"("userId", "activityId");

-- CreateIndex
CREATE INDEX "Comment_activityId_idx" ON "Comment"("activityId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLike" ADD CONSTRAINT "ActivityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLike" ADD CONSTRAINT "ActivityLike_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
