"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { searchProductImages } from "@/lib/imageSearch";
import {
  evaluateDuplicateMatch,
  type ProductSummary,
} from "@/lib/duplicateDetection";
import { translateCategoryToSpanish } from "@/lib/categoryUtils";
import { downloadTopProductImages } from "./upload-actions";

export interface BarcodeLookupResult {
  existingProductId?: string;
  existingProductName?: string;
  existingProduct?: ProductSummary;
  suggestion?: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    costPrice?: number;
    stock?: number;
    image?: string;
    images?: string[];
    imageUrl?: string;
    imageOptions?: string[];
  };
  source?: "local" | "external";
  notFound?: boolean;
}

/** Translates & matches barcode search keywords to standardized Spanish categories. */
function guessCategory(text: string, categories: string[]): string | undefined {
  const normalized = text.toLowerCase();
  const rules: [RegExp, string[]][] = [
    [/laptop|notebook|portatil|portátil/, ["LAPTOPS"]],
    [/mouse|mice|raton|ratón/, ["TECLADOS Y MOUSE", "MOUSE"]],
    [/keyboard|teclado/, ["TECLADOS Y MOUSE", "TECLADO"]],
    [/monitor|display|pantalla/, ["MONITORES Y PANTALLAS", "MONITORES"]],
    [/printer|impresora|multifuncional/, ["IMPRESORAS"]],
    [/\bink\b|toner|cartridge|tinta|tóner|cartucho/, ["TINTAS Y TÓNERS", "TINTAS", "TINTA Y TONER", "CARTUCHOS"]],
    [/memory|ram|dimm|sodimm/, ["COMPONENTES DE PC", "RAM", "MEMORIAS RAM"]],
    [/ssd|solid state|nvme|hard drive|disco duro|enclosure|case.*2\.5|caja.*disco/, ["ALMACENAMIENTO", "SSD"]],
    [/\bpc\b|desktop|computer tower|computadora/, ["COMPUTADORAS Y PC", "PC"]],
    [/cable|adapter|adaptador|hdmi|vga|usb-c|hub|convertidor/, ["CABLES Y ADAPTADORES"]],
    [/router|switch|wifi|redes|ethernet|access point|repetidor/, ["REDES Y CONECTIVIDAD"]],
    [/charger|cargador|bateria|battery|power|ups|estabilizador|fuente/, ["CARGADORES Y ENERGÍA"]],
    [/audio|headphone|auricular|audifono|parlante|speaker|microfono/, ["AUDIO Y SONIDO"]],
    [/soporte|stand|holder|funda|mochila|maletin|pad/, ["ACCESORIOS"]],
  ];
  for (const [pattern, candidates] of rules) {
    if (pattern.test(normalized)) {
      const match = categories.find((c) => candidates.includes(c.toUpperCase()));
      if (match) return translateCategoryToSpanish(match);
      return candidates[0];
    }
  }
  return undefined;
}

/** Translates raw external category breadcrumbs to standardized Spanish. */
function extractCategoryGuess(rawCategory: string | undefined, productName?: string): string | undefined {
  if (!rawCategory && !productName) return undefined;
  if (!rawCategory) return translateCategoryToSpanish("ACCESORIOS", productName);
  const segments = rawCategory.split(">").map((s) => s.trim()).filter(Boolean);
  const last = segments[segments.length - 1];
  return translateCategoryToSpanish(last || rawCategory, productName);
}

async function translateListingToSpanish(
  title: string,
  rawDescription: string,
  guessedCategory: string | undefined,
  categories: string[]
): Promise<{
  name: string;
  description: string;
  category?: string;
  suggestedPrice?: number;
  suggestedCostPrice?: number;
}> {
  try {
    const { object } = await generateObject({
      model: deepseek("deepseek-v4-flash"),
      schema: z.object({
        name: z
          .string()
          .describe(
            "Nombre comercial técnico en español y en MAYÚSCULAS (Tipo de producto + Marca + Modelo + Especificaciones clave como longitud, capacidad, versión o color)."
          ),
        description: z
          .string()
          .describe(
            "Descripción comercial y técnica completa en español (2 frases claras y directas para catálogo de tienda tecnológica), basada en el título y descripción original."
          ),
        category: z
          .string()
          .optional()
          .describe(
            guessedCategory
              ? "No se usa — omite este campo."
              : "Categoría del producto en español y en mayúsculas."
          ),
        suggestedPrice: z
          .number()
          .positive()
          .describe("Precio de venta minorista estimado en Soles peruanos (S/.) en el mercado de Perú."),
        suggestedCostPrice: z
          .number()
          .nonnegative()
          .describe("Precio de costo mayorista estimado en Soles peruanos (S/.), aprox. 70-75% del precio de venta."),
      }),
      messages: [
        {
          role: "user",
          content: `Título original del producto: ${title}
Descripción original: ${rawDescription.slice(0, 800)}
${
  guessedCategory
    ? ""
    : `Categorías existentes en el catálogo: ${categories.length > 0 ? categories.join(", ") : "(ninguna)"}.`
}
Traduce y estandariza el nombre y la descripción al español para la tienda tecnológica INFOSISTEL en Perú, e incluye un precio de venta y costo estimado en Soles (PEN).`,
        },
      ],
    });
    return {
      name: object.name || title,
      description: object.description,
      category: object.category,
      suggestedPrice: object.suggestedPrice,
      suggestedCostPrice: object.suggestedCostPrice,
    };
  } catch (err) {
    console.error("[scan-actions] translateListingToSpanish failed:", err);
    return { name: title, description: rawDescription };
  }
}

async function lookupExternalUPC(
  barcode: string,
  categories: string[]
): Promise<BarcodeLookupResult> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return { notFound: true, source: "external" };

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return { notFound: true, source: "external" };

    const title: string = item.title || [item.brand, item.model].filter(Boolean).join(" ") || "";
    if (!title) return { notFound: true, source: "external" };

    const guessedCategory = guessCategory(`${title} ${item.category ?? ""}`, categories);
    const translated = await translateListingToSpanish(
      title,
      item.description || title,
      guessedCategory,
      categories
    );
    const finalName = translated.name.slice(0, 150).toUpperCase();
    const rawCategory = guessedCategory ?? translated.category ?? extractCategoryGuess(item.category, finalName);
    const category = translateCategoryToSpanish(rawCategory, finalName);

    const listingImages: string[] = Array.isArray(item.images)
      ? item.images.filter((img: unknown): img is string => typeof img === "string" && img.startsWith("https://"))
      : [];

    const searchedImages = await searchProductImages({
      queries: [title, `${title} product`, finalName],
      productName: finalName,
      category,
      max: 8,
    });

    const combinedCandidates = Array.from(new Set([...listingImages, ...searchedImages]));
    const downloaded = await downloadTopProductImages(combinedCandidates, 4);

    return {
      source: "external",
      suggestion: {
        name: finalName,
        description: translated.description.slice(0, 500).toUpperCase(),
        category,
        price: translated.suggestedPrice ? Math.round(translated.suggestedPrice) : undefined,
        costPrice: translated.suggestedCostPrice ? Math.round(translated.suggestedCostPrice) : undefined,
        stock: 1,
        image: downloaded.cover,
        images: downloaded.gallery,
        imageUrl: listingImages[0],
        imageOptions: combinedCandidates.length > 0 ? combinedCandidates : undefined,
      },
    };
  } catch {
    return { notFound: true, source: "external" };
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const clean = barcode.trim();
  if (!clean) return { notFound: true };

  // 1. Local DB lookup (handles exact and leading-zero normalized barcode)
  const normBarcode = clean.replace(/^0+/, "");
  const existing = await prisma.product.findFirst({
    where: {
      OR: [
        { barcode: clean },
        ...(normBarcode && normBarcode !== clean ? [{ barcode: normBarcode }] : []),
      ],
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
  if (existing) {
    return {
      existingProductId: existing.id,
      existingProductName: existing.name,
      existingProduct: existing,
      source: "local",
    };
  }

  // 2. Query external UPC database
  const categories = (await prisma.category.findMany({ select: { name: true } })).map((c) => c.name);
  const externalResult = await lookupExternalUPC(clean, categories);

  // If external suggestion found, check if that item name already exists locally (0 margin of error)
  if (externalResult.suggestion?.name) {
    const existingByName = await findExistingProductByName(
      externalResult.suggestion.name,
      externalResult.suggestion.description,
      clean
    );
    if (existingByName) {
      return {
        existingProductId: existingByName.id,
        existingProductName: existingByName.name,
        existingProduct: existingByName,
        source: "local",
      };
    }
  }

  return externalResult;
}

export interface RecognizeImageResult {
  name?: string;
  description?: string;
  category?: string;
  barcode?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  /** Pre-downloaded cover photo (/img/products/<uuid>.webp) */
  image?: string;
  /** Pre-downloaded 3 extra gallery photos (/img/products/<uuid>.webp) */
  images?: string[];
  /** All 4 local paths [cover, ...gallery] */
  appliedLocalImages?: string[];
  imageOptions?: string[];
  existingProductId?: string;
  existingProductName?: string;
  existingProduct?: ProductSummary;
  error?: string;
}

/** Comprehensive zero-margin-of-error duplicate match across catalog products */
async function findExistingProductByName(
  name: string,
  description?: string,
  barcode?: string,
  preloadedCandidates?: ProductSummary[]
): Promise<ProductSummary | null> {
  const cleanName = name.trim();
  const cleanBarcode = barcode?.trim();
  if (!cleanName && !cleanBarcode) return null;

  const candidates: ProductSummary[] =
    preloadedCandidates ??
    (await prisma.product.findMany({
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
    }));

  for (const cand of candidates) {
    const match = evaluateDuplicateMatch(
      { name: cleanName, description, barcode: cleanBarcode },
      cand
    );
    if (match.isDuplicate && match.existingProduct) {
      return match.existingProduct;
    }
  }

  return null;
}

export async function recognizeProductImage(
  dataUrl: string
): Promise<RecognizeImageResult> {
  if (!process.env.DEEPSEEK_API_KEY) {
    return { error: "El reconocimiento por IA no está configurado (falta DEEPSEEK_API_KEY)." };
  }

  let ip = "127.0.0.1";
  try {
    ip = getClientIP(await headers());
  } catch {}
  const rateCheck = checkRateLimit(rateLimitKey("recognize-product", ip), 30, 5 * 60 * 1000);
  if (!rateCheck.allowed) {
    return { error: "Demasiadas fotos procesadas seguidas. Intenta de nuevo en unos minutos." };
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Formato de imagen no válido." };
  }
  const [, mimeType, base64] = match;

  try {
    const [categoriesRows, existingProducts] = await Promise.all([
      prisma.category.findMany({ select: { name: true } }),
      prisma.product.findMany({
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
        orderBy: { itemNumber: "asc" },
      }),
    ]);

    const categories = categoriesRows.map((c) => c.name);

    const { object } = await generateObject({
      model: deepseek("deepseek-v4-flash-vision-exp"),
      schema: z.object({
        name: z
          .string()
          .describe(
            "Nombre comercial exacto en español y en MAYÚSCULAS para catálogo (máx. 140 caracteres). Estructura obligatoria: TIPO DE PRODUCTO + MARCA + MODELO EXACTO + ESPECIFICACIONES CLAVE (medida/longitud si es cable, versión HDMI/USB/Cat, resolución/velocidad, capacidad GB/TB o color)."
          ),
        description: z
          .string()
          .describe(
            "Descripción comercial y técnica profesional en español y en MAYÚSCULAS (2 a 3 frases listas para publicar en la tienda). Incluye marca, modelo, características técnicas completas, puertos/conectores, medidas y compatibilidad. PROHIBIDO escribir frases como 'la imagen muestra', 'en la foto se observa' o 'no se aprecian etiquetas'."
          ),
        category: z
          .string()
          .describe(
            "Categoría exacta en ESPAÑOL y en MAYÚSCULAS: 'LAPTOPS', 'COMPUTADORAS Y PC', 'MONITORES Y PANTALLAS', 'IMPRESORAS', 'TINTAS Y TÓNERS', 'ALMACENAMIENTO', 'COMPONENTES DE PC', 'TECLADOS Y MOUSE', 'AUDIO Y SONIDO', 'REDES Y CONECTIVIDAD', 'CABLES Y ADAPTADORES', 'CARGADORES Y ENERGÍA', 'SEGURIDAD Y CÁMARAS', 'ACCESORIOS' o 'PERIFÉRICOS'."
          ),
        barcode: z
          .string()
          .optional()
          .describe(
            "Si en la foto aparece impreso un código de barras (EAN-13, UPC o SKU numérico legible), extrae solo los dígitos exactos. Si no hay código de barras legible, déjalo vacío."
          ),
        suggestedPrice: z
          .number()
          .positive()
          .describe(
            "Precio de venta al público en Soles peruanos (S/.). Si hay una etiqueta de precio visible en la foto úsala; si no, estima con precisión el precio comercial real en tiendas tecnológicas de Perú."
          ),
        suggestedCostPrice: z
          .number()
          .nonnegative()
          .describe(
            "Precio de costo o compra mayorista en Soles peruanos (S/.). Si no está impreso en la foto, estima el costo mayorista real en Perú (aprox. 70% al 75% del precio de venta)."
          ),
        detectedStock: z
          .number()
          .int()
          .positive()
          .default(1)
          .describe("Cantidad de unidades para ingresar a stock (por defecto 1)."),
        searchQueries: z
          .array(z.string())
          .describe(
            "3 consultas de búsqueda ultra específicas (combinando Marca + Código de modelo/SKU exacto + nombre de producto en inglés y español) para encontrar las 4 mejores fotos oficiales de catálogo con fondo limpio."
          ),
        negativeKeywords: z
          .array(z.string())
          .optional()
          .describe(
            "Palabras clave de productos parecidos pero incorrectos que deben filtrarse."
          ),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Eres el sistema experto de catalogación e inventario con IA de INFOSISTEL (Huancayo, Perú).
Analiza esta foto de producto/caja/etiqueta con CERO MARGEN DE ERROR y completa todos los datos:

1. PRECISIÓN DE RECONOCIMIENTO (0 MARGEN DE ERROR):
- 'name': Nombre comercial claro en español y en MAYÚSCULAS (Tipo de producto + Marca + Modelo exacto + Medida/Capacidad/Color/Versión). Ejemplos: "MOUSE LOGITECH G203 LIGHTSYNC RGB NEGRO", "CABLE UGREEN USB-C A USB-C 100W 1M", "ADAPTADOR DE CORRIENTE AMERICAN NET 5V 2.5A".
  REGLA DE MARCA CRÍTICA: Si la marca en el producto o caja es 'American NET', escribe siempre 'AMERICAN NET' completo (NUNCA solo 'American', para no confundir con aerolíneas u otros rubros).
- 'category': Categoría exacta en español ${categories.length > 0 ? `(elige entre: ${categories.join(", ")})` : "('LAPTOPS', 'ACCESORIOS', 'ALMACENAMIENTO', 'CABLES Y ADAPTADORES', 'REDES Y CONECTIVIDAD', 'TECLADOS Y MOUSE', 'AUDIO Y SONIDO', 'IMPRESORAS', 'TINTAS Y TÓNERS', 'MONITORES Y PANTALLAS', 'COMPONENTES DE PC', 'CARGADORES Y ENERGÍA', 'SEGURIDAD Y CÁMARAS', 'COMPUTADORAS Y PC')"}.
- 'description': Redacción comercial y técnica impecable en español para la ficha del producto. NUNCA menciones "la foto muestra" ni "no se ve en la imagen".
- 'suggestedPrice' y 'suggestedCostPrice': Precios reales en Soles (S/.) para el mercado peruano.
- 'barcode': Si se ven los números bajo un código de barras, extráelos exactamente.
- 'searchQueries': 3 búsquedas precisas combinando tipo de producto de hardware y marca completa (ej: "American NET adaptador corriente 5V 2.5A", "American NET 5V 2.5A power adapter", etc.). PROHIBIDO escribir solo 'American' o términos genéricos sin producto tecnológico.
- 'negativeKeywords': Incluye términos que deben filtrarse (ej: 'avion', 'aviones', 'airplane', 'airline', 'airlines', 'boeing', 'flight', 'vuelo', 'aerolinea', 'aeropuerto', 'ropa', 'deporte').`,
            },
            { type: "file", data: base64, mediaType: mimeType },
          ],
        },
      ],
    });

    const cleanName = object.name.trim().toUpperCase();
    const cleanDescription = object.description.trim().toUpperCase();
    const cleanBarcode = object.barcode?.replace(/[^0-9A-Za-z-]/g, "").trim() || undefined;
    const categoryInSpanish = translateCategoryToSpanish(object.category, cleanName);

    // Verificación determinística de duplicados con 0 margen de error:
    // Solo marca duplicado si coincide el código de barras exacto, el nombre exacto/normalizado o el modelo exacto en el título.
    const matchedExisting = await findExistingProductByName(
      cleanName,
      cleanDescription,
      cleanBarcode,
      existingProducts
    );

    if (matchedExisting) {
      return {
        name: matchedExisting.name,
        description: matchedExisting.description ?? cleanDescription,
        category: matchedExisting.category ?? categoryInSpanish,
        barcode: matchedExisting.barcode ?? cleanBarcode,
        price: matchedExisting.price,
        costPrice: matchedExisting.costPrice ?? 0,
        stock: matchedExisting.stock ?? 0,
        existingProductId: matchedExisting.id,
        existingProductName: matchedExisting.name,
        existingProduct: matchedExisting,
      };
    }

    // 3. New product: Search and automatically download 4 valid crisp product images!
    const queries = [
      ...(object.searchQueries ?? []),
      `${cleanName} product`,
      cleanName,
    ].filter(Boolean);

    const candidateUrls = await searchProductImages({
      queries,
      negativeKeywords: object.negativeKeywords,
      productName: cleanName,
      category: categoryInSpanish,
      max: 10,
    }).catch((err) => {
      console.error("[scan-actions] searchProductImages threw unexpectedly:", err);
      return [];
    });

    // Pre-download top 4 valid images through sharp right away (with uploaded photo as fallback)
    const downloaded = await downloadTopProductImages(candidateUrls, 4, dataUrl);

    const suggestedPrice =
      object.suggestedPrice && object.suggestedPrice > 0
        ? Math.round(object.suggestedPrice * 100) / 100
        : undefined;
    const suggestedCostPrice =
      object.suggestedCostPrice !== undefined && object.suggestedCostPrice >= 0
        ? Math.round(object.suggestedCostPrice * 100) / 100
        : undefined;

    return {
      name: cleanName,
      description: cleanDescription,
      category: categoryInSpanish,
      barcode: cleanBarcode,
      price: suggestedPrice,
      costPrice: suggestedCostPrice,
      stock: object.detectedStock ?? 1,
      image: downloaded.cover,
      images: downloaded.gallery,
      appliedLocalImages: downloaded.allPaths,
      imageOptions: candidateUrls.length > 0 ? candidateUrls : undefined,
    };
  } catch (err) {
    console.error("[scan-actions] recognizeProductImage failed:", err);
    return { error: "No se pudo procesar la imagen. Intenta con otra foto más clara." };
  }
}

/** Manual image search action called from ScannerPanel when the user wants
 *  to find different photos by typing their own search term. */
export async function searchImagesManually(query: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean) return [];

  let ip = "127.0.0.1";
  try {
    ip = getClientIP(await headers());
  } catch {}
  const rateCheck = checkRateLimit(rateLimitKey("manual-image-search", ip), 30, 5 * 60 * 1000);
  if (!rateCheck.allowed) return [];

  return searchProductImages({
    queries: [`${clean} product`, clean],
    productName: clean,
    max: 8,
  }).catch(() => []);
}
