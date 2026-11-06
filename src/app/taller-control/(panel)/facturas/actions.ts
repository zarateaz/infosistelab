"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { decryptPII } from "@/lib/crypto";
import { emitInvoice, retryInvoiceEmission } from "@/lib/invoicing";
import { requireSession } from "@/lib/requireSession";
import { logAudit } from "@/lib/audit";
import { monthKey, monthRange } from "./month";

export interface AdminInvoice {
  id: string;
  tipo: string;
  serie: string;
  numero: number;
  clienteDenominacion: string;
  total: number;
  estado: string;
  pdfUrl: string | null;
  mensajeError: string | null;
  /** Digits-only, ready for a wa.me link — decrypted from Invoice.clienteTelefono
   *  (ventas de mostrador) or from the linked Order.customerPhone (pedidos web). */
  telefono: string | null;
  origen: "Pedido web" | "Venta de mostrador";
  createdAt: Date;
}

function safeDecrypt(stored: string | null): string | null {
  if (!stored) return null;
  try {
    return decryptPII(stored);
  } catch {
    return null;
  }
}

/** Comprobantes emitidos dentro de [inicio, fin) del mes — "emitido" se
 *  cuenta por Invoice.createdAt (cuándo se intentó/emitió), sin importar
 *  si terminó ACEPTADO o en ERROR: un intento fallido igual consumió un
 *  correlativo y merece aparecer en el registro del mes. */
export async function getAdminInvoicesForMonth(month: string): Promise<AdminInvoice[]> {
  const session = await requireSession();
  const { start, end } = monthRange(month);
  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { customerPhone: true } } },
  });

  if (invoices.length > 0) {
    await logAudit({
      action: "DATA_ACCESS",
      adminId: session.sub,
      username: session.username,
      details: `Consulta general de facturas del mes ${month} (teléfonos descifrados)`,
    });
  }

  return invoices.map((inv) => {
    const telefono = safeDecrypt(inv.clienteTelefono) ?? safeDecrypt(inv.order?.customerPhone ?? null);
    return {
      id: inv.id,
      tipo: inv.tipo,
      serie: inv.serie,
      numero: inv.numero,
      clienteDenominacion: inv.clienteDenominacion,
      total: inv.total,
      estado: inv.estado,
      pdfUrl: inv.pdfUrl,
      mensajeError: inv.mensajeError,
      telefono,
      origen: inv.orderId ? "Pedido web" : "Venta de mostrador",
      createdAt: inv.createdAt,
    };
  });
}

/** Todo mes con al menos un comprobante, más el mes actual aunque esté
 *  vacío — mismo criterio que caja/actions.ts:listCashboxMonths. */
export async function listInvoiceMonths(): Promise<string[]> {
  const rows = await prisma.invoice.findMany({ select: { createdAt: true } });
  const months = new Set<string>([...rows.map((r) => monthKey(r.createdAt)), monthKey()]);
  return [...months].sort().reverse();
}

export async function retryInvoice(invoiceId: string): Promise<void> {
  await retryInvoiceEmission(invoiceId);
  revalidatePath("/taller-control/facturas");
  revalidatePath("/taller-control/pedidos");
  revalidatePath("/taller-control/ventas");
}

const manualInvoiceSchema = z.object({
  descripcion: z.string().trim().min(1, "Describe qué vendiste.").max(150),
  cantidad: z.coerce.number().int().min(1).max(9999),
  precioUnitario: z.coerce.number().positive("El precio debe ser mayor a 0."),
  docNumber: z.string().trim().max(20).optional(),
  nombre: z.string().trim().max(100).optional(),
  email: z.string().trim().max(150).optional(),
  telefono: z.string().trim().max(20).optional(),
});

/** Para una venta de mostrador que no pasa por el catálogo de Inventario —
 *  ej. un servicio, o algo que no está dado de alta como Product. Crea una
 *  Sale "manual" (productId null, mismo caso ya contemplado en el schema
 *  para el botón "Vender") para que también cuente en los reportes de
 *  Ventas/Caja, y sobre esa Sale emite el comprobante con el mismo motor
 *  que usa Inventario. */
export async function createManualInvoice(input: unknown): Promise<{ error?: string }> {
  const parsed = manualInvoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { descripcion, cantidad, precioUnitario, docNumber, nombre, email, telefono } = parsed.data;

  const price = Math.round(precioUnitario * cantidad * 100) / 100;

  const sale = await prisma.sale.create({
    data: {
      productId: null,
      pName: descripcion,
      category: null,
      quantity: cantidad,
      price,
      costPrice: 0,
      profit: price,
    },
  });

  await emitInvoice({
    saleId: sale.id,
    docNumber,
    nombre,
    email,
    telefono,
    total: price,
    items: [{ descripcion, cantidad, precioUnitarioConIgv: precioUnitario }],
  });

  revalidatePath("/taller-control/facturas");
  revalidatePath("/taller-control/ventas");
  return {};
}
