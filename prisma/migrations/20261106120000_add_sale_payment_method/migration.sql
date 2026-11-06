-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Sale" ADD COLUMN "cashboxTransactionId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Sale" ADD COLUMN "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_clientRequestId_key" ON "Sale"("clientRequestId");

-- CreateIndex
CREATE INDEX "Sale_paymentMethod_idx" ON "Sale"("paymentMethod");
