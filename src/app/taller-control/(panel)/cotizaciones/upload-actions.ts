"use server";

import { chmod, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import sharp from "sharp";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";

const UPLOAD_DIR =
  process.env.QUOTATION_PHOTOS_DIR || path.join(process.cwd(), "public", "img", "cotizaciones");
const PUBLIC_PREFIX = "/img/cotizaciones/";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export interface UploadImageResult {
  path?: string;
  error?: string;
}

export async function uploadQuotationPhoto(dataUrl: string): Promise<UploadImageResult> {
  let ip = "127.0.0.1";
  try {
    ip = getClientIP(await headers());
  } catch {}

  const rateCheck = checkRateLimit(rateLimitKey("upload-quotation-photo", ip), 40, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return { error: "Demasiadas fotos subidas seguidas. Espera un momento e intenta de nuevo." };
  }

  const match = /^data:image\/(?:png|jpeg|webp|gif);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Formato de imagen no válido (usa PNG, JPEG, WEBP o GIF)." };
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
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
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

export async function deleteQuotationPhotoFileIfManaged(publicPath: string): Promise<void> {
  if (!publicPath || !publicPath.startsWith(PUBLIC_PREFIX)) return;
  const filename = path.basename(publicPath);
  if (!filename || filename.includes("..")) return;

  try {
    await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, filename));
  } catch {
    // Best-effort: ignore if file doesn't exist
  }
}
