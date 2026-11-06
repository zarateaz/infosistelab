/*
  Warnings:

  - You are about to drop the `ServiceProcess` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clientPhone` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipmentTypeId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ServiceProcess_serviceId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ServiceProcess";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "EquipmentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🔧',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "deliveryDate" DATETIME,
    "equipmentStage" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "advanceAmount" REAL,
    "advancePaymentMethod" TEXT,
    "balancePaymentMethod" TEXT,
    "technicianId" TEXT NOT NULL,
    "equipmentTypeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Service_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("amount", "clientName", "createdAt", "description", "id", "paymentMethod", "paymentStatus", "serviceDate", "technicianId", "title", "updatedAt") SELECT "amount", "clientName", "createdAt", "description", "id", "paymentMethod", "paymentStatus", "serviceDate", "technicianId", "title", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_serviceDate_idx" ON "Service"("serviceDate");
CREATE INDEX "Service_technicianId_idx" ON "Service"("technicianId");
CREATE INDEX "Service_equipmentTypeId_idx" ON "Service"("equipmentTypeId");
CREATE INDEX "Service_paymentStatus_idx" ON "Service"("paymentStatus");
CREATE INDEX "Service_equipmentStage_idx" ON "Service"("equipmentStage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EquipmentType_isActive_idx" ON "EquipmentType"("isActive");
