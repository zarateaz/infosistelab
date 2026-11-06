-- Defensive de-duplication before the unique constraint below: this table
-- so far only ever gained rows through the auto-seed (4 fixed names,
-- run only when the table was empty) and the admin's own "Agregar tipo"
-- form in Configuración — which never checked for an existing name before
-- this migration. If the same name was ever typed twice, keep the first
-- row (lexicographically smallest id) and repoint any Service that
-- referenced the duplicate to the survivor, so no service silently loses
-- its equipment type and the unique index below can never fail to apply.
UPDATE "Service"
SET "equipmentTypeId" = (
  SELECT MIN(e2."id") FROM "EquipmentType" e2
  WHERE e2."name" = (SELECT e1."name" FROM "EquipmentType" e1 WHERE e1."id" = "Service"."equipmentTypeId")
)
WHERE "equipmentTypeId" IN (
  SELECT e."id" FROM "EquipmentType" e
  WHERE e."id" NOT IN (SELECT MIN("id") FROM "EquipmentType" GROUP BY "name")
);

DELETE FROM "EquipmentType"
WHERE "id" NOT IN (SELECT MIN("id") FROM "EquipmentType" GROUP BY "name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_name_key" ON "EquipmentType"("name");
