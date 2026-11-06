-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "orderId" TEXT,
    "saleId" TEXT,
    "clienteTipoDoc" TEXT NOT NULL,
    "clienteNumDoc" TEXT,
    "clienteDenominacion" TEXT NOT NULL DEFAULT 'Cliente varios',
    "clienteEmail" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "total" REAL NOT NULL,
    "estado" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "cdrUrl" TEXT,
    "hash" TEXT,
    "mensajeError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "serie" TEXT NOT NULL PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_saleId_idx" ON "Invoice"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_serie_numero_key" ON "Invoice"("serie", "numero");
