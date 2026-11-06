/**
 * scripts/migrate-categories-to-spanish.ts
 *
 * Scans the database (Product and Category tables) and converts all English or
 * outdated category names to clean, standard Spanish.
 * Safe and idempotent: can be run repeatedly without issues.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { translateCategoryToSpanish } from "../src/lib/categoryUtils";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Migración de Categorías a Español (0 Margen de Error) ===");
  console.log("Conectado a:", dbUrl);

  // 1. Obtener todos los productos
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true },
  });

  console.log(`Revisando ${products.length} productos...`);
  let productsUpdated = 0;

  for (const prod of products) {
    const spanishCat = translateCategoryToSpanish(prod.category);
    if (prod.category !== spanishCat) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { category: spanishCat },
      });
      console.log(`  [Producto actualizado] "${prod.name}": "${prod.category}" -> "${spanishCat}"`);
      productsUpdated++;
    }
  }

  // 2. Obtener todas las categorías registradas en la tabla Category
  const existingCategories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  console.log(`Revisando ${existingCategories.length} categorías registradas...`);
  let categoriesUpdated = 0;

  for (const cat of existingCategories) {
    const spanishCat = translateCategoryToSpanish(cat.name);
    if (cat.name !== spanishCat) {
      // Verificar si ya existe la categoría en español
      const targetExists = await prisma.category.findUnique({
        where: { name: spanishCat },
      });

      if (targetExists) {
        // Eliminar la categoría vieja en inglés ya que la española ya existe
        await prisma.category.delete({ where: { id: cat.id } });
        console.log(`  [Categoría unificada] "${cat.name}" eliminada, ahora usa "${spanishCat}"`);
      } else {
        // Renombrar la categoría en inglés a español
        await prisma.category.update({
          where: { id: cat.id },
          data: { name: spanishCat },
        });
        console.log(`  [Categoría renombrada] "${cat.name}" -> "${spanishCat}"`);
      }
      categoriesUpdated++;
    }
  }

  // 3. Asegurar que todas las categorías que usan los productos existan en la tabla Category
  const distinctProductCats = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
  });

  for (const { category } of distinctProductCats) {
    if (category) {
      const spanishCat = translateCategoryToSpanish(category);
      await prisma.category.upsert({
        where: { name: spanishCat },
        update: {},
        create: { name: spanishCat },
      });
    }
  }

  console.log("\n✓ Resumen de migración:");
  console.log(`  - Productos actualizados: ${productsUpdated}`);
  console.log(`  - Categorías actualizadas/unificadas: ${categoriesUpdated}`);
  console.log("¡Todas las categorías ahora están 100% en español!\n");
}

main()
  .catch((err) => {
    console.error("Error en migración:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
