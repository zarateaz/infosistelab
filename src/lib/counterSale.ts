import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PaymentMethodType } from "@/lib/paymentMethods";

/**
 * Registro de una venta de mostrador (tienda física) en una sola
 * transacción atómica:
 *
 *   1. Revalida producto y stock contra la base (nunca confía en el precio
 *      ni en el stock que muestra el navegador).
 *   2. Descuenta stock con un guard atómico (`stock >= cantidad`).
 *   3. Crea el ingreso en Caja con el método de pago elegido.
 *   4. Crea la Sale (Ventas) y el StockMovement.
 *
 * Si cualquier paso falla, la transacción se revierte completa: nunca queda
 * una venta sin su ingreso, ni un ingreso sin venta, ni stock descontado a
 * medias.
 *
 * `clientRequestId` hace la operación idempotente: el navegador genera un id
 * al abrir el modal; si se pulsa "Confirmar" dos veces o se reintenta la
 * petición, el segundo intento devuelve la venta ya creada en lugar de
 * duplicarla.
 */

export interface CounterSaleInput {
  productId: string;
  quantity: number;
  paymentMethod: PaymentMethodType;
  clientRequestId?: string | null;
  clientName?: string | null;
  note?: string | null;
}

export interface CounterSaleResult {
  saleId: string;
  productId: string;
  productName: string;
  itemNumber: number;
  quantity: number;
  unitPrice: number;
  total: number;
  profit: number;
  paymentMethod: string;
  remainingStock: number;
  lowStock: boolean;
  /** true cuando se devolvió una venta ya registrada (reintento idempotente). */
  reused: boolean;
}

/** Error de negocio (stock, producto inexistente…), seguro de mostrar al usuario. */
export class CounterSaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounterSaleError";
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Fecha de calendario anclada en UTC, igual que caja/month.ts:parseDateInput.
 *  Evita que una venta de la noche del último día del mes caiga en el mes
 *  siguiente (o anterior) según la zona horaria del servidor. */
function cashboxDate(now: Date): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function describeExistingSale(sale: {
  id: string;
  productId: string | null;
  pName: string;
  quantity: number;
  price: number;
  profit: number;
  paymentMethod: string | null;
}): Promise<CounterSaleResult> {
  const product = sale.productId
    ? await prisma.product.findUnique({
        where: { id: sale.productId },
        select: { itemNumber: true, stock: true },
      })
    : null;

  return {
    saleId: sale.id,
    productId: sale.productId ?? "",
    productName: sale.pName,
    itemNumber: product?.itemNumber ?? 0,
    quantity: sale.quantity,
    unitPrice: round2(sale.price / Math.max(1, sale.quantity)),
    total: sale.price,
    profit: sale.profit,
    paymentMethod: sale.paymentMethod ?? "",
    remainingStock: product?.stock ?? 0,
    lowStock: (product?.stock ?? 0) <= 1,
    reused: true,
  };
}

export async function registerCounterSale(
  input: CounterSaleInput
): Promise<CounterSaleResult> {
  const quantity = Math.trunc(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new CounterSaleError("La cantidad debe ser al menos 1 unidad.");
  }

  // Reintento idempotente: el id ya se usó en una venta anterior.
  if (input.clientRequestId) {
    const existing = await prisma.sale.findUnique({
      where: { clientRequestId: input.clientRequestId },
      select: {
        id: true,
        productId: true,
        pName: true,
        quantity: true,
        price: true,
        profit: true,
        paymentMethod: true,
      },
    });
    if (existing) return describeExistingSale(existing);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) throw new CounterSaleError("El producto ya no existe.");

      if (product.stock < quantity) {
        throw new CounterSaleError(
          product.stock <= 0
            ? "Sin stock disponible para este producto."
            : `Stock insuficiente: solo quedan ${product.stock} unidad(es).`
        );
      }

      const unitPrice = round2(
        product.onSale && product.salePrice ? product.salePrice : product.price
      );
      const total = round2(unitPrice * quantity);
      const totalCost = round2((product.costPrice ?? 0) * quantity);
      const profit = round2(total - totalCost);
      const now = new Date();

      // Guard atómico: otra venta concurrente pudo descontar stock entre el
      // findUnique y este update. `count === 0` significa que ya no alcanza.
      const decremented = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (decremented.count === 0) {
        throw new CounterSaleError(
          "El stock cambió mientras registrabas la venta. Actualiza la página e inténtalo de nuevo."
        );
      }

      const cashbox = await tx.cashboxTransaction.create({
        data: {
          date: cashboxDate(now),
          // La descripción se arma sola con el nombre del producto (y la
          // cantidad si es más de una unidad): el usuario nunca la escribe.
          description:
            quantity > 1 ? `${product.name} (x${quantity})` : product.name,
          type: "INCOME",
          amount: total,
          paymentMethod: input.paymentMethod,
          notes: [
            `Venta #${product.itemNumber} desde Productos`,
            input.clientName ? `Cliente: ${input.clientName}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      });

      const sale = await tx.sale.create({
        data: {
          productId: product.id,
          pName: product.name,
          category: product.category,
          quantity,
          price: total,
          costPrice: totalCost,
          profit,
          origin: "FISICA",
          date: now,
          paymentMethod: input.paymentMethod,
          cashboxTransactionId: cashbox.id,
          clientRequestId: input.clientRequestId ?? null,
          clientName: input.clientName ?? null,
          note: input.note ?? null,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: -quantity,
          type: "VENTA_FISICA",
          description: `Venta en tienda · ${product.name} (x${quantity}) · ${input.paymentMethod}`,
          date: now,
        },
      });

      const remainingStock = product.stock - quantity;
      return {
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        itemNumber: product.itemNumber,
        quantity,
        unitPrice,
        total,
        profit,
        paymentMethod: input.paymentMethod,
        remainingStock,
        lowStock: remainingStock <= 1,
        reused: false,
      };
    });
  } catch (error) {
    // Dos peticiones con el mismo clientRequestId entraron a la vez: la
    // segunda choca con el índice único y su transacción se revierte completa
    // (sin stock descontado ni ingreso duplicado). Devolvemos la venta buena.
    if (input.clientRequestId && isUniqueConstraintError(error)) {
      const existing = await prisma.sale.findUnique({
        where: { clientRequestId: input.clientRequestId },
        select: {
          id: true,
          productId: true,
          pName: true,
          quantity: true,
          price: true,
          profit: true,
          paymentMethod: true,
        },
      });
      if (existing) return describeExistingSale(existing);
    }
    throw error;
  }
}
