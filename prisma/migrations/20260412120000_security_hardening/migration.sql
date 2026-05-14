-- AlterTable: OtpCode — track failed attempts for brute-force protection
ALTER TABLE "OtpCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: InvitationCode — enforce max uses (default 20 per code)
ALTER TABLE "InvitationCode" ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 20;

-- Existing codes: ensure cap is at least the default, and never below current usage.
UPDATE "InvitationCode" SET "maxUses" = GREATEST("usageCount", 20);
