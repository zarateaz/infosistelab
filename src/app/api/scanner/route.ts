import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { searchProductImages } from "@/lib/imageSearch";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/scanner
//
// Body: { barcode?: string; manualQuery?: string }
//
// Cascade lookup:
//   Motor 1 → upcitemdb.com (free trial, no key)
//   Motor 2 → barcodespider.com (needs BARCODE_SPIDER_KEY)
//   Motor 3 → DuckDuckGo Images (for photos when product is found but has no
//             image, or when a manualQuery is provided for manual entry)
// ──────────────────────────────────────────────────────────────────────────────

interface ProductResult {
  found: boolean;
  title?: string;
  brand?: string;
  model?: string;
  description?: string;
  category?: string;
  image?: string;
  images?: string[];
  source?: string;
}

/** Motor 1 — upcitemdb.com trial endpoint (no key required, rate-limited). */
async function lookupUPCItemDB(barcode: string): Promise<ProductResult | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item?.title) return null;

    const imageUrl: string | undefined = Array.isArray(item.images)
      ? item.images.find(
          (img: unknown) =>
            typeof img === "string" && img.startsWith("https://")
        )
      : undefined;

    return {
      found: true,
      title: item.title || "",
      brand: item.brand || "",
      model: item.model || "",
      description: item.description || item.title || "",
      category: item.category || "",
      image: imageUrl,
      source: "upcitemdb",
    };
  } catch {
    return null;
  }
}

/** Motor 2 — barcodespider.com (requires BARCODE_SPIDER_KEY). */
async function lookupBarcodeSpider(
  barcode: string
): Promise<ProductResult | null> {
  const key = process.env.BARCODE_SPIDER_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.barcodespider.com/v2/products/${encodeURIComponent(barcode)}?key=${key}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const info = data?.item_attributes;
    if (!info?.title) return null;

    return {
      found: true,
      title: info.title || "",
      brand: info.brand || "",
      model: info.model || info.mpn || "",
      description: info.description || info.title || "",
      category: info.category || "",
      image: info.image || undefined,
      source: "barcodespider",
    };
  } catch {
    return null;
  }
}

// Motor 3 — DuckDuckGo Images, via the shared src/lib/imageSearch.ts (used
// when the product was found but has no image, or when the client sends a
// `manualQuery` for a product not in any barcode database).
const searchDuckDuckGoImages = searchProductImages;

export async function POST(request: NextRequest) {
  // Admin-only tool (used by the scanner panel inside /taller-control/productos).
  // `proxy.ts`'s matcher deliberately excludes `/api/*`, so this route must
  // verify the session itself — without this it was reachable by anyone on
  // the internet, unauthenticated, to burn paid-API quota (upcitemdb,
  // barcodespider, image search).
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value ?? "");
  if (!session) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  // Brecha V3.3.1/V3.3.3: Invalidación del lado del servidor
  const admin = await prisma.admin.findUnique({
    where: { id: session.sub },
    select: { tokenVersion: true },
  });
  if (!admin || admin.tokenVersion !== session.v) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const ip = getClientIP(await headers());
  const rateCheck = checkRateLimit(rateLimitKey("scanner", ip), 20, 60 * 1000);
  if (!rateCheck.allowed) {
    return Response.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const barcode: string = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const manualQuery: string =
      typeof body.manualQuery === "string" ? body.manualQuery.trim() : "";

    // ── Manual query path (no barcode, just a text search for photos) ────
    if (!barcode && manualQuery) {
      const images = await searchDuckDuckGoImages({
        query: manualQuery,
        productName: manualQuery,
        max: 8,
      });
      return Response.json({
        found: false,
        images,
        source: "duckduckgo",
      });
    }

    if (!barcode) {
      return Response.json(
        { error: "Se requiere un código de barras o una consulta manual." },
        { status: 400 }
      );
    }

    // ── Cascade: Motor 1 → Motor 2 ──────────────────────────────────────
    let result = await lookupUPCItemDB(barcode);
    if (!result) {
      result = await lookupBarcodeSpider(barcode);
    }

    // Nothing found in either database
    if (!result) {
      return Response.json({
        found: false,
        barcode,
        images: [],
        source: "none",
      });
    }

    // ── Motor 3: fetch images if the product has no photo ────────────────
    let images: string[] = [];
    if (!result.image) {
      const searchQuery = [result.brand, result.model, result.title]
        .filter(Boolean)
        .join(" ");
      if (searchQuery) {
        images = await searchDuckDuckGoImages({
          query: searchQuery,
          productName: result.title || searchQuery,
          category: result.category,
          max: 8,
        });
      }
    }

    return Response.json({
      ...result,
      images: result.image ? [result.image, ...images] : images,
    });
  } catch {
    return Response.json(
      { error: "Error interno en el escáner." },
      { status: 500 }
    );
  }
}
