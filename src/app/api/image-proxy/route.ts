import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { getImageFallbackUrl } from "@/lib/imageSearch";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function GET(request: NextRequest) {
  const ip = getClientIP(await headers());
  const rateCheck = checkRateLimit(rateLimitKey("image-proxy", ip), 120, 5 * 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response("Demasiadas solicitudes.", { status: 429 });
  }

  const target = request.nextUrl.searchParams.get("url");
  if (!target) return new Response("Falta el parámetro url.", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("URL inválida.", { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return new Response("Solo se acepta HTTPS.", { status: 400 });
  }

  const fallback = request.nextUrl.searchParams.get("fallback") || getImageFallbackUrl(target);

  async function tryFetchUrl(urlObj: URL, withOriginReferer: boolean): Promise<Response | null> {
    try {
      const res = await fetch(urlObj, {
        signal: AbortSignal.timeout(5000),
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",
          ...(withOriginReferer ? { referer: `${urlObj.origin}/` } : {}),
        },
      });
      if (res.ok && res.body) return res;
      return null;
    } catch {
      return null;
    }
  }

  try {
    let upstream = await tryFetchUrl(parsed, true);
    if (!upstream) {
      upstream = await tryFetchUrl(parsed, false);
    }
    if (!upstream && fallback && fallback.startsWith("https://")) {
      try {
        upstream = await tryFetchUrl(new URL(fallback), false);
      } catch {}
    }

    if (!upstream || !upstream.ok || !upstream.body) {
      return new Response("No se pudo obtener la imagen.", { status: 502 });
    }

    const rawContentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    const contentType = ALLOWED_TYPES.has(rawContentType) ? rawContentType : "image/jpeg";

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BYTES) {
      return new Response("Imagen demasiado grande.", { status: 413 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES || buffer.byteLength < 200) {
      return new Response("Imagen inválida.", { status: 413 });
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return new Response("No se pudo obtener la imagen.", { status: 502 });
  }
}
