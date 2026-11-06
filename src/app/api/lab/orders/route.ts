import { prisma } from "@/lib/prisma";
import { decryptPII, blindIndex } from "@/lib/crypto";
import { digitsOnly } from "@/lib/sanitize";
import { labGuard, labJson, toJsonSafe } from "@/lib/lab";

/**
 * ============================================================================
 *  EJERCICIO 3 — BROKEN ACCESS CONTROL / IDOR + FUGA DE PII
 * ============================================================================
 *
 * Simula el paso "escalada y exfiltración" del caso NovaTech: una vez que el
 * atacante tiene acceso a la red (o solo a la URL pública), encuentra un
 * endpoint de pedidos sin autenticación que le devuelve datos de clientes.
 *
 * Lo vulnerable, en concreto:
 *   - CERO autenticación: no hay cookie, token ni comprobación de rol.
 *   - `?id=` permite recorrer pedidos de otros clientes (IDOR).
 *   - `?phone=` busca por índice ciego y luego DESCIFRA el teléfono para
 *     mostrarlo en la respuesta (excessive data exposure).
 *   - Sin rate limiting: se puede enumerar toda la tabla.
 *
 * Nota didáctica: aquí la consulta SÍ está parametrizada (Prisma). El fallo
 * no es SQLi, es de CONTROL DE ACCESO. Sirve para separar ambos conceptos en
 * la exposición: "la inyección no siempre es el problema; a veces el problema
 * es que la puerta no tiene cerradura".
 *
 * Uso:
 *   GET /api/lab/orders                 -> últimos 20 pedidos
 *   GET /api/lab/orders?id=<orderId>    -> un pedido concreto
 *   GET /api/lab/orders?phone=987654321 -> pedidos de ese celular
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecrypt(value: string): string {
  // El seed del laboratorio incluye un pedido "legacy" con el teléfono en
  // texto plano para poder mostrar el ANTES de la Fase 4 (cifrado en reposo).
  // Si el valor no tiene el formato iv:authTag:ciphertext, se devuelve tal cual.
  if (!/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value)) return value;

  try {
    return decryptPII(value);
  } catch {
    return "[no descifrable en este entorno]";
  }
}

export async function GET(request: Request) {
  const blocked = labGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const phone = url.searchParams.get("phone");

  const where = phone
    ? { customerPhoneIndex: blindIndex(digitsOnly(phone)) }
    : id
      ? { id }
      : {};

  try {
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const data = toJsonSafe(
      orders.map((order) => ({
        ...order,
        // ⚠️ VULNERABLE A PROPÓSITO: PII descifrada y devuelta a cualquiera.
        customerPhone: safeDecrypt(order.customerPhone),
      }))
    );

    return labJson({
      lab: true,
      vulnerable: "IDOR + PII en texto claro + sin autenticación",
      accessControl: "NINGUNO",
      count: orders.length,
      data,
    });
  } catch (error) {
    return labJson(
      {
        lab: true,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
