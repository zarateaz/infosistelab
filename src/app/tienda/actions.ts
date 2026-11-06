"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sanitizeName, sanitizePhone, sanitizeInt, digitsOnly } from "@/lib/sanitize";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { encryptPII, blindIndex } from "@/lib/crypto";
import { emitInvoice } from "@/lib/invoicing";
import type { Product, Category } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    // costPrice is admin-only — never select it into a response a browser can read.
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      stock: true,
      image: true,
      isFeatured: true,
      onSale: true,
      salePrice: true,
    },
  });
  return products;
}

export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .default("Cliente Web")
    .transform((val) => sanitizeName(val, 80) || "Cliente Web"),
  customerPhone: z
    .string()
    .trim()
    .transform((val) => {
      const digits = digitsOnly(sanitizePhone(val));
      return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
    })
    .refine((val) => val.length === 9 && val.startsWith("9"), {
      message: "Celular inválido (9 dígitos, ej. 987654321)",
    }),
  customerEmail: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Correo inválido",
    }),
  docNumber: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? digitsOnly(val) : ""))
    .refine((val) => !val || val.length === 8 || val.length === 11, {
      message: "DNI (8 dígitos) o RUC (11 dígitos) inválido",
    }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, "ID de producto inválido"),
        quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "El carrito está vacío")
    .max(50, "Demasiados productos en el pedido"),
});

export async function createOrder(input: unknown) {
  // Order creation is public (no login yet) and cheap to spam — same
  // rate-limit discipline as the chat endpoint. OWASP API4:2023.
  const ip = getClientIP(await headers());
  const rateCheck = checkRateLimit(rateLimitKey("order", ip), 20, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    throw new Error("Demasiadas solicitudes. Intenta de nuevo en unos minutos.");
  }

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos del pedido inválidos.");
  }

  const { customerName, customerPhone, customerEmail, docNumber: docDigits, items } = parsed.data;

  // SECURITY: the total is NEVER taken from the client — every line's price
  // is looked up fresh from the database right here, at order time.
  let serverTotal = 0;
  const orderItems: { productId: string; name: string; category: string; quantity: number; unitPrice: number }[] = [];
  const salesToCreate: {
    productId: string;
    pName: string;
    category: string;
    quantity: number;
    price: number;
    costPrice: number;
    profit: number;
  }[] = [];
  const lowStockAlerts: { id: string; name: string; remainingStock: number }[] = [];

  for (const rawItem of items) {
    const quantity = sanitizeInt(rawItem?.quantity, 1, 99) ?? 1;
    const productId = rawItem.productId;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, category: true, price: true, salePrice: true, onSale: true, stock: true, costPrice: true },
    });
    if (!product) {
      throw new Error("Uno de los productos ya no está disponible");
    }
    if (product.stock < quantity) {
      if (product.stock <= 0) {
        throw new Error(`El producto "${product.name}" está agotado.`);
      }
      throw new Error(`Stock insuficiente para "${product.name}". Solo quedan ${product.stock} unidad(es) disponible(s).`);
    }

    const unitPrice = product.onSale && product.salePrice ? product.salePrice : product.price;
    const itemCostPrice = product.costPrice ?? 0;
    const linePrice = unitPrice * quantity;
    const lineCost = itemCostPrice * quantity;
    const lineProfit = linePrice - lineCost;

    serverTotal += linePrice;
    orderItems.push({ productId: product.id, name: product.name, category: product.category, quantity, unitPrice });
    salesToCreate.push({
      productId: product.id,
      pName: product.name,
      category: product.category,
      quantity,
      price: linePrice,
      costPrice: lineCost,
      profit: lineProfit,
    });

    const remaining = product.stock - quantity;
    if (remaining <= 1) {
      lowStockAlerts.push({ id: product.id, name: product.name, remainingStock: remaining });
    }
  }

  // Atomically decrement stock, create the order, and record sales in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // 1. Decrement stock for every product in the order
    for (const item of orderItems) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // 2. Create the Order with its items
    const newOrder = await tx.order.create({
      data: {
        customerName,
        customerPhone: encryptPII(customerPhone),
        customerPhoneIndex: blindIndex(digitsOnly(customerPhone)),
        total: serverTotal,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // 3. Create Sale records so the monthly accounts and Ventas stay completely accurate
    for (const s of salesToCreate) {
      await tx.sale.create({
        data: {
          productId: s.productId,
          pName: s.pName,
          category: s.category,
          quantity: s.quantity,
          price: s.price,
          costPrice: s.costPrice,
          profit: s.profit,
          origin: "WEB",
          date: new Date(),
        },
      });
    }

    return newOrder;
  });

  // Revalidate pages to instantly reflect decremented stock & sales
  revalidatePath("/tienda");
  revalidatePath("/taller-control");
  revalidatePath("/taller-control/inventario");
  revalidatePath("/taller-control/productos");
  revalidatePath("/taller-control/ventas");
  revalidatePath("/taller-control/pedidos");
  revalidatePath("/taller-control/reporte-mensual");

  // Fase 5: se emite el comprobante justo después de crear el pedido, nunca
  // dentro de la misma transacción — un problema con NubeFacT/SUNAT no debe
  // impedir que el pedido quede registrado.
  const invoice = await emitInvoice({
    orderId: order.id,
    docNumber: docDigits || undefined,
    nombre: customerName,
    email: customerEmail || undefined,
    total: order.total,
    items: orderItems.map((item) => ({
      descripcion: item.name,
      cantidad: item.quantity,
      precioUnitarioConIgv: item.unitPrice,
    })),
  });

  return {
    id: order.id,
    total: order.total,
    invoiceStatus: invoice?.estado ?? null,
    invoicePdfUrl: invoice?.pdfUrl ?? null,
    lowStockAlerts,
  };
}
