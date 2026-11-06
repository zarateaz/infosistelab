-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Sale_deletedAt_idx" ON "Sale"("deletedAt");
