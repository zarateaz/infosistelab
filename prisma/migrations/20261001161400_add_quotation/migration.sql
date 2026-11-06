-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientDocType" TEXT,
    "clientDocNum" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "clientAddress" TEXT,
    "attentionTo" TEXT,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validDays" INTEGER NOT NULL DEFAULT 15,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "includeIgv" BOOLEAN NOT NULL DEFAULT true,
    "subtotal" REAL NOT NULL,
    "igv" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "deliveryTime" TEXT,
    "paymentMethod" TEXT,
    "warranty" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_code_key" ON "Quotation"("code");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "Quotation_deletedAt_idx" ON "Quotation"("deletedAt");

-- CreateIndex
CREATE INDEX "Quotation_issueDate_idx" ON "Quotation"("issueDate");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
