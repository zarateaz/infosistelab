"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
import { registerCounterSale, CounterSaleError } from "@/lib/counterSale";
import { emitInvoice } from "@/lib/invoicing";

const buyerSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "Selecciona el método de pago.",
  }),
  clientRequestId: z.string().trim().min(8).max(120).optional(),
  docNumber: z.string().trim().max(20).optional(),
  nombre: z.string().trim().max(100).optional(),
  email: z.string().trim().max(150).optional(),
  telefono: z.string().trim().max(20).optional(),
});

export async function sellOneUnit(input: unknown): Promise<{
  error?: string;
  lowStockAlert?: boolean;
  remainingStock?: number;
  productName?: string;
}> {
  const parsed = buyerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { productId, docNumber, nombre, email, telefono, paymentMethod } =
    parsed.data;
  const quantity = parsed.data.quantity ?? 1;

  let sale;
  try {
    // Misma transacción atómica que usa Productos → "Vender": descuenta
    // stock, crea la Sale y registra el ingreso en Caja con su método de pago.
    sale = await registerCounterSale({
      productId,
      quantity,
      paymentMethod,
      clientRequestId: parsed.data.clientRequestId ?? null,
      clientName: nombre?.trim() ? nombre.trim() : null,
    });
  } catch (error) {
    if (error instanceof CounterSaleError) return { error: error.message };
    console.error("[sellOneUnit] Error al registrar la venta:", error);
    return {
      error:
        "No se pudo registrar la venta. No se descontó stock ni se creó ningún ingreso; inténtalo de nuevo.",
    };
  }

  // Fase 5: la venta ya quedó registrada arriba — un problema al emitir el
  // comprobante nunca revierte la venta ni descuenta el stock de vuelta.
  await emitInvoice({
    saleId: sale.saleId,
    docNumber,
    nombre,
    email,
    telefono,
    total: sale.total,
    items: [
      {
        descripcion: sale.productName,
        cantidad: quantity,
        precioUnitarioConIgv: sale.unitPrice,
      },
    ],
  });

  revalidatePath("/taller-control/inventario");
  revalidatePath("/taller-control/productos");
  revalidatePath("/taller-control/ventas");
  revalidatePath("/taller-control/caja");
  revalidatePath("/taller-control/reporte-mensual");
  revalidatePath("/taller-control/seguimiento-stock");
  revalidatePath("/taller-control");
  revalidatePath("/tienda");

  return {
    lowStockAlert: sale.lowStock,
    remainingStock: sale.remainingStock,
    productName: sale.productName,
  };
}
