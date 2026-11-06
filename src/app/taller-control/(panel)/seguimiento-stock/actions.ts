"use server";

import { prisma } from "@/lib/prisma";

export async function getStockMovements() {
  return prisma.stockMovement.findMany({
    orderBy: { date: "desc" },
    include: { product: true },
    take: 100, // Últimos 100 movimientos
  });
}
