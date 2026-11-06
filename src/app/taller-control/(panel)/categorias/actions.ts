"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface CategoryFormState {
  error?: string;
}

const nameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(60).transform((v) => v.toUpperCase());

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nombre inválido." };

  try {
    await prisma.category.create({ data: { name: parsed.data } });
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "Ya existe esa categoría." };
    throw err;
  }

  revalidatePath("/taller-control/categorias");
  revalidatePath("/tienda");
  return {};
}

export async function renameCategory(id: string, newName: string): Promise<{ error?: string }> {
  const parsed = nameSchema.safeParse(newName);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nombre inválido." };

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return { error: "Esa categoría ya no existe." };
  if (existing.name === parsed.data) return {};

  try {
    // Product.category is a free-text field (not a foreign key), so a
    // rename has to cascade by hand or products silently orphan onto the
    // old name — that's the bug this fixes vs. the old admin panel.
    await prisma.$transaction([
      prisma.category.update({ where: { id }, data: { name: parsed.data } }),
      prisma.product.updateMany({ where: { category: existing.name }, data: { category: parsed.data } }),
    ]);
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "Ya existe una categoría con ese nombre." };
    throw err;
  }

  revalidatePath("/taller-control/categorias");
  revalidatePath("/taller-control/productos");
  revalidatePath("/tienda");
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return {};

  const productsUsingIt = await prisma.product.count({ where: { category: category.name } });
  if (productsUsingIt > 0) {
    return { error: `No se puede eliminar: ${productsUsingIt} producto(s) usan "${category.name}".` };
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/taller-control/categorias");
  revalidatePath("/tienda");
  return {};
}
