"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteProductImageIfManaged } from "./upload-actions";
import { translateCategoryToSpanish } from "@/lib/categoryUtils";
import {
  evaluateDuplicateMatch,
  type DuplicateDetectionResult,
  type ProductSummary,
} from "@/lib/duplicateDetection";

export interface AdminProduct {
  id: string;
  itemNumber: number;
  name: string;
  category: string;
  description: string;
  price: number;
  costPrice: number | null;
  stock: number;
  image: string | null;
  /** Up to 3 additional reference photos — admin-only, never shown on
   *  /tienda or the storefront card, only when editing the product. */
  images: string | null;
  barcode: string | null;
  isFeatured: boolean;
  onSale: boolean;
  salePrice: number | null;
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  return prisma.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return prisma.product.findUnique({ where: { id } });
}

export interface ProductFormState {
  error?: string;
  successMessage?: string;
  updatedProductId?: string;
  newStock?: number;
}

const MAX_EXTRA_IMAGES = 3;

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  category: z.string().trim().min(1, "La categoría es obligatoria").max(60),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(1000),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  costPrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0),
  image: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
  images: z.array(z.string().trim().max(300)).max(MAX_EXTRA_IMAGES).optional(),
  barcode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v ? v : null)),
});

async function upsertCategory(name: string, productName?: string): Promise<string> {
  const normalized = translateCategoryToSpanish(name, productName);
  await prisma.category.upsert({
    where: { name: normalized },
    update: {},
    create: { name: normalized },
  });
  return normalized;
}

function parseProductForm(formData: FormData) {
  const imagesRaw = formData.get("images");
  let images: string[] | undefined;
  if (typeof imagesRaw === "string" && imagesRaw) {
    try {
      const decoded = JSON.parse(imagesRaw);
      if (Array.isArray(decoded)) images = decoded.filter((v) => typeof v === "string");
    } catch {}
  }

  const rawName = typeof formData.get("productName") === "string" ? (formData.get("productName") as string) : "";
  const rawCategory = typeof formData.get("category") === "string" ? (formData.get("category") as string) : "";
  const translatedCategory = rawCategory ? translateCategoryToSpanish(rawCategory, rawName) : "";

  const parsed = productSchema.safeParse({
    name: rawName,
    category: translatedCategory,
    description: formData.get("description"),
    price: formData.get("price"),
    costPrice: formData.get("costPrice") || 0,
    stock: formData.get("stock"),
    image: formData.get("image"),
    images,
    barcode: formData.get("barcode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." } as const;
  }

  const isFeatured = formData.get("isFeatured") === "on";
  const onSale = formData.get("onSale") === "on";
  const salePriceRaw = formData.get("salePrice");
  const salePrice = onSale && salePriceRaw ? Number(salePriceRaw) : null;
  if (onSale && (!salePrice || salePrice <= 0 || salePrice >= parsed.data.price)) {
    return { error: "El precio de oferta debe ser mayor a 0 y menor al precio normal." } as const;
  }

  const existingProductId =
    typeof formData.get("existingProductId") === "string"
      ? (formData.get("existingProductId") as string).trim()
      : "";

  return {
    data: { ...parsed.data, isFeatured, onSale, salePrice },
    existingProductId: existingProductId || undefined,
  } as const;
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

function serializeExtraImages(images?: string[]): string | null {
  return images && images.length > 0 ? JSON.stringify(images) : null;
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const result = parseProductForm(formData);
  if ("error" in result) return { error: result.error };

  // If the admin scanned/uploaded a product that already exists in the store and chose to
  // add stock & save ("Guardar"), update the existing product in place instead of creating a duplicate!
  let targetExistingId = result.existingProductId;
  if (!targetExistingId) {
    const dupCheck = await checkDuplicateProduct(
      result.data.name,
      result.data.barcode,
      undefined,
      result.data.description
    );
    if (dupCheck.isDuplicate && dupCheck.existingProduct) {
      targetExistingId = dupCheck.existingProduct.id;
    }
  }

  if (targetExistingId) {
    const existing = await prisma.product.findUnique({
      where: { id: targetExistingId },
      select: { id: true, name: true, stock: true, image: true, images: true },
    });
    if (existing) {
      const category = await upsertCategory(result.data.category, result.data.name);
      const { images, ...rest } = result.data;
      const newStock = Math.max(0, rest.stock);
      const delta = newStock - existing.stock;

      await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: rest.price,
          costPrice: rest.costPrice,
          stock: newStock,
          category,
          description: rest.description || undefined,
          barcode: rest.barcode || undefined,
          image: rest.image || existing.image,
          images: images && images.length > 0 ? serializeExtraImages(images) : existing.images,
          isFeatured: rest.isFeatured,
          onSale: rest.onSale,
          salePrice: rest.salePrice,
        },
      });

      if (delta !== 0) {
        await prisma.stockMovement
          .create({
            data: {
              productId: existing.id,
              quantity: delta,
              type: delta > 0 ? "INGRESO" : "AJUSTE",
              description:
                delta > 0
                  ? `Ingreso de +${delta} u. a producto existente desde Productos`
                  : `Ajuste de ${delta} u. en producto existente`,
            },
          })
          .catch(() => {});
      }

      revalidatePath("/taller-control/productos");
      revalidatePath("/taller-control/inventario");
      revalidatePath("/taller-control/seguimiento-stock");
      revalidatePath("/tienda");
      redirect("/taller-control/productos");
    }
  }

  const error = await insertProduct(result.data);
  if (error) return { error };

  revalidatePath("/taller-control/productos");
  revalidatePath("/taller-control/inventario");
  revalidatePath("/taller-control/seguimiento-stock");
  revalidatePath("/tienda");
  redirect("/taller-control/productos");
}

/** Check if a product with the same barcode or same name already exists in inventory (0 error margin) */
export async function checkDuplicateProduct(
  name: string,
  barcode?: string | null,
  excludeId?: string,
  description?: string | null
): Promise<DuplicateDetectionResult> {
  const cleanBarcode = barcode?.trim();
  const cleanName = name?.trim();

  if (!cleanBarcode && !cleanName) {
    return { isDuplicate: false };
  }

  // 1. Direct barcode lookup if present
  if (cleanBarcode) {
    const existingByBarcode = await prisma.product.findFirst({
      where: {
        barcode: cleanBarcode,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        category: true,
        price: true,
        costPrice: true,
        stock: true,
        image: true,
        images: true,
        description: true,
      },
    });
    if (existingByBarcode) {
      return {
        isDuplicate: true,
        reason: "barcode",
        message: `El producto ya se encuentra en la tienda con este código de barras ("${existingByBarcode.name}").`,
        existingProduct: existingByBarcode,
      };
    }
  }

  // 2. Comprehensive multi-criteria scan over existing products
  const candidates: ProductSummary[] = await prisma.product.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: {
      id: true,
      name: true,
      barcode: true,
      category: true,
      price: true,
      costPrice: true,
      stock: true,
      image: true,
      images: true,
      description: true,
    },
  });

  for (const cand of candidates) {
    const match = evaluateDuplicateMatch(
      { name: cleanName, barcode: cleanBarcode, description: description ?? undefined },
      cand
    );
    if (match.isDuplicate) {
      return match;
    }
  }

  return { isDuplicate: false };
}

/** Quick stock increment/decrement action for existing products */
export async function adjustProductStock(
  productId: string,
  delta: number
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  try {
    const prod = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, name: true },
    });
    if (!prod) return { success: false, error: "Producto no encontrado." };

    const newStock = Math.max(0, prod.stock + delta);
    const actualDelta = newStock - prod.stock;
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
      select: { id: true, stock: true },
    });

    if (actualDelta !== 0) {
      await prisma.stockMovement
        .create({
          data: {
            productId: prod.id,
            quantity: actualDelta,
            type: actualDelta > 0 ? "INGRESO" : "AJUSTE",
            description:
              actualDelta > 0
                ? `Ingreso rápido de +${actualDelta} u. por detección de producto existente`
                : `Ajuste rápido de ${actualDelta} u.`,
          },
        })
        .catch(() => {});
    }

    revalidatePath("/taller-control/productos");
    revalidatePath("/tienda");
    revalidatePath("/taller-control/inventario");
    revalidatePath("/taller-control/seguimiento-stock");
    return { success: true, newStock: updated.stock };
  } catch (err) {
    console.error("[actions] adjustProductStock error:", err);
    return { success: false, error: "Error al actualizar el stock." };
  }
}

/** Quick stock and price update for existing product without reloading page */
export async function updateExistingProductStockAndPrice(
  productId: string,
  data: {
    stock?: number;
    price?: number;
    costPrice?: number;
  }
): Promise<{ success: boolean; newStock?: number; newPrice?: number; error?: string }> {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });
    if (!existing) return { success: false, error: "Producto no encontrado." };

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.stock !== undefined ? { stock: Math.max(0, data.stock) } : {}),
        ...(data.price !== undefined && data.price > 0 ? { price: data.price } : {}),
        ...(data.costPrice !== undefined && data.costPrice >= 0 ? { costPrice: data.costPrice } : {}),
      },
      select: { id: true, stock: true, price: true },
    });

    const delta = updated.stock - existing.stock;
    if (delta !== 0) {
      await prisma.stockMovement
        .create({
          data: {
            productId,
            quantity: delta,
            type: delta > 0 ? "INGRESO" : "AJUSTE",
            description:
              delta > 0
                ? `Ingreso de +${delta} u. en producto existente`
                : `Ajuste de ${delta} u. en producto existente`,
          },
        })
        .catch(() => {});
    }

    revalidatePath("/taller-control/productos");
    revalidatePath("/tienda");
    revalidatePath("/taller-control/inventario");
    revalidatePath("/taller-control/seguimiento-stock");
    return { success: true, newStock: updated.stock, newPrice: updated.price };
  } catch (err) {
    console.error("[actions] updateExistingProductStockAndPrice error:", err);
    return { success: false, error: "Error al actualizar el producto." };
  }
}

async function insertProduct(data: z.infer<typeof productSchema>): Promise<string | null> {
  const dupCheck = await checkDuplicateProduct(data.name, data.barcode, undefined, data.description);
  if (dupCheck.isDuplicate && dupCheck.message) {
    return dupCheck.message;
  }

  const category = await upsertCategory(data.category, data.name);
  const { images, ...rest } = data;
  try {
    const maxItem = await prisma.product.findFirst({
      orderBy: { itemNumber: "desc" },
      select: { itemNumber: true },
    });
    const itemNumber = (maxItem?.itemNumber ?? 0) + 1;
    const created = await prisma.product.create({
      data: { ...rest, category, images: serializeExtraImages(images), itemNumber },
    });
    if (created.stock > 0) {
      await prisma.stockMovement
        .create({
          data: {
            productId: created.id,
            quantity: created.stock,
            type: "INGRESO",
            description: `Stock inicial al registrar producto #${itemNumber}`,
          },
        })
        .catch(() => {});
    }
    return null;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return "El producto ya se encuentra en el inventario con ese código de barras.";
    }
    throw err;
  }
}

export async function createProductQuick(input: {
  name: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  image: string | null;
  images?: string[];
  barcode: string | null;
}): Promise<{ error?: string }> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const error = await insertProduct(parsed.data);
  if (error) return { error };

  revalidatePath("/taller-control/productos");
  revalidatePath("/tienda");
  return {};
}

export async function updateProduct(
  id: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const result = parseProductForm(formData);
  if ("error" in result) return { error: result.error };

  const dupCheck = await checkDuplicateProduct(
    result.data.name,
    result.data.barcode,
    id,
    result.data.description
  );
  if (dupCheck.isDuplicate && dupCheck.message) {
    return { error: dupCheck.message };
  }

  const category = await upsertCategory(result.data.category, result.data.name);
  const { images, ...rest } = result.data;
  const newImagesJson = serializeExtraImages(images);
  const previous = await prisma.product.findUnique({
    where: { id },
    select: { image: true, images: true },
  });
  try {
    await prisma.product.update({
      where: { id },
      data: { ...rest, category, images: newImagesJson },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { error: "El producto ya se encuentra en el inventario con ese código de barras." };
    }
    throw err;
  }

  const keptImages = new Set([rest.image, ...(images ?? [])].filter((v): v is string => !!v));
  const removedPaths = [previous?.image, ...parseExtraImages(previous?.images ?? null)].filter(
    (v): v is string => !!v && !keptImages.has(v)
  );
  await Promise.all(removedPaths.map((path) => deleteProductImageIfManaged(path)));

  revalidatePath("/taller-control/productos");
  revalidatePath("/tienda");
  redirect("/taller-control/productos");
}

function parseExtraImages(images: string | null): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { image: true, images: true },
  });
  await prisma.product.delete({ where: { id } });
  const paths = [product?.image, ...parseExtraImages(product?.images ?? null)].filter(
    (v): v is string => !!v
  );
  await Promise.all(paths.map((path) => deleteProductImageIfManaged(path)));
  revalidatePath("/taller-control/productos");
  revalidatePath("/tienda");
}
