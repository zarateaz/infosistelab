-- CreateTable
CREATE TABLE "Repair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "dniEncrypted" TEXT NOT NULL,
    "dniIndex" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "statusText" TEXT NOT NULL,
    "lastUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Repair_code_key" ON "Repair"("code");

-- CreateIndex
CREATE INDEX "Repair_dniIndex_idx" ON "Repair"("dniIndex");
