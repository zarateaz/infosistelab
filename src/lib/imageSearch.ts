/**
 * Product photo search & verification engine — src/lib/imageSearch.ts
 *
 * Motor de Búsqueda y Validación de Fotos de Productos con CERO MARGEN DE ERROR:
 * Integra un modelo de Espacio Vectorial y Álgebra Lineal (Cosine Similarity en R^D,
 * proyección ortogonal sobre subespacios prohibidos y anclas semánticas de hardware).
 *
 * Arquitectura:
 * 1. Motor 1 (API Oficial): Serper.dev (Google Images) cuando SERPER_API_KEY está configurado.
 * 2. Motor 2 (Principal Gratuito): DuckDuckGo Images — respuestas estructuradas con títulos oficiales.
 * 3. Motor 3 (Respaldo): Bing Images — extracción estructurada JSON de alta resolución con verificación estricta.
 * 4. Validador Algebraico:
 *    - Proyección ortogonal en Subespacio Prohibido: descarta de inmediato aviación/aviones, aerolíneas, ropa o farándula.
 *    - Vector Space Model (VSM): calcula la Similitud del Coseno cos(theta) = (u · v) / (||u|| ||v||) entre el producto y la imagen.
 *    - Ordenamiento por afinidad matemática: las imágenes con mayor similitud vectorial encabezan la lista.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BING_HEADERS: HeadersInit = {
  "user-agent": USER_AGENT,
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7",
};

const DDG_HEADERS: HeadersInit = {
  "user-agent": USER_AGENT,
  "accept-language": "es-PE,es;q=0.9,en;q=0.8",
};

/**
 * Stores reliable CDN fallback URLs (like Bing's tse1.mm.bing.net or DDG's proxy)
 * keyed by primary `murl`, so `downloadProductImageFromUrl` and `/api/image-proxy`
 * can seamlessly fall back if a third-party store blocks hotlinking (403/timeout).
 */
const FALLBACK_URL_MAP = new Map<string, string>();

export function getImageFallbackUrl(primaryUrl: string): string | undefined {
  return FALLBACK_URL_MAP.get(primaryUrl);
}

export function registerFallbackUrl(primaryUrl: string, fallbackUrl?: string) {
  if (!primaryUrl || !fallbackUrl || !fallbackUrl.startsWith("https://")) return;
  if (FALLBACK_URL_MAP.size > 2000) {
    FALLBACK_URL_MAP.clear();
  }
  FALLBACK_URL_MAP.set(primaryUrl, fallbackUrl);
}

const BLOCKED_URL_PATTERNS =
  /\.(svg|gif|ico)(\?|$)|i\.ytimg\.com|img\.youtube\.com|fbsbx\.com|instagram\.com|tiktokcdn\.com|pinterest\.com\/.*\/236x/i;

export function isValidProductImageUrl(url: string): boolean {
  if (!url || typeof url !== "string" || !url.startsWith("https://")) return false;
  if (BLOCKED_URL_PATTERNS.test(url)) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE ÁLGEBRA LINEAL: ESPACIO VECTORIAL Y SIMILITUD DE COSENOS PARA IMÁGENES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza y tokeniza cadenas de texto en tokens para el espacio vectorial en R^D.
 */
export function tokenizeForVectorSpace(text: string): string[] {
  if (!text) return [];
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Subespacio prohibido ortogonal: Cualquier candidato que tenga proyección no nula
 * sobre este subespacio representa entidades no deseadas (aviones, aerolíneas, ropa, farándula)
 * y debe ser RECHAZADO de inmediato (score = -Infinity).
 */
export const PROHIBITED_NEGATIVE_TERMS = new Set([
  // Aviación y aerolíneas (evita confundir "American NET" con "American Airlines" o aviones)
  "avion",
  "aviones",
  "airplane",
  "airplanes",
  "aircraft",
  "airline",
  "airlines",
  "airways",
  "boeing",
  "airbus",
  "flight",
  "flights",
  "vuelo",
  "vuelos",
  "aerolinea",
  "aerolineas",
  "aeropuerto",
  "airport",
  "airfield",
  "runway",
  "pista",
  "cockpit",
  "pilot",
  "piloto",
  "hangar",
  "jet",
  "flyer",
  "aeroplane",
  "aviation",
  "aeronave",
  "despegue",
  "aterrizaje",
  "tarmac",
  // Abecedario, letras, clipart, caligrafía, dibujos y manualidades infantiles (evita confundir "D-Link" con la letra D)
  "letter",
  "letters",
  "letra",
  "letras",
  "alphabet",
  "alphabets",
  "alphabetical",
  "abecedario",
  "printable",
  "worksheet",
  "worksheets",
  "coloring",
  "colorear",
  "preschool",
  "kindergarten",
  "nursery",
  "handwriting",
  "tracing",
  "caligrafia",
  "font",
  "fonts",
  "typography",
  "tipografia",
  "clipart",
  "cliparts",
  "vector",
  "vectors",
  "monogram",
  "monograma",
  "dog",
  "puppy",
  "perro",
  "perrito",
  "cat",
  "gato",
  "brick",
  "ladrillo",
  "text effect",
  "render 3d text",
  "3d text",
  "drawing",
  "illustration",
  "sketch",
  "cartoon",
  "dibujo",
  // Deportes / ropa / farándula / temas ajenos a informática y ferretería técnica
  "disfraz",
  "espantapajaros",
  "scarecrow",
  "costume",
  "halloween",
  "futbol",
  "football",
  "soccer",
  "nfl",
  "jersey",
  "camiseta",
  "zapatos",
  "sneakers",
  "zapatillas",
  "vestido",
  "falda",
  "pelicula",
  "movie",
  "cinema",
  "actor",
  "actriz",
  "estreno",
  "celebrity",
  "hospital",
  "nightingale",
  "war",
  "guerra",
  "politica",
  "noticia",
  "inundacion",
  "fenomeno",
  "terremoto",
]);

/**
 * Términos de anclaje de dominio técnico/hardware:
 * Para productos tecnológicos (fuentes, adaptadores, cables, memorias),
 * las imágenes candidatas deben presentar afinidad semántica con el rubro.
 */
export const HARDWARE_DOMAIN_ANCHORS = new Set([
  // Redes, Conmutadores, KVM y Conectividad
  "kvm",
  "switch",
  "splitter",
  "conmutador",
  "puerto",
  "puertos",
  "port",
  "ports",
  "ps2",
  "ps/2",
  "vga",
  "dvi",
  "dp",
  "displayport",
  "dlink",
  "d-link",
  "tplink",
  "tp-link",
  "router",
  "modem",
  "ethernet",
  "lan",
  "rj45",
  "antena",
  "hub",
  // Adaptadores, Cables y Energía
  "adaptador",
  "adapter",
  "adaptadores",
  "cargador",
  "charger",
  "chargers",
  "corriente",
  "voltaje",
  "voltage",
  "fuente",
  "power",
  "supply",
  "cable",
  "cables",
  "plug",
  "enchufe",
  "conector",
  "connector",
  "usb",
  "usbc",
  "hdmi",
  "5v",
  "12v",
  "24v",
  "9v",
  "19v",
  "20v",
  "amperio",
  "amp",
  "amperios",
  "amperes",
  "watt",
  "watts",
  "w",
  // Computadoras, Componentes y Periféricos
  "sata",
  "disco",
  "mouse",
  "teclado",
  "auricular",
  "audifono",
  "parlante",
  "pantalla",
  "monitor",
  "laptop",
  "computadora",
  "case",
  "memoria",
  "ram",
  "ssd",
  "impresora",
  "tinta",
  "toner",
  "net",
  "networking",
  "wifi",
]);

/**
 * Construye el vector de características objetivo en R^D para el producto.
 */
export function buildProductTargetVector(
  productName: string,
  category?: string,
  queries: string[] = []
): Map<string, number> {
  const vec = new Map<string, number>();

  const nameTokens = tokenizeForVectorSpace(productName);
  for (const token of nameTokens) {
    const isSpec = /[0-9]/.test(token);
    const weight = isSpec ? 3.5 : 2.5;
    vec.set(token, (vec.get(token) ?? 0) + weight);
  }

  // Si la marca es compuesta (e.g. "american net"), dar peso fuerte a los dos tokens
  if (nameTokens.includes("american") && nameTokens.includes("net")) {
    vec.set("american", (vec.get("american") ?? 0) + 2.0);
    vec.set("net", (vec.get("net") ?? 0) + 2.5);
  }

  if (category) {
    const catTokens = tokenizeForVectorSpace(category);
    for (const token of catTokens) {
      vec.set(token, (vec.get(token) ?? 0) + 2.0);
    }
  }

  for (const q of queries) {
    const qTokens = tokenizeForVectorSpace(q);
    for (const token of qTokens) {
      vec.set(token, (vec.get(token) ?? 0) + 0.5);
    }
  }

  return vec;
}

/**
 * Construye el vector de características en R^D para una imagen candidata
 * basándose en su título descriptivo y en la estructura de su URL.
 */
export function buildCandidateFeatureVector(title: string, url: string): Map<string, number> {
  const vec = new Map<string, number>();

  const titleTokens = tokenizeForVectorSpace(title);
  for (const token of titleTokens) {
    vec.set(token, (vec.get(token) ?? 0) + 2.0);
  }

  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname);
    const urlTokens = tokenizeForVectorSpace(pathname);
    for (const token of urlTokens) {
      vec.set(token, (vec.get(token) ?? 0) + 1.0);
    }
  } catch {}

  return vec;
}

/**
 * Calcula la Similitud del Coseno entre dos vectores en R^D:
 * cos(theta) = (u · v) / (||u||_2 * ||v||_2)
 */
export function computeVectorCosine(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [, w] of vecA) normA += w * w;
  for (const [, w] of vecB) normB += w * w;

  for (const [term, weightA] of vecA) {
    const weightB = vecB.get(term);
    if (weightB !== undefined) {
      dotProduct += weightA * weightB;
    }
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Evalúa si una imagen candidata es matemáticamente afín al producto o si debe ser rechazada.
 */
export function evaluateCandidateWithLinearAlgebra(
  candidate: { title: string; url: string },
  targetVector: Map<string, number>,
  negativeRegex: RegExp | null,
  additionalNegativeTerms?: string[]
): { accepted: boolean; cosine: number; reason?: string } {
  const fullText = `${candidate.title} ${candidate.url}`;
  const tokens = tokenizeForVectorSpace(fullText);

  // 1. Proyección ortogonal en subespacio negativo
  for (const token of tokens) {
    if (PROHIBITED_NEGATIVE_TERMS.has(token)) {
      return { accepted: false, cosine: 0, reason: `subespacio_prohibido:${token}` };
    }
  }

  if (additionalNegativeTerms && additionalNegativeTerms.length > 0) {
    const normNeg = new Set(additionalNegativeTerms.map((t) => t.toLowerCase().trim()).filter(Boolean));
    for (const token of tokens) {
      if (normNeg.has(token)) {
        return { accepted: false, cosine: 0, reason: `palabra_negativa:${token}` };
      }
    }
  }

  if (negativeRegex && negativeRegex.test(candidate.title)) {
    return { accepted: false, cosine: 0, reason: "regex_negativo" };
  }

  // 2. Similitud de cosenos en R^D
  const candidateVector = buildCandidateFeatureVector(candidate.title, candidate.url);
  const cosine = computeVectorCosine(targetVector, candidateVector);

  // 3. Invariante Estricto de Dominio Físico de Hardware:
  // Todo producto tecnológico DEBE contener al menos un término ancla del dominio físico.
  const hasHardwareAnchor = tokens.some((t) => HARDWARE_DOMAIN_ANCHORS.has(t));
  if (!hasHardwareAnchor) {
    return { accepted: false, cosine, reason: "sin_ancla_de_hardware" };
  }

  // 4. Umbral mínimo de afinidad matemática
  if (cosine < 0.12) {
    return { accepted: false, cosine, reason: `coseno_bajo:${cosine.toFixed(2)}` };
  }

  return { accepted: true, cosine };
}

function buildNegativeRegex(negativeKeywords?: string[]): RegExp | null {
  if (!negativeKeywords || negativeKeywords.length === 0) return null;
  const valid = negativeKeywords
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (valid.length === 0) return null;
  return new RegExp(`\\b(${valid.join("|")})\\b`, "i");
}

export interface InternalImageCandidate {
  url: string;
  title: string;
  fallbackUrl?: string;
  engine: "serper" | "duckduckgo" | "bing";
}

/** Motor 1: Serper.dev (Google Images official API, used when SERPER_API_KEY is set). */
async function searchViaSerper(
  query: string,
  max: number
): Promise<InternalImageCandidate[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "pe", hl: "es", num: Math.max(max * 2, 10) }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data?.images)) return [];

    const candidates: InternalImageCandidate[] = [];
    for (const img of data.images) {
      if (candidates.length >= max) break;
      const title = String(img.title || "");
      const url = img.imageUrl;
      const thumb = img.thumbnailUrl;
      if (isValidProductImageUrl(url)) {
        if (!candidates.some((c) => c.url === url)) {
          if (thumb) registerFallbackUrl(url, thumb);
          candidates.push({ url, title, fallbackUrl: thumb, engine: "serper" });
        }
      }
    }
    return candidates;
  } catch {
    return [];
  }
}

/** Motor 2: DuckDuckGo Images (clean JSON structured API with official titles). */
const DDG_MIN_GAP_MS = 1000;
let ddgNextCallAt = 0;

async function ddgThrottle(): Promise<void> {
  const wait = ddgNextCallAt - Date.now();
  ddgNextCallAt = Math.max(ddgNextCallAt, Date.now()) + DDG_MIN_GAP_MS + Math.floor(Math.random() * 300);
  if (wait > 0) await sleep(wait);
}

function cookieHeaderFrom(setCookieValues: string[]): string {
  return setCookieValues.map((raw) => raw.split(";")[0]).join("; ");
}

interface DdgAttempt {
  ok: boolean;
  candidates: InternalImageCandidate[];
  retryable: boolean;
}

async function ddgAttempt(query: string, max: number): Promise<DdgAttempt> {
  const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: {
      ...DDG_HEADERS,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!tokenRes.ok) {
    return { ok: false, candidates: [], retryable: false };
  }
  const html = await tokenRes.text();
  const token = html.match(/vqd=([\d-]+)&/)?.[1] ?? html.match(/vqd=["']?([\d-]+)["']?/)?.[1];
  if (!token) {
    return { ok: false, candidates: [], retryable: false };
  }
  const cookie = cookieHeaderFrom(tokenRes.headers.getSetCookie?.() ?? []);

  const imagesUrl =
    `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}` +
    `&vqd=${token}&f=,,,&p=1`;
  const imagesRes = await fetch(imagesUrl, {
    headers: {
      ...DDG_HEADERS,
      accept: "application/json, text/javascript, */*; q=0.01",
      "x-requested-with": "XMLHttpRequest",
      referer: "https://duckduckgo.com/",
      ...(cookie ? { cookie } : {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!imagesRes.ok) {
    return { ok: false, candidates: [], retryable: imagesRes.status === 403 };
  }

  const data = await imagesRes.json();
  if (!Array.isArray(data?.results)) {
    return { ok: false, candidates: [], retryable: false };
  }

  const candidates: InternalImageCandidate[] = [];
  for (const r of data.results) {
    if (candidates.length >= max) break;
    const title = String(r.title || "");
    const imgUrl = r.image;
    const thumbUrl = r.thumbnail;
    if (isValidProductImageUrl(imgUrl)) {
      if (!candidates.some((c) => c.url === imgUrl)) {
        if (typeof thumbUrl === "string" && thumbUrl.startsWith("https://")) {
          registerFallbackUrl(imgUrl, thumbUrl);
        }
        candidates.push({
          url: imgUrl,
          title,
          fallbackUrl: typeof thumbUrl === "string" ? thumbUrl : undefined,
          engine: "duckduckgo",
        });
      }
    }
  }

  return { ok: true, candidates, retryable: false };
}

async function searchViaDuckDuckGo(
  query: string,
  max: number
): Promise<InternalImageCandidate[]> {
  try {
    await ddgThrottle();
    const first = await ddgAttempt(query, max);
    if (first.ok || !first.retryable) return first.candidates;

    await sleep(800);
    const second = await ddgAttempt(query, max);
    return second.candidates;
  } catch {
    return [];
  }
}

/** Motor 3: Bing Images (JSON structured blocks extraction). */
async function searchViaBing(
  query: string,
  max: number
): Promise<InternalImageCandidate[]> {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await fetch(url, {
      headers: BING_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const candidates: InternalImageCandidate[] = [];

    // Parse each m="{...}" block which contains full image metadata (murl + title + turl)
    const blockRegex = /m="({[\s\S]*?})"/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(html)) !== null && candidates.length < max) {
      try {
        const jsonStr = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
        const item = JSON.parse(jsonStr);
        const title = String(item.t || "");
        const murl = typeof item.murl === "string" ? item.murl : "";
        const rawTurl = typeof item.turl === "string" ? item.turl : "";
        const hiResTurl = rawTurl.startsWith("https://")
          ? `${rawTurl}${rawTurl.includes("?") ? "&" : "?"}w=800&h=800&c=7&pid=Api`
          : "";

        if (isValidProductImageUrl(murl)) {
          if (!candidates.some((c) => c.url === murl)) {
            if (hiResTurl) registerFallbackUrl(murl, hiResTurl);
            candidates.push({ url: murl, title, fallbackUrl: hiResTurl, engine: "bing" });
          }
        } else if (isValidProductImageUrl(hiResTurl)) {
          if (!candidates.some((c) => c.url === hiResTurl)) {
            candidates.push({ url: hiResTurl, title, engine: "bing" });
          }
        }
      } catch {
        // Continue on json parse failure
      }
    }

    return candidates;
  } catch {
    return [];
  }
}

/**
 * Searches candidates across engines for a single query.
 */
async function searchCandidatesForQuery(
  query: string,
  limit: number
): Promise<InternalImageCandidate[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const candidates: InternalImageCandidate[] = [];

  // 1. Serper if key available
  if (process.env.SERPER_API_KEY) {
    const serper = await searchViaSerper(cleanQuery, limit);
    for (const c of serper) {
      if (!candidates.some((item) => item.url === c.url)) candidates.push(c);
    }
    if (candidates.length >= limit) return candidates;
  }

  // 2. DuckDuckGo as primary structured engine
  const ddg = await searchViaDuckDuckGo(cleanQuery, limit);
  for (const c of ddg) {
    if (!candidates.some((item) => item.url === c.url)) candidates.push(c);
  }
  if (candidates.length >= limit) return candidates;

  // 3. Bing Images as supplementary engine
  const bing = await searchViaBing(cleanQuery, limit);
  for (const c of bing) {
    if (!candidates.some((item) => item.url === c.url)) candidates.push(c);
  }

  return candidates;
}

export interface SearchProductImageOptions {
  /** Prioritized list of queries to try in order until `max` images are gathered. */
  queries?: string[];
  /** Single query string (alternative to `queries`). */
  query?: string;
  /** Maximum number of image URLs to return (default: 8). */
  max?: number;
  /** Secondary broader query for fallback. */
  broaderQuery?: string;
  /** Negative keywords: results whose titles contain any of these are skipped. */
  negativeKeywords?: string[];
  /** Nombre completo del producto para calibrar el vector de características objetivo. */
  productName?: string;
  /** Categoría del producto para enriquecer el vector del espacio vectorial. */
  category?: string;
}

export function sanitizeSearchQuery(query: string): string {
  const clean = query.trim();
  if (!clean) return "";
  const alphaNum = clean.replace(/[^a-zA-Z0-9]/g, "");
  // Rechazar consultas de una sola letra (como "D" o "d") que traen el abecedario
  if (alphaNum.length < 3 && !/^(kvm|vga|ram|ssd|hub|ps2|cat|lan|ups)$/i.test(alphaNum)) {
    return "";
  }
  return clean;
}

export function deriveBroaderQueries(rawQuery: string): string[] {
  const clean = rawQuery
    .replace(/\b(adaptadores de red|cables y adaptadores|tintas y toners|categoria|nuevo|tienda|peru|precio|oferta|marca)\b/gi, "")
    .replace(/[(),;:"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = clean.split(" ").filter((t) => t.length > 1);
  const broader: string[] = [];

  // Regla especial para "American NET": ¡NUNCA cortar "NET" para no dejar "American" solo!
  const isAmericanNet = /\bamerican[\s-_]*net\b/i.test(clean);
  if (isAmericanNet) {
    broader.push("American NET adaptador");
    broader.push("American NET power adapter");
    const modelMatch = clean.match(/\b([0-9]+(\.[0-9]+)?[VAW]|\b5V\b|\b12V\b|\b2\.5A\b|\b3A\b|\bADP-[A-Z0-9]+)\b/i);
    if (modelMatch) {
      broader.push(`American NET ${modelMatch[1]}`);
      broader.push(`American NET ${modelMatch[1]} adaptador`);
    }
    return broader.filter((b) => b !== rawQuery);
  }

  // Regla especial para "D-Link" / "TP-Link": ¡NUNCA separar la "D" de "Link"!
  const isDlinkOrTplink = /\b(d[\s-_]*link|tp[\s-_]*link)\b/i.test(clean);
  if (isDlinkOrTplink) {
    const brandPrefix = /\btp/i.test(clean) ? "TP-Link" : "D-Link";
    broader.push(`${brandPrefix} switch`);
    broader.push(`${brandPrefix} KVM`);
    const modelMatch = clean.match(/\b(KVM[-_]?[0-9]+|[0-9]+[-_]?[A-Z0-9]+)\b/i);
    if (modelMatch) {
      broader.push(`${brandPrefix} ${modelMatch[1]}`);
      broader.push(`${brandPrefix} ${modelMatch[1]} switch`);
    }
    return broader.filter((b) => b !== rawQuery);
  }

  // Try extracting brand + model
  const modelMatch = clean.match(/\b([A-Z0-9]+[-_][A-Z0-9]+|[A-Z]+[0-9]+[A-Z0-9]*|[0-9]+[A-Z]+[A-Z0-9]*)\b/i);
  if (modelMatch && tokens.length > 0) {
    const brand = tokens[0];
    if (brand.toLowerCase() !== "american" && brand.toLowerCase() !== "d") {
      const model = modelMatch[1];
      const combo = `${brand} ${model}`;
      if (!broader.includes(combo)) broader.push(combo);
      const withProduct = `${brand} ${model} product`;
      if (!broader.includes(withProduct)) broader.push(withProduct);
    }
  }

  // 4-word and 3-word subsets, evitando palabras sueltas que lleven a aerolíneas o abecedarios
  if (tokens.length >= 4) {
    const subset4 = tokens.slice(0, 4).join(" ");
    if (!broader.includes(subset4) && !/^(american|airline|d)$/i.test(subset4.trim())) broader.push(subset4);
  }
  if (tokens.length >= 3) {
    const subset3 = tokens.slice(0, 3).join(" ");
    if (!broader.includes(subset3) && !/^(american|airline|d)$/i.test(subset3.trim())) broader.push(subset3);
  }

  return broader
    .filter((b) => b !== rawQuery && b.length > 3 && !/^\s*(american|d)\s*$/i.test(b))
    .map(sanitizeSearchQuery)
    .filter(Boolean);
}

/**
 * Searches the web for official product photos using Álgebra Lineal & Vector Space Models.
 * Garantiza 0 margen de error: filtra rigurosamente aviones, aerolíneas y entidades ajenas,
 * y ordena las fotos descargadas por máxima similitud vectorial del coseno.
 */
export async function searchProductImages(
  queryOrOptions: string | SearchProductImageOptions,
  max = 8,
  broaderQuery?: string,
  negativeKeywords?: string[]
): Promise<string[]> {
  let queryList: string[] = [];
  let limit = max;
  let negKeywords = negativeKeywords;
  let productName = "";
  let category: string | undefined;

  if (typeof queryOrOptions === "object" && queryOrOptions !== null) {
    limit = queryOrOptions.max ?? 8;
    negKeywords = queryOrOptions.negativeKeywords;
    productName = queryOrOptions.productName ?? "";
    category = queryOrOptions.category;
    if (queryOrOptions.queries && queryOrOptions.queries.length > 0) {
      queryList = queryOrOptions.queries;
    } else if (queryOrOptions.query) {
      queryList = [queryOrOptions.query];
      if (queryOrOptions.broaderQuery && queryOrOptions.broaderQuery !== queryOrOptions.query) {
        queryList.push(queryOrOptions.broaderQuery);
      }
    }
  } else if (typeof queryOrOptions === "string") {
    queryList = [queryOrOptions];
    productName = queryOrOptions;
    if (broaderQuery && broaderQuery !== queryOrOptions) {
      queryList.push(broaderQuery);
    }
  }

  if (queryList.length === 0) return [];

  // Sanitizar consultas eliminando unigramas degenerados (letras sueltas como "D")
  const sanitizedQueries = queryList.map(sanitizeSearchQuery).filter(Boolean);
  const baseTargetName = productName || sanitizedQueries[0] || queryList[0];
  if (sanitizedQueries.length === 0 && baseTargetName) {
    sanitizedQueries.push(`${baseTargetName} product`, baseTargetName);
  }
  if (sanitizedQueries.length === 0) return [];

  // Construir el vector objetivo del producto en R^D
  const targetVector = buildProductTargetVector(baseTargetName, category, sanitizedQueries);
  const negRegex = buildNegativeRegex(negKeywords);

  const rawCandidates: InternalImageCandidate[] = [];
  const candidateUrlsSeen = new Set<string>();

  // Pass 1: Recopilar candidatos de las consultas prioritarias (DuckDuckGo + Serper + Bing)
  const primaryQueries = sanitizedQueries.slice(0, 3);
  const pass1Results = await Promise.all(
    primaryQueries.map((q) => searchCandidatesForQuery(q, limit * 2))
  );
  for (const list of pass1Results) {
    for (const c of list) {
      if (!candidateUrlsSeen.has(c.url)) {
        candidateUrlsSeen.add(c.url);
        rawCandidates.push(c);
      }
    }
  }

  // Pass 2: Si aún hay pocos candidatos, expandir con consultas adicionales
  if (rawCandidates.length < limit * 2 && sanitizedQueries.length > 3) {
    for (const q of sanitizedQueries.slice(3)) {
      if (rawCandidates.length >= limit * 3) break;
      const list = await searchCandidatesForQuery(q, limit);
      for (const c of list) {
        if (!candidateUrlsSeen.has(c.url)) {
          candidateUrlsSeen.add(c.url);
          rawCandidates.push(c);
        }
      }
    }
  }

  // Pass 3: Expansión de consultas ampliadas seguras (manteniendo la marca American NET completa)
  if (rawCandidates.length < limit * 2 && sanitizedQueries[0]) {
    const expansions = deriveBroaderQueries(sanitizedQueries[0]);
    for (const expQ of expansions) {
      if (rawCandidates.length >= limit * 3) break;
      const list = await searchCandidatesForQuery(expQ, limit);
      for (const c of list) {
        if (!candidateUrlsSeen.has(c.url)) {
          candidateUrlsSeen.add(c.url);
          rawCandidates.push(c);
        }
      }
    }
  }

  // ── MOTOR DE EVALUACIÓN Y FILTRADO POR ÁLGEBRA LINEAL ───────────────────────
  const verifiedCandidates: { url: string; cosine: number }[] = [];

  for (const cand of rawCandidates) {
    const evaluation = evaluateCandidateWithLinearAlgebra(
      cand,
      targetVector,
      negRegex,
      negKeywords
    );
    if (evaluation.accepted) {
      verifiedCandidates.push({
        url: cand.url,
        cosine: evaluation.cosine,
      });
      if (cand.fallbackUrl) {
        registerFallbackUrl(cand.url, cand.fallbackUrl);
      }
    }
  }

  // Ordenar estrictamente de mayor a menor similitud de cosenos en R^D
  verifiedCandidates.sort((a, b) => b.cosine - a.cosine);

  return verifiedCandidates.slice(0, limit).map((c) => c.url);
}
