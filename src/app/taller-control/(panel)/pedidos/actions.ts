"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { decryptPII, blindIndex } from "@/lib/crypto";
import { digitsOnly } from "@/lib/sanitize";
import { retryInvoiceEmission } from "@/lib/invoicing";
import { requireSession } from "@/lib/requireSession";
import { logAudit } from "@/lib/audit";

export interface AdminOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  date: Date;
  items: { id: string; name: string; category: string; quantity: number; unitPrice: number | null }[];
  invoice: { id: string; estado: string; pdfUrl: string | null } | null;
}

/** Encrypted at rest (Fase 4) — a raw value that fails to decrypt (corrupt,
 *  or written before encryption existed) shows a flag instead of crashing
 *  the whole order list. */
function safeDecryptPhone(stored: string): string {
  try {
    return decryptPII(stored);
  } catch {
    return "⚠ no se pudo descifrar";
  }
}

export async function getAdminOrders(phoneQuery?: string): Promise<AdminOrder[]> {
  const session = await requireSession();

  const where = phoneQuery
    ? { customerPhoneIndex: blindIndex(digitsOnly(phoneQuery)) }
    : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      items: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (orders.length > 0) {
    await logAudit({
      action: "DATA_ACCESS",
      adminId: session.sub,
      username: session.username,
      details: phoneQuery 
        ? `Búsqueda de pedidos por teléfono: ${phoneQuery}`
        : "Consulta general de lista de pedidos (teléfonos descifrados)",
    });
  }

  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: safeDecryptPhone(o.customerPhone),
    total: o.total,
    date: o.date,
    items: o.items,
    invoice: o.invoices[0] ? { id: o.invoices[0].id, estado: o.invoices[0].estado, pdfUrl: o.invoices[0].pdfUrl } : null,
  }));
}

export async function retryOrderInvoice(invoiceId: string): Promise<void> {
  const safeInvoiceId = z.string().trim().min(1, "Identificador de factura inválido").parse(invoiceId);
  await retryInvoiceEmission(safeInvoiceId);
  revalidatePath("/taller-control/pedidos");
}
