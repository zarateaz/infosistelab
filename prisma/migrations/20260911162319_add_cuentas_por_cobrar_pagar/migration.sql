-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "ruc" TEXT,
    "documentType" TEXT,
    "concept" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "collected" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerName" TEXT NOT NULL,
    "ruc" TEXT,
    "documentType" TEXT,
    "concept" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "paid" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
