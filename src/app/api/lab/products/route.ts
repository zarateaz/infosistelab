import { prisma } from "@/lib/prisma";
import { labGuard, labJson, toJsonSafe } from "@/lib/lab";

/**
 * ============================================================================
 *  EJERCICIO 2 — INYECCIÓN SQL (SQLi) — DELIBERADAMENTE VULNERABLE
 * ============================================================================
 *
 * Réplica del hallazgo documentado en el hardening del proyecto: una ruta
 * pública de productos que (a) concatena el parámetro directamente en SQL y
 * (b) devuelve `costPrice` (precio de costo / margen) a cualquiera.
 *
 * Lo vulnerable, en concreto:
 *   - `prisma.$queryRawUnsafe(...)` con el valor del query string interpolado.
 *   - No hay autenticación ni rate limiting.
 *   - El mensaje de error de SQLite se devuelve al cliente (verbose errors).
 *   - Se incluye costPrice en el SELECT.
 *
 * La versión corregida equivalente está en
 * `src/app/api/lab/products-secure/route.ts` (Prisma + select explícito).
 *
 * Uso:
 *   GET /api/lab/products?id=1
 *   GET /api/lab/products?id=1 OR 1=1
 *   GET /api/lab/products?q=mouse
 *   GET /api/lab/products?q=' OR '1'='1
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = labGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const q = url.searchParams.get("q");

  // ⚠️ VULNERABLE A PROPÓSITO: interpolación directa de input del usuario.
  const sql =
    q !== null
      ? `SELECT id, itemNumber, name, category, description, price, costPrice, stock FROM "Product" WHERE name LIKE '%${q}%' OR description LIKE '%${q}%' LIMIT 10`
      : `SELECT id, itemNumber, name, category, description, price, costPrice, stock FROM "Product" WHERE itemNumber = ${id ?? "1"} LIMIT 10`;

  try {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(sql);

    return labJson({
      lab: true,
      vulnerable: "SQLi + exposición de costPrice",
      sql, // se devuelve la consulta para que la demo sea autoexplicativa
      count: rows.length,
      data: toJsonSafe(rows),
    });
  } catch (error) {
    // ⚠️ VULNERABLE A PROPÓSITO: error verboso hacia el cliente.
    return labJson(
      {
        lab: true,
        vulnerable: "SQLi + verbose error",
        sql,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
