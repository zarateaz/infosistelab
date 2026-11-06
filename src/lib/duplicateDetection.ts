/**
 * Zero-margin-of-error duplicate product detection system powered by Linear Algebra & Vector Space Models.
 * Designed specifically for hardware, computer parts, peripherals, and electronics catalogs.
 *
 * Checks:
 * 1. Barcode match (exact, trimmed, leading zeros normalized).
 * 2. Exact name match (case-insensitive, whitespace trimmed).
 * 3. Normalized name match (accents/diacritics stripped, punctuation cleaned).
 * 4. Canonical synonym & word-sorted match (e.g. "CAJA DE DISCO DURO UGREEN 2.5 SATA" vs "CASE DISCO DURO UGREEN 2.5 SATA").
 * 5. Distinctive model code match with brand & spec verification (checks both name and description).
 * 6. Brand orthogonality protection: Logitech vs Razer, Kingston vs Hiksemi vs Biwin vs WD NEVER match.
 * 7. Variant protection: Differentiates legitimate variants (32GB vs 64GB vs 128GB, 100MB/s vs 103MB/s, V10 vs V30, Negro vs Blanco).
 * 8. Algebraic Vector Space Model (VSM): Computes weighted term Cosine Similarity and Jaccard distance over feature vectors.
 */

export interface ProductSummary {
  id: string;
  name: string;
  barcode?: string | null;
  category?: string | null;
  price?: number;
  costPrice?: number | null;
  stock?: number;
  image?: string | null;
  images?: string | null;
  description?: string | null;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  message?: string;
  reason?:
    | "barcode"
    | "exact_name"
    | "normalized_name"
    | "word_permutation"
    | "model_code"
    | "high_similarity";
  existingProduct?: ProductSummary;
  /** Medida algebraica de similitud vectorial de cosenos (0.0 a 1.0) */
  cosineSimilarity?: number;
  /** Coeficiente de Jaccard sobre tokens distintivos (0.0 a 1.0) */
  jaccardSimilarity?: number;
}

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "para",
  "con",
  "sin",
  "en",
  "por",
  "y",
  "o",
  "a",
  "al",
  "uso",
  "tipo",
]);

/**
 * Canonical synonym map for Spanish/English hardware terms so AI scans of the same box
 * normalize to the same root token even if phrased slightly differently.
 */
const CANONICAL_SYNONYMS: Record<string, string> = {
  portatil: "laptop",
  portatiles: "laptop",
  notebook: "laptop",
  notebooks: "laptop",
  laptops: "laptop",
  celular: "celular",
  celulares: "celular",
  telefono: "celular",
  smartphone: "celular",
  movil: "celular",
  case: "caja",
  cofre: "caja",
  enclosure: "caja",
  carcasa: "caja",
  stand: "soporte",
  holder: "soporte",
  base: "soporte",
  soportes: "soporte",
  raton: "mouse",
  mouses: "mouse",
  mice: "mouse",
  teclados: "teclado",
  keyboard: "teclado",
  auricular: "audifono",
  auriculares: "audifono",
  audifonos: "audifono",
  headset: "audifono",
  headphone: "audifono",
  headphones: "audifono",
  altavoz: "parlante",
  altavoces: "parlante",
  parlantes: "parlante",
  bocina: "parlante",
  speaker: "parlante",
  speakers: "parlante",
  convertidor: "adaptador",
  adapter: "adaptador",
  adaptadores: "adaptador",
  cables: "cable",
  cord: "cable",
  inalambrico: "wireless",
  inalambrica: "wireless",
  carro: "auto",
  vehiculo: "auto",
  automovil: "auto",
  ventilacion: "rejilla",
  aire: "rejilla",
  desktop: "escritorio",
  plegable: "ajustable",
  regulable: "ajustable",
  pulgadas: "inch",
  pulgada: "inch",
  tarjeta: "memoria",
};

/**
 * Common hardware, storage & tech brands in Peru and international catalogs.
 */
export const KNOWN_BRANDS = [
  // Memorias y Almacenamiento
  "kingston",
  "hiksemi",
  "biwin",
  "sandisk",
  "western digital",
  "wd purple",
  "wd blue",
  "wd black",
  "wd green",
  "wd",
  "kioxia",
  "netac",
  "lexar",
  "adata",
  "transcend",
  "silicon power",
  "patriot",
  "teamgroup",
  "team",
  "seagate",
  "toshiba",
  "crucial",
  "samsung",
  "micron",
  "verbatim",
  "kllisre",
  "kingspec",
  "goldenfir",
  // Periféricos y componentes
  "logitech",
  "razer",
  "redragon",
  "teraware",
  "halion",
  "micronics",
  "cybertel",
  "marvo",
  "t-dagger",
  "tdagger",
  "vsg",
  "corsair",
  "hyperx",
  "asus",
  "gigabyte",
  "msi",
  "asrock",
  "zotac",
  "evga",
  "intel",
  "amd",
  "nvidia",
  "lenovo",
  "hp",
  "dell",
  "acer",
  "apple",
  "xiaomi",
  "huawei",
  "epson",
  "canon",
  "brother",
  "tp-link",
  "tplink",
  "d-link",
  "dlink",
  "mercusys",
  "tenda",
  "ubiquiti",
  "mikrotik",
  "ugreen",
  "cabletime",
  "vention",
  "orico",
  "zkteco",
  "baseus",
  "anker",
  "belkin",
  "philips",
  "sony",
  "lg",
  "viewsonic",
  "benq",
  "aoc",
  "terabyte",
  "antryx",
  "gamemax",
  "cougar",
  "cooler master",
  "thermaltake",
  "deepcool",
  "nzxt",
  "evotec",
  "advance",
  "klip xtreme",
  "forza",
  "apc",
  "cdp",
  "hikvision",
  "dahua",
  "ezviz",
  "imou",
  "genius",
  "havit",
  "kolke",
  "argom",
  "pny",
  "biostar",
  "colorful",
  "palit",
  "xfx",
  "sapphire",
  "powercolor",
  "jbl",
  "fifine",
  "boya",
  "wacom",
  "steren",
  "dixon",
  "teros",
  "fantech",
  "aula",
  "ajazz",
  "keychron",
  "akko",
  "american net",
  "american-net",
  "americannet",
];

// Marcas ordenadas de mayor a menor longitud para evitar que "wd" se coma a "wd purple" o "western digital"
const SORTED_BRANDS = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);

/**
 * Generic technical specifications and standards that must NEVER be treated as hardware model codes.
 */
const GENERIC_SPEC_TOKENS = new Set([
  "ddr",
  "ddr2",
  "ddr3",
  "ddr4",
  "ddr5",
  "gddr5",
  "gddr6",
  "lpddr4",
  "lpddr5",
  "sata",
  "sata3",
  "nvme",
  "pcie",
  "m2",
  "usb",
  "usb2",
  "usb3",
  "usb30",
  "usb31",
  "usb32",
  "usbc",
  "typec",
  "hdmi",
  "vga",
  "dvi",
  "dp",
  "displayport",
  "rj45",
  "lan",
  "aux",
  "microsd",
  "sd",
  "sdxc",
  "sdhc",
  "uhs1",
  "uhs3",
  "v10",
  "v30",
  "v60",
  "v90",
  "a1",
  "a2",
  "c10",
  "4k",
  "8k",
  "2k",
  "1080p",
  "720p",
  "1440p",
  "fhd",
  "qhd",
  "uhd",
  "hd",
  "60hz",
  "75hz",
  "90hz",
  "100hz",
  "120hz",
  "144hz",
  "165hz",
  "180hz",
  "240hz",
  "360hz",
  "wifi",
  "wifi5",
  "wifi6",
  "wifi6e",
  "wifi7",
  "bt",
  "bt5",
  "bluetooth",
  "cat5",
  "cat5e",
  "cat6",
  "cat6a",
  "cat7",
  "cat8",
  "rgb",
  "argb",
  "led",
  "ips",
  "va",
  "tn",
  "oled",
  "atx",
  "matx",
  "itx",
  "1tb",
  "2tb",
  "4tb",
  "500gb",
  "480gb",
  "256gb",
  "250gb",
  "240gb",
  "128gb",
  "120gb",
  "512gb",
  "64gb",
  "32gb",
  "16gb",
  "8gb",
  "4gb",
  "2gb",
  "1gb",
]);

/**
 * Pesos algebraicos para el cálculo de similitud en el espacio vectorial (Vector Space Model).
 * Los términos genéricos tienen un peso muy bajo, mientras que marcas, modelos y especificaciones
 * tienen pesos altos para separar productos que solo comparten la categoría.
 */
const GENERIC_WEIGHTS: Record<string, number> = {
  memoria: 0.15,
  tarjeta: 0.15,
  microsd: 0.2,
  sd: 0.2,
  sdxc: 0.2,
  sdhc: 0.2,
  disco: 0.2,
  cable: 0.2,
  adaptador: 0.2,
  case: 0.2,
  caja: 0.2,
  soporte: 0.2,
  funda: 0.2,
  combo: 0.25,
  kit: 0.25,
  accesorio: 0.1,
  producto: 0.05,
};

/**
 * Normalizes text: strips accents/diacritics, lowercase, collapses spaces, removes non-alphanumeric chars.
 */
export function normalizeText(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits normalized text into distinctive non-stop words, applying canonical tech synonyms.
 */
export function extractDistinctiveTokens(str: string): string[] {
  const norm = normalizeText(str);
  if (!norm) return [];
  const tokens = norm
    .split(" ")
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .map((token) => CANONICAL_SYNONYMS[token] ?? token);
  return Array.from(new Set(tokens));
}

/**
 * Extracts a recognizable brand name from text if present.
 */
export function extractBrand(str: string): string | null {
  const norm = ` ${normalizeText(str)} `;
  for (const b of SORTED_BRANDS) {
    const brandNorm = normalizeText(b);
    if (norm.includes(` ${brandNorm} `)) {
      return brandNorm;
    }
  }
  return null;
}

/**
 * Real tech model codes (e.g. "TL-WN725N", "US320", "MS100", "V15", "G502", "B450M", "L3250").
 */
export function extractModelCodes(str: string): string[] {
  if (!str) return [];
  const rawTokens = str
    .toUpperCase()
    .replace(/[(),;:"]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter(Boolean);

  const modelCodes = new Set<string>();
  for (const token of rawTokens) {
    const clean = token.replace(/[^A-Z0-9]/g, "").toLowerCase();
    if (!clean || GENERIC_SPEC_TOKENS.has(clean)) continue;
    // Skip pure measurements
    if (/^\d+(m|cm|mm|w|v|a|hz|gb|tb|mb|gbps|mbps|p|k)$/.test(clean)) continue;

    // Alphanumeric with both letters and numbers, length >= 3 (e.g. MS100, WN725N, US320, G502)
    if (clean.length >= 3 && /[a-z]/.test(clean) && /[0-9]/.test(clean)) {
      modelCodes.add(clean);
    }
    // Specific manufacturer part numbers: 5 or more digits
    else if (/^\d{5,}$/.test(clean) && !/^202[0-9]$/.test(clean)) {
      modelCodes.add(clean);
    }
  }
  return Array.from(modelCodes);
}

/**
 * Technical specifications extracted for hardware & electronics.
 */
export interface TechnicalSpecs {
  lengths: Set<string>;
  versions: Set<string>;
  resolutions: Set<string>;
  refreshRates: Set<string>;
  speeds: Set<string>;
  speedClasses: Set<string>;
  wattages: Set<string>;
  amperages: Set<string>;
  capacities: Set<string>;
  colors: Set<string>;
  portCounts: Set<string>;
  formFactors: Set<string>;
  modelSeries: Set<string>;
}

export function extractTechnicalSpecs(text: string): TechnicalSpecs {
  const lengths = new Set<string>();
  const versions = new Set<string>();
  const resolutions = new Set<string>();
  const refreshRates = new Set<string>();
  const speeds = new Set<string>();
  const speedClasses = new Set<string>();
  const wattages = new Set<string>();
  const amperages = new Set<string>();
  const capacities = new Set<string>();
  const colors = new Set<string>();
  const portCounts = new Set<string>();
  const formFactors = new Set<string>();
  const modelSeries = new Set<string>();

  if (!text) {
    return {
      lengths,
      versions,
      resolutions,
      refreshRates,
      speeds,
      speedClasses,
      wattages,
      amperages,
      capacities,
      colors,
      portCounts,
      formFactors,
      modelSeries,
    };
  }

  const raw = text.toLowerCase();

  // 1. Memory / Storage Capacities (32GB, 64GB, 128GB, 256GB, 512GB, 1TB, 2TB)
  const capRegex = /(?:^|[\s,;([/\-_])(\d+)\s*(gb|tb|mb|g)(?:$|[\s,;.)\]/\-_])/gi;
  let match: RegExpExecArray | null;
  while ((match = capRegex.exec(raw)) !== null) {
    const num = match[1];
    const unit = match[2].toLowerCase() === "g" ? "gb" : match[2].toLowerCase();
    capacities.add(`${num}${unit}`);
  }

  // 2. Read / Write Speeds (100MB/s, 103MB/s, 150MB/s, 100MBps, 5Gbps, etc.)
  const speedRegex = /(?:^|[\s,;([/])(\d+(?:\.\d+)?)\s*(mb\/s|mbs|mbps|gbps|gbs)(?:$|[\s,;.)\]/])/gi;
  while ((match = speedRegex.exec(raw)) !== null) {
    const num = match[1];
    const unit = match[2].includes("g") ? "gbps" : "mbps";
    speeds.add(`${num}${unit}`);
  }

  // 3. Card Speed Classes: V10, V30, V60, V90, U1, U3, A1, A2, Class 10 / C10
  const classRegex = /(?:^|[\s,;([/\-_])(v10|v30|v60|v90|u1|u3|a1|a2|c10|c4|uhs-i|uhs-ii|uhs-1|uhs-3|clase\s*10|class\s*10)(?:$|[\s,;.)\]/\-_])/gi;
  while ((match = classRegex.exec(raw)) !== null) {
    const clean = match[1].replace(/\s+/g, "").replace("clase", "class");
    speedClasses.add(clean);
  }

  // 4. Distinctive Storage & Product Series
  const seriesTokens = [
    "canvas select plus",
    "canvas select",
    "canvas go",
    "canvas react",
    "neo lux",
    "ms100",
    "purple",
    "wd purple",
    "wd blue",
    "wd black",
    "wd green",
    "evo plus",
    "evo select",
    "pro plus",
    "extreme pro",
    "extreme",
    "ultra",
    "fury beast",
    "fury renegade",
    "nv2",
    "kc3000",
    "a400",
    "lightsync",
    "hero",
  ];
  for (const s of seriesTokens) {
    if (raw.includes(s)) {
      modelSeries.add(s);
    }
  }

  // 5. Lengths / Measures (e.g. 1.5m, 1.8m, 2m, 3m, 5m, 10m)
  const lengthRegex = /(?:^|[\s,;([/])(\d+(?:\.\d+)?)\s*(m|mts|metros|cm|mm)(?:$|[\s,;.)\]/])/gi;
  while ((match = lengthRegex.exec(raw)) !== null) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("m") && unit !== "mm") {
      lengths.add(`${num}m`);
    } else if (unit === "cm") {
      lengths.add(`${num}cm`);
    }
  }

  // 6. Protocols and versions (HDMI 2.0 vs 2.1, USB 2.0 vs 3.0, Cat5e vs Cat6, BT 5.0 vs 5.3)
  const hdmiRegex = /(?:^|[\s,;([/])(?:hdmi\s*(1\.4|2\.0|2\.1)|(?:1\.4|2\.0|2\.1)\s*hdmi)(?:$|[\s,;.)\]/])/gi;
  while ((match = hdmiRegex.exec(raw)) !== null) {
    versions.add(`hdmi_${match[1]}`);
  }
  const usbRegex = /(?:^|[\s,;([/])(?:usb\s*(2\.0|3\.0|3\.1|3\.2|4\.0)|(?:2\.0|3\.0|3\.1|3\.2|4\.0)\s*usb)(?:$|[\s,;.)\]/])/gi;
  while ((match = usbRegex.exec(raw)) !== null) {
    versions.add(`usb_${match[1]}`);
  }
  const ethRegex = /(?:^|[\s,;([/])(?:cat(?:egoria)?\s*(5e|5|6a|6|7|8)|cat(5e|5|6a|6|7|8))(?:$|[\s,;.)\]/])/gi;
  while ((match = ethRegex.exec(raw)) !== null) {
    versions.add(`cat_${match[1] || match[2]}`);
  }
  const btRegex = /(?:^|[\s,;([/])(?:bluetooth|bt)\s*(4\.0|4\.2|5\.0|5\.1|5\.2|5\.3|5\.4)(?:$|[\s,;.)\]/])/gi;
  while ((match = btRegex.exec(raw)) !== null) {
    versions.add(`bt_${match[1]}`);
  }

  // 7. Resolutions and refresh rates
  const resRegex = /(?:^|[\s,;([/])(4k|8k|2k|1080p|720p|1440p|fhd|qhd|uhd)(?:$|[\s,;.)\]/])/gi;
  while ((match = resRegex.exec(raw)) !== null) {
    resolutions.add(match[1]);
  }
  const hzRegex = /(?:^|[\s,;([/])(\d+)\s*hz(?:$|[\s,;.)\]/])/gi;
  while ((match = hzRegex.exec(raw)) !== null) {
    refreshRates.add(`${match[1]}hz`);
  }

  // 8. Electrical: Wattage and Amperage
  const wRegex = /(?:^|[\s,;([/])(\d+(?:\.\d+)?)\s*(w|watts)(?:$|[\s,;.)\]/])/gi;
  while ((match = wRegex.exec(raw)) !== null) {
    wattages.add(`${parseFloat(match[1])}w`);
  }
  const aRegex = /(?:^|[\s,;([/])(\d+(?:\.\d+)?)\s*(a|amp|amperios)(?:$|[\s,;.)\]/])/gi;
  while ((match = aRegex.exec(raw)) !== null) {
    amperages.add(`${parseFloat(match[1])}a`);
  }

  // 9. Colors
  const colorRegex = /(?:^|[\s,;([/])(negro|black|cian|cyan|magenta|amarillo|yellow|azul|blue|rojo|red|blanco|white|gris|gray|grey|verde|green)(?:$|[\s,;.)\]/])/gi;
  while ((match = colorRegex.exec(raw)) !== null) {
    const c = match[1].toLowerCase();
    if (c === "black") colors.add("negro");
    else if (c === "cyan") colors.add("cian");
    else if (c === "yellow") colors.add("amarillo");
    else if (c === "blue") colors.add("azul");
    else if (c === "red") colors.add("rojo");
    else if (c === "white") colors.add("blanco");
    else if (c === "gray" || c === "grey") colors.add("gris");
    else if (c === "green") colors.add("verde");
    else colors.add(c);
  }

  // 10. Port counts
  const portRegex = /(?:^|[\s,;([/])(\d+)\s*(?:en\s*1|in\s*1|puertos|ports)(?:$|[\s,;.)\]/])/gi;
  while ((match = portRegex.exec(raw)) !== null) {
    portCounts.add(`${match[1]}_ports`);
  }

  // 11. Form factors
  const inchRegex = /(?:^|[\s,;([/])(2\.5|3\.5|13\.3|14|15\.6|16|17\.3|21\.5|24|27|32)\s*(?:"|''|pulgadas|inch)(?:$|[\s,;.)\]/])/gi;
  while ((match = inchRegex.exec(raw)) !== null) {
    formFactors.add(`${match[1]}_inch`);
  }

  return {
    lengths,
    versions,
    resolutions,
    refreshRates,
    speeds,
    speedClasses,
    wattages,
    amperages,
    capacities,
    colors,
    portCounts,
    formFactors,
    modelSeries,
  };
}

/**
 * Checks if two products have conflicting technical specifications.
 * In Linear Algebra terms, conflicting specs indicate orthogonality in the feature space.
 */
export function haveConflictingTechnicalSpecs(a: string, b: string): boolean {
  if (!a || !b) return false;
  const sA = extractTechnicalSpecs(a);
  const sB = extractTechnicalSpecs(b);

  const checkConflict = (setA: Set<string>, setB: Set<string>) => {
    if (setA.size > 0 && setB.size > 0) {
      for (const val of setA) {
        if (setB.has(val)) return false;
      }
      return true; // Conjuntos disjuntos => Conflicto
    }
    return false;
  };

  // Restricciones duras: Si difieren en capacidad, velocidad, serie, medidas o colores => Conflicto
  if (checkConflict(sA.capacities, sB.capacities)) return true;
  if (checkConflict(sA.modelSeries, sB.modelSeries)) return true;
  if (checkConflict(sA.speedClasses, sB.speedClasses)) return true;
  if (checkConflict(sA.speeds, sB.speeds)) return true;
  if (checkConflict(sA.lengths, sB.lengths)) return true;
  if (checkConflict(sA.versions, sB.versions)) return true;
  if (checkConflict(sA.resolutions, sB.resolutions)) return true;
  if (checkConflict(sA.refreshRates, sB.refreshRates)) return true;
  if (checkConflict(sA.wattages, sB.wattages)) return true;
  if (checkConflict(sA.amperages, sB.amperages)) return true;
  if (checkConflict(sA.colors, sB.colors)) return true;
  if (checkConflict(sA.portCounts, sB.portCounts)) return true;
  if (checkConflict(sA.formFactors, sB.formFactors)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// MOTOR DE ÁLGEBRA LINEAL: ESPACIO VECTORIAL Y SIMILITUD DE COSENOS
// ---------------------------------------------------------------------------

/**
 * Construye un vector de pesos en R^D para los tokens de un producto.
 */
function buildFeatureVector(tokens: string[]): Map<string, number> {
  const vec = new Map<string, number>();
  for (const token of tokens) {
    const baseWeight = GENERIC_WEIGHTS[token] ?? (/[0-9]/.test(token) ? 2.0 : 1.5);
    vec.set(token, (vec.get(token) ?? 0) + baseWeight);
  }
  return vec;
}

/**
 * Calcula la Similitud del Coseno entre dos vectores en el espacio de características:
 * cos(theta) = (u · v) / (||u||_2 * ||v||_2)
 */
export function computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [, weight] of vecA) {
    normA += weight * weight;
  }
  for (const [, weight] of vecB) {
    normB += weight * weight;
  }

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
 * Calcula el coeficiente de Jaccard sobre conjuntos finitos de tokens:
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  if (unionSize === 0) return 0;
  return intersectionCount / unionSize;
}

/**
 * Evaluates whether an input product matches an existing catalog product.
 * CERO MARGEN DE ERROR: Utiliza Álgebra Lineal en espacios vectoriales.
 * Los productos parecidos pero de diferente marca, capacidad o serie NUNCA son duplicados.
 */
export function evaluateDuplicateMatch(
  input: { name: string; barcode?: string | null; description?: string | null },
  candidate: ProductSummary
): DuplicateDetectionResult {
  // 1. Verificación por código de barras exacto (SKU físico 100% certero)
  const inputBarcode = input.barcode?.trim();
  const candBarcode = candidate.barcode?.trim();
  if (inputBarcode && candBarcode) {
    const normInputBc = inputBarcode.replace(/^0+/, "");
    const normCandBc = candBarcode.replace(/^0+/, "");
    if (inputBarcode === candBarcode || (normInputBc && normInputBc === normCandBc)) {
      return {
        isDuplicate: true,
        reason: "barcode",
        message: `Coincidencia exacta por código de barras ("${candidate.barcode}") con "${candidate.name}".`,
        existingProduct: candidate,
      };
    }
  }

  const rawInputName = input.name?.trim();
  const rawCandName = candidate.name?.trim();
  if (!rawInputName || !rawCandName) {
    return { isDuplicate: false };
  }

  // Texto completo combinado para análisis técnico profundo
  const inputFull = `${rawInputName} ${input.description ?? ""}`;
  const candFull = `${rawCandName} ${candidate.description ?? ""}`;

  // 2. Comprobación algebraica de ortogonalidad por especificaciones técnicas:
  // Si difieren en capacidad (ej: 32GB vs 64GB), velocidad, serie o clase, NO son duplicados
  if (haveConflictingTechnicalSpecs(inputFull, candFull)) {
    return { isDuplicate: false };
  }

  // 3. Coincidencia exacta de nombre (sin distinción de mayúsculas/minúsculas)
  if (rawInputName.toLowerCase() === rawCandName.toLowerCase()) {
    return {
      isDuplicate: true,
      reason: "exact_name",
      message: `El producto ya se encuentra en la tienda con el mismo nombre ("${candidate.name}").`,
      existingProduct: candidate,
    };
  }

  const normInput = normalizeText(rawInputName);
  const normCand = normalizeText(rawCandName);

  // 4. Coincidencia exacta de texto normalizado
  if (normInput === normCand) {
    return {
      isDuplicate: true,
      reason: "normalized_name",
      message: `El producto ya se encuentra en la tienda ("${candidate.name}").`,
      existingProduct: candidate,
    };
  }

  // 5. Restricción dura de marcas (Subespacio de Marca):
  // Si una es Kingston y la otra es Hiksemi, Biwin o WD, son ortogonales => JAMÁS coinciden
  const brandInput = extractBrand(inputFull);
  const brandCand = extractBrand(candFull);
  if (brandInput && brandCand && brandInput !== brandCand) {
    return { isDuplicate: false };
  }
  // Si uno tiene marca identificada y el otro tiene una marca completamente distinta no listada
  if ((brandInput && !brandCand) || (!brandInput && brandCand)) {
    // Si uno tiene marca y el otro no, no asociar
    return { isDuplicate: false };
  }

  const tokensInput = extractDistinctiveTokens(rawInputName);
  const tokensCand = extractDistinctiveTokens(rawCandName);

  // 6. Permutación idéntica de palabras clave
  if (tokensInput.length > 0 && tokensCand.length > 0 && tokensInput.length === tokensCand.length) {
    const sortedInput = [...tokensInput].sort().join(" ");
    const sortedCand = [...tokensCand].sort().join(" ");
    if (sortedInput === sortedCand) {
      return {
        isDuplicate: true,
        reason: "word_permutation",
        message: `El producto ya se encuentra en la tienda ("${candidate.name}").`,
        existingProduct: candidate,
      };
    }
  }

  // 7. Códigos de modelo específicos en el título
  const modelsInputName = extractModelCodes(rawInputName);
  const modelsCandName = extractModelCodes(rawCandName);

  if (modelsInputName.length > 0 && modelsCandName.length > 0) {
    const sharedModels = modelsInputName.filter((m) => modelsCandName.includes(m));
    const differentModels = modelsInputName.filter((m) => !modelsCandName.includes(m));

    // Si ambos tienen códigos de modelo y son distintos (ej. MS100 vs G502 vs NV2):
    if (differentModels.length > 0 && sharedModels.length === 0) {
      return { isDuplicate: false };
    }

    // Si comparten el código de modelo exacto y misma marca:
    if (sharedModels.length > 0 && (!brandInput || !brandCand || brandInput === brandCand)) {
      return {
        isDuplicate: true,
        reason: "model_code",
        message: `Mismo modelo exacto detectado (${sharedModels[0].toUpperCase()}) en "${candidate.name}".`,
        existingProduct: candidate,
      };
    }
  }

  // 8. Algoritmo Algebraico de Similitud Vectorial del Coseno (Vector Space Model)
  // Evalúa el coseno del ángulo entre los dos vectores en R^D
  const vecInput = buildFeatureVector(tokensInput);
  const vecCand = buildFeatureVector(tokensCand);
  const cosine = computeCosineSimilarity(vecInput, vecCand);
  const jaccard = computeJaccardSimilarity(tokensInput, tokensCand);

  // Dos productos solo son duplicados si su similitud vectorial es casi idéntica (>= 94%)
  // Productos parecidos (como tarjetas de memoria de distinta marca o modelo) suelen tener cosenos < 0.70
  if (cosine >= 0.94 && jaccard >= 0.88) {
    return {
      isDuplicate: true,
      reason: "high_similarity",
      message: `Alta similitud vectorial (${(cosine * 100).toFixed(0)}%) con "${candidate.name}".`,
      existingProduct: candidate,
      cosineSimilarity: cosine,
      jaccardSimilarity: jaccard,
    };
  }

  return {
    isDuplicate: false,
    cosineSimilarity: cosine,
    jaccardSimilarity: jaccard,
  };
}
