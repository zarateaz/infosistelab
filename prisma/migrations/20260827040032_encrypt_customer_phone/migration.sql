/*
  Warnings:

  - Added the required column `customerPhoneIndex` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerPhoneIndex" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Order" ("createdAt", "customerName", "customerPhone", "date", "id", "total") SELECT "createdAt", "customerName", "customerPhone", "date", "id", "total" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_customerPhoneIndex_idx" ON "Order"("customerPhoneIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
