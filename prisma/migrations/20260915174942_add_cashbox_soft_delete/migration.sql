-- AlterTable
ALTER TABLE "CashboxTransaction" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "CashboxTransaction_deletedAt_idx" ON "CashboxTransaction"("deletedAt");
