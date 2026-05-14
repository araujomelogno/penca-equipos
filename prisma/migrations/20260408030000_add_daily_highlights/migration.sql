-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'DAILY_HIGHLIGHTS';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "highlightsDate" TIMESTAMP(3),
ADD COLUMN     "highlightsJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_type_highlightsDate_key" ON "Activity"("type", "highlightsDate");
