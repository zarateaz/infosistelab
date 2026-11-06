"use server";

import { prisma } from "@/lib/prisma";

export interface MonthlyProductRow {
  productId: string | null;
  pName: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageUnitPrice: number;
  salesCount: number;
  percentageOfTotal: number;
}

export interface MonthlySaleItem {
  id: string;
  pName: string;
  category: string | null;
  quantity: number;
  price: number;
  costPrice: number;
  profit: number;
  date: Date;
  invoice: { id: string; estado: string; pdfUrl: string | null } | null;
}

export interface MonthlyReportPayload {
  year: number;
  month: number;
  monthName: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  salesCount: number;
  topProduct: MonthlyProductRow | null;
  products: MonthlyProductRow[];
  salesList: MonthlySaleItem[];
}

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export async function getMonthlySalesReport(
  targetYear?: number,
  targetMonth?: number // 1-12
): Promise<MonthlyReportPayload> {
  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch all active sales within the month
  const sales = await prisma.sale.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      deletedAt: null,
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      productId: true,
      pName: true,
      category: true,
      quantity: true,
      price: true,
      costPrice: true,
      profit: true,
      date: true,
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, estado: true, pdfUrl: true },
      },
    },
  });

  let totalUnits = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  // Group by product name / id
  const productMap = new Map<
    string,
    {
      productId: string | null;
      pName: string;
      category: string;
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      salesCount: number;
    }
  >();

  for (const s of sales) {
    totalUnits += s.quantity;
    totalRevenue += s.price;
    totalCost += s.costPrice;
    totalProfit += s.profit;

    const key = (s.productId ?? s.pName).toLowerCase().trim();
    const existing = productMap.get(key);

    if (existing) {
      existing.totalQuantity += s.quantity;
      existing.totalRevenue += s.price;
      existing.totalCost += s.costPrice;
      existing.totalProfit += s.profit;
      existing.salesCount += 1;
    } else {
      productMap.set(key, {
        productId: s.productId,
        pName: s.pName,
        category: s.category || "General",
        totalQuantity: s.quantity,
        totalRevenue: s.price,
        totalCost: s.costPrice,
        totalProfit: s.profit,
        salesCount: 1,
      });
    }
  }

  // Calculate percentages and averages
  const products: MonthlyProductRow[] = Array.from(productMap.values()).map(
    (p) => ({
      ...p,
      averageUnitPrice: p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0,
      percentageOfTotal: totalRevenue > 0 ? (p.totalRevenue / totalRevenue) * 100 : 0,
    })
  );

  // Sort products by total quantity sold descending
  products.sort((a, b) => b.totalQuantity - a.totalQuantity);

  const topProduct = products.length > 0 ? products[0] : null;

  const salesList: MonthlySaleItem[] = sales.map(({ invoices, ...s }) => ({
    ...s,
    invoice: invoices[0] ?? null,
  }));

  return {
    year,
    month,
    monthName: MONTH_NAMES_ES[month - 1] ?? "Mes",
    totalUnits,
    totalRevenue,
    totalCost,
    totalProfit,
    salesCount: sales.length,
    topProduct,
    products,
    salesList,
  };
}
