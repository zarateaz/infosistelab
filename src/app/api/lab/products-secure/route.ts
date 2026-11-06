import { prisma } from "@/lib/prisma";
import { labGuard, labJson } from "@/lib/lab";

/**
 * ============================================================================
 *  EJERCICIO 2 — VERSIÓN CORREGIDA (para el "después")
 * ============================================================================
 *
 * Misma funcionalidad que /api/lab/products, pero:
 *   - Consulta parametrizada (Prisma `findMany`, sin SQL concatenado).
 *   - `select` explícito SIN `costPrice`.
 *   - Sin mensajes de error internos hacia el cliente.
 *   - Valida que `id` sea un entero positivo.
 *
 * Esta ruta también responde 404 si LAB_MODE != 1, para que el contraste
 * "antes vs. después" se pueda hacer en la misma máquina con la misma URL
 * base. En `main` (endurecido) las rutas de laboratorio ni siquiera existen.
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = labGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const idRaw = url.searchParams.get("id") ?? "1";
  const id = Number(idRaw);

  if (q === null && (!Number.isInteger(id) || id < 1)) {
    return labJson({ error: "Parámetro id inválido." }, 400);
  }

  try {
    const products = await prisma.product.findMany({
      where:
        q !== null
          ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] }
          : { itemNumber: id },
      // ✅ Allowlist de campos: costPrice nunca sale del servidor.
      select: {
        id: true,
        itemNumber: true,
        name: true,
        category: true,
        description: true,
        price: true,
        stock: true,
      },
      take: 10,
    });

    return labJson({
      lab: true,
      vulnerable: false,
      note: "Consulta parametrizada + select explícito (sin costPrice).",
      count: products.length,
      data: products,
    });
  } catch {
    // ✅ Sin detalles internos en la respuesta.
    return labJson({ error: "No se pudo procesar la solicitud." }, 500);
  }
}
