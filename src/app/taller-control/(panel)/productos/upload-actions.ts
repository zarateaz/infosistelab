"use server";

import { chmod, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import sharp from "sharp";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { getImageFallbackUrl } from "@/lib/imageSearch";

const UPLOAD_DIR = process.env.PRODUCT_IMAGES_DIR || path.join(process.cwd(), "public", "img", "products");
const PUBLIC_PREFIX = "/img/products/";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB raw, before re-encoding

export interface UploadImageResult {
  path?: string;
  error?: string;
}

export async function uploadProductImage(dataUrl: string): Promise<UploadImageResult> {
  try {
    const ip = getClientIP(await headers());
    const rateCheck = checkRateLimit(rateLimitKey("upload-image", ip), 40, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return { error: "Demasiadas imágenes subidas seguidas. Espera un momento e intenta de nuevo." };
    }
  } catch {}

  const match = /^data:image\/(?:png|jpeg|webp);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Formato de imagen no válido (usa PNG, JPEG o WEBP)." };
  }
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { error: "La imagen es muy grande (máximo 8MB)." };
  }

  await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true, mode: 0o755 });
  await chmod(/*turbopackIgnore: true*/ UPLOAD_DIR, 0o755).catch(() => {});
  const filename = `${randomUUID()}.webp`;

  try {
    const processed = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
    const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, filename);
    await writeFile(filePath, processed);
    await chmod(filePath, 0o644);
  } catch {
    return { error: "No se pudo procesar la imagen. Intenta con otro archivo." };
  }

  return { path: `${PUBLIC_PREFIX}${filename}` };
}

async function fetchImageBuffer(targetUrl: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  // Attempt 1: with same-origin Referer
  try {
    const res = await fetch(parsed, {
      signal: AbortSignal.timeout(5500),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",
        referer: `${parsed.origin}/`,
      },
    });
    if (res.ok) {
      const ab = await res.arrayBuffer();
      if (ab.byteLength > 300 && ab.byteLength <= MAX_UPLOAD_BYTES) {
        return Buffer.from(ab);
      }
    }
  } catch {}

  // Attempt 2: without Referer
  try {
    const res = await fetch(parsed, {
      signal: AbortSignal.timeout(5500),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "image/*,*/*;q=0.8",
      },
    });
    if (res.ok) {
      const ab = await res.arrayBuffer();
      if (ab.byteLength > 300 && ab.byteLength <= MAX_UPLOAD_BYTES) {
        return Buffer.from(ab);
      }
    }
  } catch {}

  return null;
}

export async function downloadProductImageFromUrl(url: string, fallbackUrl?: string): Promise<UploadImageResult> {
  const effectiveFallback = fallbackUrl || getImageFallbackUrl(url);

  let buffer = await fetchImageBuffer(url);
  if (!buffer && effectiveFallback && effectiveFallback.startsWith("https://")) {
    buffer = await fetchImageBuffer(effectiveFallback);
  }

  if (!buffer) {
    return { error: "No se pudo descargar la imagen del proveedor." };
  }

  await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true, mode: 0o755 });
  await chmod(/*turbopackIgnore: true*/ UPLOAD_DIR, 0o755).catch(() => {});
  const filename = `${randomUUID()}.webp`;

  try {
    const img = sharp(buffer);
    const meta = await img.metadata();
    // Reject tiny icons/1x1 tracking pixels so every saved product image is a real photo
    if ((meta.width && meta.width < 100) || (meta.height && meta.height < 100)) {
      if (effectiveFallback && effectiveFallback !== url) {
        const fbBuf = await fetchImageBuffer(effectiveFallback);
        if (fbBuf) {
          buffer = fbBuf;
        } else {
          return { error: "Imagen demasiado pequeña." };
        }
      } else {
        return { error: "Imagen demasiado pequeña." };
      }
    }

    const processed = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
    const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, filename);
    await writeFile(filePath, processed);
    await chmod(filePath, 0o644);
  } catch {
    return { error: "El archivo descargado no es una imagen válida." };
  }

  return { path: `${PUBLIC_PREFIX}${filename}` };
}

/**
 * Automatically downloads and validates up to `targetCount` (default 4) product images
 * from a candidate pool of URLs. Guarantees that all returned paths are valid local `.webp`
 * files ready for `image` (cover) and `images` (3 extra gallery photos).
 * If internet candidates yield fewer than `targetCount` images and `fallbackDataUrl` is provided,
 * uses the uploaded photo so the product never ends up without photos.
 */
export async function downloadTopProductImages(
  candidateUrls: string[],
  targetCount = 4,
  fallbackDataUrl?: string
): Promise<{
  cover?: string;
  gallery: string[];
  allPaths: string[];
  validSourceUrls: string[];
}> {
  const allPaths: string[] = [];
  const validSourceUrls: string[] = [];

  // Process candidates in batches of 5 in parallel for speed without overwhelming bandwidth
  const batchSize = 5;
  for (let i = 0; i < candidateUrls.length && allPaths.length < targetCount; i += batchSize) {
    const batch = candidateUrls.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        const res = await downloadProductImageFromUrl(url);
        return { url, path: res.path };
      })
    );
    for (const item of results) {
      if (item.path && allPaths.length < targetCount) {
        allPaths.push(item.path);
        validSourceUrls.push(item.url);
      }
    }
  }

  // If fewer than targetCount images were downloaded and we have the uploaded photo, include it
  if (allPaths.length < targetCount && fallbackDataUrl) {
    const uploaded = await uploadProductImage(fallbackDataUrl);
    if (uploaded.path) {
      allPaths.push(uploaded.path);
    }
  }

  const [cover, ...gallery] = allPaths;
  return {
    cover,
    gallery: gallery.slice(0, 3),
    allPaths,
    validSourceUrls,
  };
}

export async function deleteProductImageIfManaged(imagePath: string | null): Promise<void> {
  if (!imagePath?.startsWith(PUBLIC_PREFIX)) return;
  const filename = imagePath.slice(PUBLIC_PREFIX.length);
  if (!/^[0-9a-f-]{36}\.webp$/.test(filename)) return;

  try {
    await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, filename));
  } catch {}
}
