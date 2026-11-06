"use server";

import { prisma } from "@/lib/prisma";
import { STARTER_SHOWCASE_PRODUCTS, getStarterCategories } from "./starterCatalog";

export interface CatalogoProduct {
  id: string;
  itemNumber: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  images: string | null;
  barcode: string | null;
  isFeatured: boolean;
  onSale: boolean;
  salePrice: number | null;
}

export interface CatalogoCategory {
  id: string;
  name: string;
  count: number;
}

export async function getCatalogoData(): Promise<{
  products: CatalogoProduct[];
  categories: CatalogoCategory[];
}> {
  const [products, rawCategories] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        itemNumber: true,
        name: true,
        category: true,
        description: true,
        price: true,
        stock: true,
        image: true,
        images: true,
        barcode: true,
        isFeatured: true,
        onSale: true,
        salePrice: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Si aún no hay productos registrados en la base de datos,
  // proveer la estructura completa de vitrina interactiva (Mouses, Teclados, Laptops, etc.)
  if (products.length === 0) {
    return {
      products: STARTER_SHOWCASE_PRODUCTS,
      categories: getStarterCategories(),
    };
  }

  // Contar productos por categoría (normalizando a mayúsculas para evitar desajustes)
  const categoryCounts: Record<string, number> = {};
  for (const p of products) {
    const key = (p.category || "").trim().toUpperCase();
    if (key) {
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    }
  }

  // Filtrar ÚNICAMENTE las categorías que tienen al menos 1 producto (count > 0)
  // para evitar la lista interminable de categorías vacías con (0)
  const categories: CatalogoCategory[] = rawCategories
    .map((c) => {
      const norm = (c.name || "").trim().toUpperCase();
      return {
        id: c.id,
        name: c.name,
        count: categoryCounts[norm] || 0,
      };
    })
    .filter((c) => c.count > 0);

  // Asegurar que cualquier categoría existente en productos que no esté en la tabla Category también se incluya
  const knownNames = new Set(categories.map((c) => (c.name || "").trim().toUpperCase()));
  for (const p of products) {
    const norm = (p.category || "").trim();
    if (norm && !knownNames.has(norm.toUpperCase())) {
      knownNames.add(norm.toUpperCase());
      categories.push({
        id: `cat-${norm.toLowerCase().replace(/\s+/g, "-")}`,
        name: norm,
        count: categoryCounts[norm.toUpperCase()] || 1,
      });
    }
  }

  // Ordenar alfabéticamente
  categories.sort((a, b) => a.name.localeCompare(b.name));

  return {
    products,
    categories,
  };
}
