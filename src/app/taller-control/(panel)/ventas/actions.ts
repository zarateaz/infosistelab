"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { retryInvoiceEmission } from "@/lib/invoicing";

const idSchema = z.string().trim().min(1, "Identificador inválido.");

export interface SaleStatBucket {
  total: number;
  profit: number;
  count: number;
}

export interface SaleStats {
  day: SaleStatBucket;
  week: SaleStatBucket;
  month: SaleStatBucket;
}

function bucket(agg: { _sum: { price: number | null; profit: number | null }; _count: number }): SaleStatBucket {
  return { total: agg._sum.price ?? 0, profit: agg._sum.profit ?? 0, count: agg._count };
}

export async function getSaleStats(): Promise<SaleStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [day, week, month] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: startOfDay }, deletedAt: null },
      _sum: { price: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { date: { gte: startOfWeek }, deletedAt: null },
      _sum: { price: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { date: { gte: startOfMonth }, deletedAt: null },
      _sum: { price: true, profit: true },
      _count: true,
    }),
  ]);

  return { day: bucket(day), week: bucket(week), month: bucket(month) };
}

export interface AdminSale {
  id: string;
  pName: string;
  category: string | null;
  quantity: number;
  price: number;
  profit: number;
  date: Date;
  origin: string;
  paymentMethod: string | null;
  invoice: { id: string; estado: string; pdfUrl: string | null } | null;
}

export async function getRecentSales(limit = 30): Promise<AdminSale[]> {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      pName: true,
      category: true,
      quantity: true,
      price: true,
      profit: true,
      date: true,
      origin: true,
      paymentMethod: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, estado: true, pdfUrl: true } },
    },
  });

  return sales.map(({ invoices, ...s }) => ({ ...s, invoice: invoices[0] ?? null }));
}

export interface DeletedSale {
  id: string;
  pName: string;
  category: string | null;
  quantity: number;
  price: number;
  profit: number;
  date: Date;
  origin: string;
  paymentMethod: string | null;
  deletedAt: Date;
}

export async function getDeletedSales(): Promise<DeletedSale[]> {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, pName: true, category: true, quantity: true, price: true, profit: true, date: true, origin: true, paymentMethod: true, deletedAt: true },
  });
  // The `where` above guarantees deletedAt is non-null; Prisma's generated
  // type still widens it to Date | null for the column itself.
  return sales.map((s) => ({ ...s, deletedAt: s.deletedAt as Date }));
}

// Soft delete: "Eliminar" in Ventas moves a sale to the Papelera instead of
// destroying it — a wrong click used to lose the price/date for good with
// no way back (reported directly). `date` is never touched, so a restored
// sale reappears under its real, original sale date, not today's.
//
// Si la venta se registró desde el flujo "Vender" de Productos, también se
// manda a la Papelera el ingreso de Caja que se creó con ella: de lo
// contrario el dinero seguiría sumando en los saldos de Caja aunque la
// venta ya no exista. Restaurar la venta restaura ambos. Stock no se toca
// aquí (misma semántica histórica de eliminar una venta).
export async function deleteSale(id: string): Promise<void> {
  const safeId = idSchema.parse(id);
  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: safeId },
      select: { cashboxTransactionId: true },
    });
    await tx.sale.update({ where: { id: safeId }, data: { deletedAt } });
    if (sale?.cashboxTransactionId) {
      await tx.cashboxTransaction.updateMany({
        where: { id: sale.cashboxTransactionId },
        data: { deletedAt },
      });
    }
  });
  revalidatePath("/taller-control/ventas");
  revalidatePath("/taller-control/caja");
  revalidatePath("/taller-control/papelera");
}

export async function restoreSale(id: string): Promise<void> {
  const safeId = idSchema.parse(id);
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: safeId },
      select: { cashboxTransactionId: true },
    });
    await tx.sale.update({ where: { id: safeId }, data: { deletedAt: null } });
    if (sale?.cashboxTransactionId) {
      await tx.cashboxTransaction.updateMany({
        where: { id: sale.cashboxTransactionId },
        data: { deletedAt: null },
      });
    }
  });
  revalidatePath("/taller-control/ventas");
  revalidatePath("/taller-control/caja");
  revalidatePath("/taller-control/papelera");
}

// Actually destroys the row — only reachable from the Papelera itself, on
// something already soft-deleted. Cascades to any linked Invoice's `saleId`
// reference via the schema's `onDelete` (SetNull by default for an
// optional relation), so this never fails because a SUNAT receipt still
// points at the sale. Si la venta tenía su ingreso de Caja vinculado, se
// destruye también para no dejar un movimiento huérfano.
export async function permanentlyDeleteSale(id: string): Promise<void> {
  const safeId = idSchema.parse(id);
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: safeId },
      select: { cashboxTransactionId: true },
    });
    if (sale?.cashboxTransactionId) {
      await tx.cashboxTransaction.deleteMany({
        where: { id: sale.cashboxTransactionId },
      });
    }
    await tx.sale.delete({ where: { id: safeId } });
  });
  revalidatePath("/taller-control/papelera");
  revalidatePath("/taller-control/caja");
}

export async function retrySaleInvoice(invoiceId: string): Promise<void> {
  const safeInvoiceId = idSchema.parse(invoiceId);
  await retryInvoiceEmission(safeInvoiceId);
  revalidatePath("/taller-control/ventas");
}
