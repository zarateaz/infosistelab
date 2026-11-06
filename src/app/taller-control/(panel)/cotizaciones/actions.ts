"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { parseDateInputToUtcNoon, formatQuotationDate } from "@/lib/quotationDates";

export interface QuotationItemData {
  id?: string;
  productId?: string | null;
  description: string;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  costPrice?: number | null;
  marginPercent?: number | null;
  image?: string | null;
}

export interface QuotationRecord {
  id: string;
  code: string;
  clientName: string;
  clientDocType: string | null;
  clientDocNum: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  attentionTo: string | null;
  issueDate: Date;
  validDays: number;
  currency: string;
  includeIgv: boolean;
  subtotal: number;
  igv: number;
  discount: number;
  total: number;
  status: string;
  deliveryTime: string | null;
  paymentMethod: string | null;
  warranty: string | null;
  notes: string | null;
  images: string | null;
  items: QuotationItemData[];
  createdAt: Date;
}

export interface CatalogProductResult {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
  stock: number;
  category: string | null;
  description?: string | null;
  image?: string | null;
  images?: string | null;
  itemNumber?: number | null;
  barcode?: string | null;
}

export interface RecognizeQuotationItemResult {
  brand?: string;
  model?: string;
  description?: string;
  quantity?: number;
  detectedPrice?: number;
  detectedCost?: number;
  notes?: string;
  matchedProduct?: {
    id: string;
    name: string;
    price: number;
    costPrice: number | null;
    stock: number;
    category: string | null;
  };
  error?: string;
}

export async function generateNextQuotationCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `COT-${currentYear}-`;

  const lastQuotation = await prisma.quotation.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  if (!lastQuotation) {
    return `${prefix}0001`;
  }

  const parts = lastQuotation.code.split("-");
  const lastNum = parseInt(parts[parts.length - 1], 10);
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function listQuotations(filter?: {
  status?: string;
  query?: string;
}): Promise<QuotationRecord[]> {
  try {
    const where: any = {};

    if (filter?.status === "ELIMINADAS") {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
      if (filter?.status && filter.status !== "TODAS") {
        where.status = filter.status;
      }
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { code: { contains: q } },
        { clientName: { contains: q } },
        { clientDocNum: { contains: q } },
        { clientPhone: { contains: q } },
      ];
    }

    const rows = await prisma.quotation.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        items: {
          orderBy: { id: "asc" },
        },
      },
    });

    return rows as unknown as QuotationRecord[];
  } catch (err) {
    console.error("[cotizaciones/actions] listQuotations failed:", err);
    return [];
  }
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
  const row = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
      },
    },
  });

  return row as unknown as QuotationRecord | null;
}

export async function getQuotationByCode(code: string): Promise<QuotationRecord | null> {
  const row = await prisma.quotation.findUnique({
    where: { code },
    include: {
      items: {
        orderBy: { id: "asc" },
      },
    },
  });

  return row as unknown as QuotationRecord | null;
}

const itemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().nullish(),
  description: z.string().trim().min(1, "La descripción del ítem es requerida."),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  quantity: z.coerce.number().int().min(1, "La cantidad mínima es 1"),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  notes: z.string().nullish(),
  costPrice: z.coerce.number().nullish().optional(),
  marginPercent: z.coerce.number().nullish().optional(),
  image: z.string().nullish(),
});

const quotationInputSchema = z.object({
  clientName: z.string().trim().min(1, "El nombre del cliente es obligatorio."),
  clientDocType: z.string().nullish(),
  clientDocNum: z.string().nullish(),
  clientPhone: z.string().nullish(),
  clientEmail: z.string().nullish(),
  clientAddress: z.string().nullish(),
  attentionTo: z.string().nullish(),
  issueDate: z.string().optional(),
  validDays: z.coerce.number().int().min(1).default(15).optional(),
  currency: z.enum(["PEN", "USD"]).default("PEN").optional(),
  includeIgv: z.boolean().default(true).optional(),
  igvPercent: z.coerce.number().min(0).max(100).default(18).optional(),
  discount: z.coerce.number().min(0).default(0).optional(),
  status: z.enum(["PENDIENTE", "ENVIADA", "APROBADA", "RECHAZADA", "FACTURADA"]).default("PENDIENTE").optional(),
  deliveryTime: z.string().nullish(),
  paymentMethod: z.string().nullish(),
  warranty: z.string().nullish(),
  notes: z.string().nullish(),
  images: z.array(z.string()).optional(),
  items: z.array(itemSchema).min(1, "Debe agregar al menos un ítem a la cotización."),
});

export type CreateQuotationInput = z.infer<typeof quotationInputSchema>;

export async function createQuotation(
  data: CreateQuotationInput
): Promise<{ success?: boolean; error?: string; quotation?: QuotationRecord }> {
  try {
    const parsed = quotationInputSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }

    const val = parsed.data;

    // Calculate items totals
    let rawSubtotal = 0;
    const computedItems = val.items.map((it) => {
      const lineTotal = Number((it.quantity * it.unitPrice).toFixed(2));
      rawSubtotal += lineTotal;
      return {
        productId: it.productId || null,
        description: it.description,
        brand: it.brand || null,
        model: it.model || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: lineTotal,
        notes: it.notes || null,
        costPrice: it.costPrice !== undefined && it.costPrice !== null ? Number(it.costPrice) : 0,
        marginPercent: it.marginPercent !== undefined && it.marginPercent !== null ? Number(it.marginPercent) : 0,
        image: it.image || null,
      };
    });

    const discount = Number((val.discount || 0).toFixed(2));
    const taxableBase = Math.max(0, rawSubtotal - discount);

    let igv = 0;
    let finalTotal = taxableBase;

    const igvPercentVal = val.igvPercent !== undefined && val.igvPercent !== null ? Number(val.igvPercent) : 18;
    const igvRate = igvPercentVal / 100;

    if (val.includeIgv) {
      igv = Number((taxableBase * igvRate).toFixed(2));
      finalTotal = Number((taxableBase + igv).toFixed(2));
    }

    const code = await generateNextQuotationCode();
    const issueDate = parseDateInputToUtcNoon(val.issueDate);

    const created = await prisma.quotation.create({
      data: {
        code,
        clientName: val.clientName,
        clientDocType: val.clientDocType || null,
        clientDocNum: val.clientDocNum || null,
        clientPhone: val.clientPhone || null,
        clientEmail: val.clientEmail || null,
        clientAddress: val.clientAddress || null,
        attentionTo: val.attentionTo || null,
        issueDate,
        validDays: val.validDays,
        currency: val.currency,
        includeIgv: val.includeIgv,
        subtotal: Number(rawSubtotal.toFixed(2)),
        discount,
        igv,
        total: finalTotal,
        status: val.status,
        deliveryTime: val.deliveryTime || "Inmediata",
        paymentMethod: val.paymentMethod || "Contado contra entrega / Transferencia",
        warranty: val.warranty || "12 meses de garantía oficial Infosistel",
        notes: val.notes || null,
        images: val.images && val.images.length > 0 ? JSON.stringify(val.images) : null,
        items: {
          create: computedItems,
        },
      },
      include: {
        items: true,
      },
    });

    revalidatePath("/taller-control/cotizaciones");
    revalidatePath("/cotizar");

    return { success: true, quotation: created as unknown as QuotationRecord };
  } catch (err: any) {
    console.error("Error creating quotation:", err);
    return { error: err.message || "Error al crear la cotización." };
  }
}

export async function updateQuotation(
  id: string,
  data: CreateQuotationInput
): Promise<{ success?: boolean; error?: string; quotation?: QuotationRecord }> {
  try {
    const parsed = quotationInputSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }

    const val = parsed.data;

    let rawSubtotal = 0;
    const computedItems = val.items.map((it) => {
      const lineTotal = Number((it.quantity * it.unitPrice).toFixed(2));
      rawSubtotal += lineTotal;
      return {
        productId: it.productId || null,
        description: it.description,
        brand: it.brand || null,
        model: it.model || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: lineTotal,
        notes: it.notes || null,
        costPrice: it.costPrice !== undefined && it.costPrice !== null ? Number(it.costPrice) : 0,
        marginPercent: it.marginPercent !== undefined && it.marginPercent !== null ? Number(it.marginPercent) : 0,
        image: it.image || null,
      };
    });

    const discount = Number((val.discount || 0).toFixed(2));
    const taxableBase = Math.max(0, rawSubtotal - discount);

    let igv = 0;
    let finalTotal = taxableBase;

    const igvPercentVal = val.igvPercent !== undefined && val.igvPercent !== null ? Number(val.igvPercent) : 18;
    const igvRate = igvPercentVal / 100;

    if (val.includeIgv) {
      igv = Number((taxableBase * igvRate).toFixed(2));
      finalTotal = Number((taxableBase + igv).toFixed(2));
    }

    const issueDate = val.issueDate ? parseDateInputToUtcNoon(val.issueDate) : undefined;

    // Delete previous items and insert new ones
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });

      return tx.quotation.update({
        where: { id },
        data: {
          clientName: val.clientName,
          clientDocType: val.clientDocType || null,
          clientDocNum: val.clientDocNum || null,
          clientPhone: val.clientPhone || null,
          clientEmail: val.clientEmail || null,
          clientAddress: val.clientAddress || null,
          attentionTo: val.attentionTo || null,
          ...(issueDate ? { issueDate } : {}),
          validDays: val.validDays,
          currency: val.currency,
          includeIgv: val.includeIgv,
          subtotal: Number(rawSubtotal.toFixed(2)),
          discount,
          igv,
          total: finalTotal,
          status: val.status,
          deliveryTime: val.deliveryTime || null,
          paymentMethod: val.paymentMethod || null,
          warranty: val.warranty || null,
          notes: val.notes || null,
          images: val.images && val.images.length > 0 ? JSON.stringify(val.images) : null,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: true,
        },
      });
    });

    revalidatePath("/taller-control/cotizaciones");
    return { success: true, quotation: updated as unknown as QuotationRecord };
  } catch (err: any) {
    console.error("Error updating quotation:", err);
    return { error: err.message || "Error al actualizar la cotización." };
  }
}

export async function updateQuotationStatus(
  id: string,
  status: "PENDIENTE" | "ENVIADA" | "APROBADA" | "RECHAZADA" | "FACTURADA"
): Promise<{ success?: boolean; error?: string }> {
  try {
    await prisma.quotation.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/taller-control/cotizaciones");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating status:", err);
    return { error: err.message || "Error al actualizar el estado." };
  }
}

export async function deleteQuotation(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/taller-control/cotizaciones");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting quotation:", err);
    return { error: err.message || "Error al eliminar la cotización." };
  }
}

export async function restoreQuotation(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await prisma.quotation.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath("/taller-control/cotizaciones");
    return { success: true };
  } catch (err: any) {
    console.error("Error restoring quotation:", err);
    return { error: err.message || "Error al restaurar la cotización." };
  }
}

export async function unDeleteAllQuotations(): Promise<{ count: number; error?: string }> {
  try {
    const res = await prisma.quotation.updateMany({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    revalidatePath("/taller-control/cotizaciones");
    return { count: res.count };
  } catch (err: any) {
    console.error("Error un-deleting quotations:", err);
    return { count: 0, error: err.message || "Error al restaurar cotizaciones." };
  }
}

export async function searchCatalogProducts(query: string): Promise<CatalogProductResult[]> {
  const q = query.trim();
  if (!q) {
    // Return latest 30 products
    const products = await prisma.product.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        stock: true,
        category: true,
        description: true,
        image: true,
        images: true,
        itemNumber: true,
        barcode: true,
      },
    });
    return products;
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { category: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: 30,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      costPrice: true,
      stock: true,
      category: true,
      description: true,
      image: true,
      images: true,
      itemNumber: true,
      barcode: true,
    },
  });

  return products;
}

export async function recognizeQuotationItemImage(
  dataUrl: string
): Promise<RecognizeQuotationItemResult> {
  if (!process.env.DEEPSEEK_API_KEY) {
    return { error: "El reconocimiento por IA no está configurado (falta DEEPSEEK_API_KEY)." };
  }

  let ip = "127.0.0.1";
  try {
    ip = getClientIP(await headers());
  } catch {}
  const rateCheck = checkRateLimit(rateLimitKey("recognize-quote-item", ip), 30, 5 * 60 * 1000);
  if (!rateCheck.allowed) {
    return { error: "Demasiadas fotos procesadas seguidas. Intenta de nuevo en unos minutos." };
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Formato de imagen no válido." };
  }
  const [, mimeType, base64] = match;

  try {
    const { object } = await generateObject({
      model: deepseek("deepseek-v4-flash-vision-exp"),
      schema: z.object({
        brand: z
          .string()
          .describe(
            "Marca oficial visible del producto (ej: LENOVO, HP, ASUS, DELL, KINGSTON, EPSON, LOGITECH, CANON, etc.) o cadena vacía si no aplica."
          ),
        model: z
          .string()
          .describe(
            "Modelo exacto del producto (ej: V15 G5, Inspiron 3520, L3250, Fury Beast 16GB, MX Master 3S, etc.) o cadena vacía si no se detecta."
          ),
        description: z
          .string()
          .describe(
            "Descripción técnica y comercial completa para una cotización profesional en Perú (INFOSISTEL). Incluye tipo de producto, marca, modelo y características técnicas principales (procesador, RAM, almacenamiento, pantalla, puertos, etc.). Máximo 160 caracteres."
          ),
        quantity: z
          .number()
          .int()
          .positive()
          .default(1)
          .describe("Cantidad detectada si es una proforma o pedido, o 1 por defecto."),
        detectedPrice: z
          .number()
          .optional()
          .describe("Precio unitario o importe numérico si en la imagen aparece un precio visible."),
        detectedCost: z
          .number()
          .optional()
          .describe("Precio de costo numérico si la imagen es una lista de costos o proforma mayorista."),
        notes: z
          .string()
          .optional()
          .describe("Notas adicionales relevantes (garantía, color, compatibilidad)."),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Esta es una foto de una caja, etiqueta, producto o proforma/cotización técnica para INFOSISTEL.
Lee minuciosamente la marca, modelo y especificaciones visibles:
1. Marca: Marca oficial visible.
2. Modelo: Modelo exacto visible.
3. Descripción: Redacta una descripción clara y concisa para cotización técnica (ej: 'PORTATIL LENOVO V15 G5 / RYZEN 5 7520U / 8GB / SSD 512GB').
4. Precios: Si hay precios impresos o escritos, extráelos como número positivo. Si no hay, no inventes precios.`,
            },
            { type: "file", data: base64, mediaType: mimeType },
          ],
        },
      ],
    });

    // Check if there is an existing inventory product matching this
    let matchedProduct: RecognizeQuotationItemResult["matchedProduct"] = undefined;
    const searchTerms = [object.model, `${object.brand} ${object.model}`, object.brand].filter(Boolean);
    for (const term of searchTerms) {
      if (!term || term.trim().length < 3) continue;
      const found = await prisma.product.findFirst({
        where: {
          name: { contains: term.trim() },
        },
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          stock: true,
          category: true,
        },
      });
      if (found) {
        matchedProduct = found;
        break;
      }
    }

    return {
      brand: object.brand ? object.brand.toUpperCase() : undefined,
      model: object.model ? object.model.toUpperCase() : undefined,
      description: object.description.toUpperCase(),
      quantity: object.quantity || 1,
      detectedPrice: object.detectedPrice,
      detectedCost: object.detectedCost,
      notes: object.notes,
      matchedProduct,
    };
  } catch (err: any) {
    console.error("[cotizaciones/actions] recognizeQuotationItemImage failed:", err);
    return { error: err.message || "Error al procesar la imagen con IA." };
  }
}

export async function buildWhatsAppQuotationLink(
  quotation: QuotationRecord,
  baseUrl: string = "https://www.infosistel.com.pe"
): Promise<string> {
  const phone = quotation.clientPhone ? quotation.clientPhone.replace(/\D/g, "") : "";
  const targetPhone = phone.length >= 9 ? (phone.startsWith("51") ? phone : `51${phone}`) : "";

  const curr = quotation.currency === "USD" ? "$" : "S/.";

  const lines = [
    `👋 Estimado(a) *${quotation.clientName}*, le saludamos de *INFOSISTEL*.`,
    ``,
    `Le hacemos llegar la cotización solicitada:`,
    `📄 *Cotización N°:* ${quotation.code}`,
    `📅 *Fecha:* ${formatQuotationDate(quotation.issueDate)}`,
    `⏳ *Validez:* ${quotation.validDays} días calendario`,
    ``,
    `📦 *Detalle de Productos / Servicios:*`,
  ];

  quotation.items.forEach((it, idx) => {
    lines.push(`${idx + 1}. *${it.description}* (x${it.quantity}) — ${curr} ${it.total.toFixed(2)}`);
  });

  lines.push(``);
  lines.push(`💰 *TOTAL:* ${curr} ${quotation.total.toFixed(2)}`);
  if (quotation.deliveryTime) {
    lines.push(`🚚 *Entrega:* ${quotation.deliveryTime}`);
  }
  if (quotation.warranty) {
    lines.push(`🛡️ *Garantía:* ${quotation.warranty}`);
  }
  lines.push(``);
  lines.push(`🌐 Puede consultar y descargar su documento PDF oficial aquí:`);
  lines.push(`${baseUrl}/cotizacion/${quotation.code}`);
  lines.push(``);
  lines.push(`Estamos atentos a cualquier consulta. ¡Muchas gracias por su preferencia! ✨`);

  const text = encodeURIComponent(lines.join("\n"));
  return targetPhone ? `https://wa.me/${targetPhone}?text=${text}` : `https://wa.me/?text=${text}`;
}
