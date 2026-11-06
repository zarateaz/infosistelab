-- CreateTable
CREATE TABLE "InternetClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "nextPaymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InternetClient_nextPaymentDate_idx" ON "InternetClient"("nextPaymentDate");
