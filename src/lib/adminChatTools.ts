import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
import { registerCounterSale, CounterSaleError } from "@/lib/counterSale";

/**
 * Resuelve un producto en el inventario de forma infalible buscando por:
 * 1. Número de producto (itemNumber, ej: 14, "#14", "producto 14")
 * 2. ID directo de base de datos (cuid)
 * 3. Código de barras exacto
 * 4. Nombre exacto (case-insensitive)
 * 5. Nombre aproximado o palabras clave
 */
export async function findAdminProduct(query: string | number) {
  if (typeof query === "number") {
    return prisma.product.findUnique({ where: { itemNumber: query } });
  }

  const clean = String(query).trim();
  if (!clean) return null;

  // 1. Si es número o tiene formato "#14", "# 14", "producto 14", "n° 14", "nro 14", "item 14"
  const matchNum = clean.match(/^(?:#\s*|producto\s*|n[°º.]*\s*|item\s*|nro\.?\s*|número\s*)?(\d+)$/i);
  if (matchNum) {
    const num = parseInt(matchNum[1], 10);
    const byNum = await prisma.product.findUnique({ where: { itemNumber: num } });
    if (byNum) return byNum;
  }

  // 2. ID directo (cuid)
  const byId = await prisma.product.findUnique({ where: { id: clean } }).catch(() => null);
  if (byId) return byId;

  // 3. Código de barras exacto
  const byBarcode = await prisma.product.findFirst({ where: { barcode: clean } });
  if (byBarcode) return byBarcode;

  // 4. Búsqueda por nombre en catálogo
  const all = await prisma.product.findMany({
    select: {
      id: true,
      itemNumber: true,
      name: true,
      category: true,
      price: true,
      costPrice: true,
      stock: true,
      barcode: true,
      onSale: true,
      salePrice: true,
    },
  });

  const cleanLower = clean.toLowerCase();
  // Coincidencia exacta de nombre
  const exact = all.find((p) => p.name.toLowerCase() === cleanLower);
  if (exact) return exact;

  // Coincidencia de subcadena única
  const contains = all.filter((p) => p.name.toLowerCase().includes(cleanLower));
  if (contains.length === 1) return contains[0];

  // Coincidencia por tokens relevantes (ej. "Kingston NV2", "IdeaPad Slim")
  const tokens = cleanLower
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["producto", "item", "el", "la", "de", "del", "un", "una", "por"].includes(t));

  if (tokens.length > 0) {
    const scored = all
      .map((p) => {
        const pLower = p.name.toLowerCase();
        const matches = tokens.filter((t) => pLower.includes(t)).length;
        return { product: p, score: matches };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= Math.ceil(tokens.length * 0.6)) {
      return scored[0].product;
    }
  }

  return contains[0] ?? null;
}

export const buscarProductoAdmin = tool({
  description:
    "Busca productos en el inventario por número de producto (# ítem ej: 14 o #14), nombre, categoría o código de barras. " +
    "Úsala para encontrar el ID del producto, su número (#) y su stock actual.",
  inputSchema: z.object({
    consulta: z
      .string()
      .min(1)
      .describe('Nombre del producto, número de producto (#14 o 14), código de barras o categoría.'),
  }),
  execute: async ({ consulta }) => {
    const clean = consulta.trim();
    const matchNum = clean.match(/^(?:#|producto\s*|n[°º.]*\s*)?(\d+)$/i);
    const num = matchNum ? parseInt(matchNum[1], 10) : NaN;
    const isNum = !isNaN(num);

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: clean } },
          { barcode: { equals: clean } },
          { category: { contains: clean } },
          ...(isNum ? [{ itemNumber: num }] : []),
        ],
      },
      select: {
        id: true,
        itemNumber: true,
        name: true,
        stock: true,
        barcode: true,
        price: true,
        category: true,
      },
      take: 8,
    });
    return { encontrados: products.length, productos: products };
  },
});

export const registrarVentaAdmin = tool({
  description:
    "Descuenta stock de un producto registrando una venta física o web. " +
    "Puedes proporcionar el número de producto (ej: 14 o #14), el nombre del producto, el código de barras o el ID del producto, y la cantidad a descontar. " +
    "Para ventas FISICA indica también metodoPago (EFECTIVO, YAPE 1 o YAPE 2); si el usuario no lo ha dicho, pregúntalo antes de registrar.",
  inputSchema: z.object({
    producto: z
      .string()
      .optional()
      .describe("Número de producto (ej: 14 o #14), nombre del producto, código de barras o ID."),
    productId: z
      .string()
      .optional()
      .describe("ID del producto (opcional si se pasa 'producto')."),
    cantidad: z.number().int().positive().describe("Cantidad de unidades a descontar por la venta."),
    origen: z.enum(["WEB", "FISICA"]).default("FISICA").describe("Origen de la venta (por defecto FISICA)."),
    metodoPago: z
      .enum(PAYMENT_METHODS)
      .optional()
      .describe(
        "Obligatorio para ventas FISICA: EFECTIVO, YAPE 1 o YAPE 2. Si no lo sabes, pregúntale al usuario antes de registrar la venta."
      ),
  }),
  execute: async ({ producto, productId, cantidad, origen = "FISICA", metodoPago }) => {
    const target = producto || productId;
    if (!target) return { error: "Debes especificar qué producto descontar (número, nombre o ID)." };

    const product = await findAdminProduct(target);
    if (!product) {
      return { error: `No se encontró ningún producto con "${target}". Puedes buscarlo primero con buscarProductoAdmin.` };
    }
    if (product.stock < cantidad) {
      return { error: `Stock insuficiente para [#${product.itemNumber}] ${product.name}. Solo quedan ${product.stock} unidades.` };
    }

    // Venta de mostrador: usa el mismo registro atómico que el botón "Vender"
    // de Productos (stock + Sale + ingreso en Caja con método de pago).
    if (origen === "FISICA") {
      if (!metodoPago) {
        return {
          error:
            "Para una venta de tienda física falta el método de pago. Pregúntale al usuario si fue EFECTIVO, YAPE 1 o YAPE 2 y vuelve a registrar la venta.",
        };
      }
      try {
        const sale = await registerCounterSale({
          productId: product.id,
          quantity: cantidad,
          paymentMethod: metodoPago,
          clientRequestId: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        });
        try {
          revalidatePath("/taller-control/productos");
          revalidatePath("/taller-control/inventario");
          revalidatePath("/taller-control/ventas");
          revalidatePath("/taller-control/caja");
          revalidatePath("/taller-control/seguimiento-stock");
          revalidatePath("/tienda");
        } catch {}
        return {
          exito: true,
          itemNumber: sale.itemNumber,
          nombre: sale.productName,
          unidadesVendidas: sale.quantity,
          stockRestante: sale.remainingStock,
          metodoPago,
          mensaje: `Venta de ${sale.quantity} u. registrada para [#${sale.itemNumber}] ${sale.productName} y cobrada con ${metodoPago}. Stock restante: ${sale.remainingStock} unidades.`,
        };
      } catch (error) {
        if (error instanceof CounterSaleError) return { error: error.message };
        return { error: "No se pudo registrar la venta. Inténtalo de nuevo." };
      }
    }

    const unitPrice = product.onSale && product.salePrice ? product.salePrice : product.price;
    const unitCost = product.costPrice ?? 0;
    const totalPrice = unitPrice * cantidad;
    const totalCost = unitCost * cantidad;
    const totalProfit = totalPrice - totalCost;

    const [, updatedProduct] = await prisma.$transaction([
      prisma.sale.create({
        data: {
          productId: product.id,
          pName: product.name,
          category: product.category,
          quantity: cantidad,
          price: totalPrice,
          costPrice: totalCost,
          profit: totalProfit,
          origin: origen,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: cantidad } },
        select: { id: true, itemNumber: true, name: true, stock: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: -cantidad,
          type: `VENTA_${origen}`,
          description: `Venta registrada mediante chatbot admin (-${cantidad} u.)`,
        },
      }),
    ]);

    try {
      revalidatePath("/taller-control/productos");
      revalidatePath("/taller-control/inventario");
      revalidatePath("/taller-control/seguimiento-stock");
      revalidatePath("/tienda");
    } catch {}

    return {
      exito: true,
      itemNumber: updatedProduct.itemNumber,
      nombre: updatedProduct.name,
      unidadesVendidas: cantidad,
      stockRestante: updatedProduct.stock,
      mensaje: `Venta de ${cantidad} u. registrada correctamente para [#${updatedProduct.itemNumber}] ${updatedProduct.name}. Stock restante en tienda: ${updatedProduct.stock} unidades.`,
    };
  },
});

export const ajustarStockAdmin = tool({
  description:
    "Añade o incrementa el stock de un producto cuando llega nueva mercadería o se repone inventario. " +
    "Puedes proporcionar el número de producto (ej: 14 o #14), el nombre del producto, el código de barras o el ID del producto, y la cantidad a añadir.",
  inputSchema: z.object({
    producto: z
      .string()
      .optional()
      .describe("Número de producto (ej: 14 o #14), nombre del producto (ej: 'Kingston NV2'), código de barras o ID."),
    productId: z
      .string()
      .optional()
      .describe("ID del producto (opcional si se pasa 'producto')."),
    cantidad: z.number().int().positive().describe("Cantidad de unidades a añadir al stock."),
  }),
  execute: async ({ producto, productId, cantidad }) => {
    const target = producto || productId;
    if (!target) return { error: "Debes especificar qué producto reabastecer (número, nombre o ID)." };

    const product = await findAdminProduct(target);
    if (!product) {
      return { error: `No se encontró ningún producto con "${target}". Puedes buscarlo primero con buscarProductoAdmin.` };
    }

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stock: { increment: cantidad } },
        select: { id: true, itemNumber: true, name: true, stock: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: cantidad,
          type: "INGRESO",
          description: `Ingreso de stock mediante chatbot admin (+${cantidad} u.)`,
        },
      }),
    ]);

    try {
      revalidatePath("/taller-control/productos");
      revalidatePath("/taller-control/inventario");
      revalidatePath("/taller-control/seguimiento-stock");
      revalidatePath("/tienda");
    } catch {}

    return {
      exito: true,
      itemNumber: updatedProduct.itemNumber,
      nombre: updatedProduct.name,
      unidadesAgregadas: cantidad,
      stockAnterior: product.stock,
      nuevoStock: updatedProduct.stock,
      mensaje: `Stock añadido con éxito: Se sumaron +${cantidad} u. a [#${updatedProduct.itemNumber}] ${updatedProduct.name}. Nuevo stock en tienda: ${updatedProduct.stock} unidades.`,
    };
  },
});

export const quitarStockAdmin = tool({
  description:
    "Descuenta, quita o reduce stock de un producto directamente en el inventario (por ajuste manual, salida de inventario, merma, retiro de almacén o devolución). " +
    "Puedes proporcionar el número de producto (ej: 14 o #14), el nombre del producto (ej: 'Kingston NV2'), el código de barras o el ID del producto, y la cantidad a descontar.",
  inputSchema: z.object({
    producto: z
      .string()
      .optional()
      .describe("Número de producto (ej: 14 o #14), nombre del producto, código de barras o ID."),
    productId: z
      .string()
      .optional()
      .describe("ID del producto (opcional si se pasa 'producto')."),
    cantidad: z.number().int().positive().describe("Cantidad de unidades a descontar del stock."),
    motivo: z
      .string()
      .optional()
      .describe("Motivo opcional del retiro o ajuste (ej: 'Ajuste de inventario', 'Merma', 'Retiro de tienda')."),
  }),
  execute: async ({ producto, productId, cantidad, motivo = "Ajuste de inventario" }) => {
    const target = producto || productId;
    if (!target) return { error: "Debes especificar qué producto descontar (número, nombre o ID)." };

    const product = await findAdminProduct(target);
    if (!product) {
      return { error: `No se encontró ningún producto con "${target}". Puedes buscarlo primero con buscarProductoAdmin.` };
    }
    if (product.stock < cantidad) {
      return { error: `Stock insuficiente para [#${product.itemNumber}] ${product.name}. Solo quedan ${product.stock} unidades en almacén.` };
    }

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: cantidad } },
        select: { id: true, itemNumber: true, name: true, stock: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: -cantidad,
          type: "AJUSTE_SALIDA",
          description: `Descuento de stock mediante chatbot admin (-${cantidad} u.): ${motivo}`,
        },
      }),
    ]);

    try {
      revalidatePath("/taller-control/productos");
      revalidatePath("/taller-control/inventario");
      revalidatePath("/taller-control/seguimiento-stock");
      revalidatePath("/tienda");
    } catch {}

    return {
      exito: true,
      itemNumber: updatedProduct.itemNumber,
      nombre: updatedProduct.name,
      unidadesDescontadas: cantidad,
      stockAnterior: product.stock,
      nuevoStock: updatedProduct.stock,
      mensaje: `Stock descontado con éxito: Se restaron -${cantidad} u. a [#${updatedProduct.itemNumber}] ${updatedProduct.name}. Nuevo stock en tienda: ${updatedProduct.stock} unidades.`,
    };
  },
});

