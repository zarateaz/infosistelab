"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
import {
  registerCounterSale,
  CounterSaleError,
  type CounterSaleResult,
} from "@/lib/counterSale";

const sellProductSchema = z.object({
  productId: z.string().trim().min(1, "Producto inválido."),
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad debe ser al menos 1.")
    .max(9999, "Cantidad demasiado alta."),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "Selecciona el método de pago.",
  }),
  clientRequestId: z.string().trim().min(8).max(120).optional(),
  clientName: z
    .string()
    .trim()
    .max(120, "El nombre es demasiado largo.")
    .optional()
    .transform((v) => (v ? v : null)),
  note: z
    .string()
    .trim()
    .max(300, "La nota es demasiado larga.")
    .optional()
    .transform((v) => (v ? v : null)),
});

export interface SellProductActionResult {
  error?: string;
  sale?: CounterSaleResult;
}

/**
 * "Vender" desde Productos: registra la venta de mostrador, descuenta stock
 * y crea el ingreso en Caja con el método de pago elegido — todo dentro de
 * una transacción (ver lib/counterSale.ts). El precio y el stock se
 * recalculan en el servidor; nunca se confía en lo que envía el navegador.
 */
export async function sellProduct(
  input: unknown
): Promise<SellProductActionResult> {
  const parsed = sellProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let sale: CounterSaleResult;
  try {
    sale = await registerCounterSale(parsed.data);
  } catch (error) {
    if (error instanceof CounterSaleError) return { error: error.message };
    console.error("[sellProduct] Error al registrar la venta:", error);
    return {
      error:
        "No se pudo registrar la venta. No se descontó stock ni se creó ningún ingreso; inténtalo de nuevo.",
    };
  }

  try {
    revalidatePath("/taller-control/productos");
    revalidatePath("/taller-control/inventario");
    revalidatePath("/taller-control/ventas");
    revalidatePath("/taller-control/caja");
    revalidatePath("/taller-control/reporte-mensual");
    revalidatePath("/taller-control/seguimiento-stock");
    revalidatePath("/taller-control");
    revalidatePath("/tienda");
  } catch {
    /* La venta ya quedó registrada; un fallo de revalidación no la invalida. */
  }

  return { sale };
}
