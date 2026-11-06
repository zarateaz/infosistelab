-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "payee" TEXT,
    "location" TEXT,
    "reference" TEXT,
    "payTo" TEXT,
    "phone" TEXT,
    "dueDay" INTEGER NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debtId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "cashboxTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Debt_active_category_idx" ON "Debt"("active", "category");

-- CreateIndex
CREATE INDEX "DebtPayment_period_idx" ON "DebtPayment"("period");

-- CreateIndex
CREATE UNIQUE INDEX "DebtPayment_debtId_period_key" ON "DebtPayment"("debtId", "period");

