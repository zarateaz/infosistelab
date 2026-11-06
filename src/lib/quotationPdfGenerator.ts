import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";
import { INFOSISTEL_LOGO_BASE64 } from "./infosistelLogoBase64";
import {
  formatQuotationDate,
  addQuotationDays,
  COMPANY_RUC,
  COMPANY_BANK_ACCOUNTS,
  COMPANY_YAPE_PLIN,
  COMPANY_EMAIL,
  COMPANY_WEB,
} from "./quotationDates";

export {
  formatQuotationDate,
  addQuotationDays,
  COMPANY_RUC,
  COMPANY_BANK_ACCOUNTS,
  COMPANY_YAPE_PLIN,
  COMPANY_EMAIL,
  COMPANY_WEB,
};

try {
  applyPlugin(jsPDF);
} catch {
  // Handled safely
}

export interface QuotationPdfItem {
  id?: string;
  description: string;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  image?: string | null;
}

export interface QuotationPdfData {
  code: string;
  clientName: string;
  clientDocType?: string | null;
  clientDocNum?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  attentionTo?: string | null;
  issueDate: Date | string;
  validDays: number;
  currency: string; // "PEN" | "USD"
  includeIgv: boolean;
  igvPercent?: number;
  subtotal: number;
  discount?: number;
  igv: number;
  total: number;
  deliveryTime?: string | null;
  paymentMethod?: string | null;
  warranty?: string | null;
  notes?: string | null;
  items: QuotationPdfItem[];
  images?: string[];
}

/**
 * Loads an image from URL or data-URL and prepares it onto an offscreen canvas
 * with a white background so it can be cleanly embedded into jsPDF as a JPEG.
 */
async function loadImageDataUrl(src: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!src) return null;

  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      const handleSuccess = () => {
        try {
          const naturalW = img.naturalWidth || img.width || 800;
          const naturalH = img.naturalHeight || img.height || 600;

          // Limit canvas resolution to max 1600 on longest side for PDF optimization
          const maxDim = 1600;
          let targetW = naturalW;
          let targetH = naturalH;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          // Solid white background to prevent black/alpha artifacts in PDF
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(jpegDataUrl);
        } catch {
          resolve(null);
        }
      };

      img.onload = handleSuccess;
      img.onerror = () => {
        // Fallback attempt without cors in case of local same-origin assets
        try {
          const fallback = new window.Image();
          fallback.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = fallback.naturalWidth || fallback.width || 800;
              canvas.height = fallback.naturalHeight || fallback.height || 600;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(fallback, 0, 0);
              resolve(canvas.toDataURL("image/jpeg", 0.9));
            } catch {
              resolve(null);
            }
          };
          fallback.onerror = () => resolve(null);
          fallback.src = src;
        } catch {
          resolve(null);
        }
      };

      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

function safeRunAutoTable(doc: jsPDF, options: any) {
  try {
    if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(options);
      return;
    }
  } catch (e) {
    console.warn("doc.autoTable failed, falling back to direct function", e);
  }

  if (typeof autoTable === "function") {
    autoTable(doc, options);
  } else if (typeof (autoTable as any)?.default === "function") {
    (autoTable as any).default(doc, options);
  } else {
    throw new Error("No se pudo ejecutar autoTable en el documento PDF.");
  }
}

function safeSavePdf(doc: jsPDF, filename: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  } catch {
    doc.save(filename);
  }
}

function formatDate(dateVal: Date | string): string {
  return formatQuotationDate(dateVal);
}

function addDays(dateVal: Date | string, days: number): string {
  return addQuotationDays(dateVal, days);
}

/**
 * Normalizes and sanitizes text for jsPDF using standard Type 1 fonts (Helvetica).
 * Standard WinAnsiEncoding in PDF does not support characters outside Latin-1/WinAnsi
 * (such as unicode double prime ″, single prime ′, typographic quotes, mathematical minus, etc.).
 * When jsPDF encounters characters > 255 without an embedded font, it triggers UTF-16BE
 * encoding with null bytes (\x00), which causes PDF viewers to render double letter spacing
 * and cut off or hide specifications like "SSD 512GB / 15.6\"".
 */
export function normalizePdfText(text: string | null | undefined): string {
  if (!text) return "";
  let s = String(text);

  // 1. Line endings and invisible spaces
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, ""); // Zero-width spaces
  s = s.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " "); // Unicode & non-breaking spaces

  // 2. Primes and quotes (e.g., screen sizes 15.6″, 14″)
  s = s.replace(/[\u2033\u2036\u02DD\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"');
  s = s.replace(/[\u2032\u2035\u2018\u2019\u201A\u201B\u00B4\u0060]/g, "'");
  s = s.replace(/[\u2034\u2037]/g, "'''");

  // 3. Dashes and minus signs
  s = s.replace(/[\u2010-\u2015\u2212]/g, "-");

  // 4. Bullets and symbols
  s = s.replace(/[\u2022\u25CF\u25CB\u25AA\u25AB]/g, "-");
  s = s.replace(/\u2026/g, "...");
  s = s.replace(/[\u2192\u21D2]/g, "->");
  s = s.replace(/[\u2190\u21D0]/g, "<-");
  s = s.replace(/[\u2264]/g, "<=");
  s = s.replace(/[\u2265]/g, ">=");
  s = s.replace(/[\u2260]/g, "!=");
  s = s.replace(/[\u2713\u2714]/g, "[OK]");
  s = s.replace(/[\u2717\u2718]/g, "[X]");

  // 5. Normalization to NFC (preserves standard Spanish letters á, é, í, ó, ú, ñ, Ñ, ü, Ü, ¿, ¡, °)
  s = s.normalize("NFC");

  // 6. Safe character filter for Type1 WinAnsi
  const safeHighCodes = new Set([8364, 8482]); // €, ™
  let clean = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 10 || (code >= 32 && code <= 126)) {
      clean += s[i];
    } else if (code >= 160 && code <= 255) {
      clean += s[i];
    } else if (safeHighCodes.has(code)) {
      clean += s[i];
    } else {
      clean += " ";
    }
  }

  return clean;
}


// Convert number to Spanish words for Peruvian commercial documents
function numberToSpanishWords(amount: number, currency: string): string {
  const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const tens = [
    "",
    "DIEZ",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const teens = [
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
  ];
  const hundreds = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  function convertGroup(n: number): string {
    let output = "";
    if (n === 100) return "CIEN";
    if (n > 99) {
      output += hundreds[Math.floor(n / 100)] + " ";
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      output += teens[n - 10] + " ";
      return output.trim();
    }
    if (n >= 21 && n <= 29) {
      output += "VEINTI" + units[n - 20] + " ";
      return output.trim();
    }
    if (n >= 20) {
      output += tens[Math.floor(n / 10)] + " ";
      n %= 10;
      if (n > 0) output += "Y ";
    }
    if (n > 0) {
      output += units[n] + " ";
    }
    return output.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);
  const centsStr = String(decimalPart).padStart(2, "0") + "/100";

  let words = "";
  if (integerPart === 0) {
    words = "CERO";
  } else {
    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    if (millions > 0) {
      words += (millions === 1 ? "UN MILLÓN" : convertGroup(millions) + " MILLONES") + " ";
    }
    if (thousands > 0) {
      words += (thousands === 1 ? "MIL" : convertGroup(thousands) + " MIL") + " ";
    }
    if (remainder > 0) {
      words += convertGroup(remainder) + " ";
    }
  }

  const currencyName = currency === "USD" ? "DÓLARES AMERICANOS" : "SOLES";
  return `SON: ${words.trim()} CON ${centsStr} ${currencyName}`;
}

/**
 * Generates an executive, highly professional PDF quotation with official Infosistel branding.
 */
export async function generateQuotationPDF(data: QuotationPdfData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const brandPrimary = [10, 95, 219] as const; // #0a5fdb
  const brandDark = [15, 23, 42] as const; // #0f172a
  const mutedGray = [100, 116, 139] as const; // #64748b
  const lightBg = [248, 250, 252] as const; // #f8fafc
  const cardBorder = [226, 232, 240] as const;

  const currSymbol = data.currency === "USD" ? "$" : "S/.";

  // Top Header: Logo on left
  try {
    doc.addImage(INFOSISTEL_LOGO_BASE64, "PNG", 14, 10, 48, 5.8);
  } catch (err) {
    console.warn("Could not add image logo, using text header:", err);
    doc.setTextColor(...brandPrimary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INFOSISTEL", 14, 15);
  }

  // Tagline below logo: Informática, Sistemas y Telecomunicaciones
  doc.setTextColor(...brandDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("INFORMÁTICA · SISTEMAS · TELECOMUNICACIONES", 14, 19.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...mutedGray);
  doc.text(`RUC: ${COMPANY_RUC}  |  Huancayo, Junín  |  WhatsApp: (+51) 900 000 000`, 14, 24);
  doc.text(`Correo: ${COMPANY_EMAIL}`, 14, 28);

  // Pleasant Promotional Pill for the Website
  const webPillX = 14;
  const webPillY = 31;
  const webPillWidth = 104;
  const webPillHeight = 6;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(webPillX, webPillY, webPillWidth, webPillHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.3);
  doc.setTextColor(10, 95, 219);
  doc.text(
    "¡Visítanos en nuestra web: https://www.infosistel.com.pe/! Cotiza 24/7",
    webPillX + webPillWidth / 2,
    webPillY + 4.2,
    { align: "center" }
  );
  doc.link(webPillX, webPillY, webPillWidth, webPillHeight, { url: "https://www.infosistel.com.pe/" });

  // Right Header Box (Quotation Details Card)
  const headerBoxWidth = 72;
  const headerBoxHeight = 27;
  const headerBoxX = pageWidth - 14 - headerBoxWidth;
  const headerBoxY = 10;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...brandPrimary);
  doc.setLineWidth(0.5);
  doc.roundedRect(headerBoxX, headerBoxY, headerBoxWidth, headerBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...brandPrimary);
  doc.text("COTIZACIÓN COMERCIAL", headerBoxX + headerBoxWidth / 2, headerBoxY + 6.5, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brandDark);
  doc.text(normalizePdfText(data.code), headerBoxX + headerBoxWidth / 2, headerBoxY + 12.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedGray);
  doc.text(`Fecha de emisión: ${formatDate(data.issueDate)}`, headerBoxX + 6, headerBoxY + 18);
  doc.text(`Válido hasta: ${addDays(data.issueDate, data.validDays)}`, headerBoxX + 6, headerBoxY + 22);
  doc.text(
    `Moneda: ${data.currency === "USD" ? "Dólares ($)" : "Soles (S/.)"}`,
    headerBoxX + 6,
    headerBoxY + 25.5
  );

  // Customer Information Box
  const clientBoxY = 40;
  const clientBoxHeight = 22;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, clientBoxY, pageWidth - 28, clientBoxHeight, 2, 2, "FD");

  // Left Column of Client Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...brandDark);
  doc.text("CLIENTE / RAZÓN SOCIAL:", 18, clientBoxY + 5.5);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfText(data.clientName || "Cliente Varios"), 57, clientBoxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.text(`${normalizePdfText(data.clientDocType || "DOC")}:`, 18, clientBoxY + 11);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfText(data.clientDocNum || "Sin documento"), 57, clientBoxY + 11);

  doc.setFont("helvetica", "bold");
  doc.text("DIRECCIÓN:", 18, clientBoxY + 16.5);
  doc.setFont("helvetica", "normal");
  const addressText = normalizePdfText(data.clientAddress || "Huancayo");
  const addressLines = doc.splitTextToSize(addressText, 54);
  doc.text(addressLines, 57, clientBoxY + 16.5);

  // Right Column of Client Info
  const rightColX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("ATENCIÓN:", rightColX, clientBoxY + 5.5);
  doc.setFont("helvetica", "normal");
  const attentionText = normalizePdfText(data.attentionTo || data.clientName || "-");
  doc.text(doc.splitTextToSize(attentionText, 50), rightColX + 22, clientBoxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.text("TELÉFONO:", rightColX, clientBoxY + 11);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfText(data.clientPhone || "-"), rightColX + 22, clientBoxY + 11);

  doc.setFont("helvetica", "bold");
  doc.text("CORREO:", rightColX, clientBoxY + 16.5);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfText(data.clientEmail || "-"), rightColX + 22, clientBoxY + 16.5);

  // Items Table
  const tableRows = data.items.map((it, idx) => {
    let desc = normalizePdfText(it.description);
    if (it.brand || it.model) {
      const extra = [normalizePdfText(it.brand), normalizePdfText(it.model)].filter(Boolean).join(" - ");
      desc += `\nMarca/Modelo: ${extra}`;
    }
    if (it.notes) {
      desc += `\nNota: ${normalizePdfText(it.notes)}`;
    }
    return [
      (idx + 1).toString(),
      it.quantity.toString(),
      desc,
      `${currSymbol} ${it.unitPrice.toFixed(2)}`,
      `${currSymbol} ${it.total.toFixed(2)}`,
    ];
  });

  safeRunAutoTable(doc, {
    startY: clientBoxY + clientBoxHeight + 5,
    head: [["#", "Cant.", "Descripción del Producto / Servicio", "P. Unitario", "Importe"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [10, 95, 219],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 13, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 115, overflow: "linebreak" },
      3: { cellWidth: 23, halign: "right" },
      4: { cellWidth: 23, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // Calculate totals section Y
  let currentY = (doc as any).lastAutoTable?.finalY ?? 140;

  // If table ended too close to bottom, add a new page
  if (currentY + 86 > pageHeight - 15) {
    doc.addPage();
    currentY = 18;
  } else {
    currentY += 4;
  }

  // Amount in words
  const wordsText = numberToSpanishWords(data.total, data.currency);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...mutedGray);
  doc.text(wordsText, 14, currentY + 3);

  // Totals Box on Right
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - 14 - totalsBoxWidth;
  const totalsBoxY = currentY + 6;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, 23, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...brandDark);
  doc.text("SUBTOTAL:", totalsBoxX + 4, totalsBoxY + 5);
  doc.text(`${currSymbol} ${data.subtotal.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 5, {
    align: "right",
  });

  if ((data.discount ?? 0) > 0) {
    doc.text("DESCUENTO:", totalsBoxX + 4, totalsBoxY + 9.5);
    doc.setTextColor(220, 38, 38);
    doc.text(
      `-${currSymbol} ${(data.discount ?? 0).toFixed(2)}`,
      totalsBoxX + totalsBoxWidth - 4,
      totalsBoxY + 9.5,
      { align: "right" }
    );
    doc.setTextColor(...brandDark);
  }

  const igvRateText = data.igvPercent !== undefined ? `${data.igvPercent}%` : "18%";
  const igvLabel = data.includeIgv ? `I.G.V. (${igvRateText}):` : "I.G.V. (Exonerado):";
  doc.text(igvLabel, totalsBoxX + 4, totalsBoxY + 14);
  doc.text(`${currSymbol} ${data.igv.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 14, {
    align: "right",
  });

  // Final Total Highlight
  doc.setFillColor(...brandPrimary);
  doc.roundedRect(totalsBoxX + 2, totalsBoxY + 16.5, totalsBoxWidth - 4, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL GENERAL:", totalsBoxX + 4, totalsBoxY + 20.5);
  doc.text(
    `${currSymbol} ${data.total.toFixed(2)}`,
    totalsBoxX + totalsBoxWidth - 4,
    totalsBoxY + 20.5,
    { align: "right" }
  );

  // Commercial Terms & Bank Accounts (2 boxes)
  const halfWidth = (pageWidth - 28 - 4) / 2;
  const innerTextWidth = halfWidth - 8;

  // Split notes to size without ANY slicing or truncation
  let noteLines: string[] = [];
  if (data.notes && data.notes.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    noteLines = doc.splitTextToSize(`• Obs: ${normalizePdfText(data.notes.trim())}`, innerTextWidth);
  }

  // Dynamic box height based on actual notes content
  const notesExtraHeight = noteLines.length > 0 ? noteLines.length * 3.3 + 1.5 : 0;
  const infoBoxesHeight = Math.max(36, 26 + notesExtraHeight);

  // If infoBoxes and visitBox exceed page, move them to a new page cleanly
  let infoBoxesY = totalsBoxY + 26;
  if (infoBoxesY + infoBoxesHeight + 28 > pageHeight - 12) {
    doc.addPage();
    infoBoxesY = 16;
  }

  // Box 1: Commercial Conditions
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, infoBoxesY, halfWidth, infoBoxesHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...brandPrimary);
  doc.text("CONDICIONES COMERCIALES", 18, infoBoxesY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...brandDark);
  doc.text(`• Validez de oferta: ${data.validDays} días cal. (o hasta agotar stock)`, 18, infoBoxesY + 9.5);
  doc.text(`• Plazo de entrega: ${normalizePdfText(data.deliveryTime || "Inmediata / según stock")}`, 18, infoBoxesY + 14);
  doc.text(`• Forma de pago: ${normalizePdfText(data.paymentMethod || "Contado / Depósito / Transferencia")}`, 18, infoBoxesY + 18.5);
  doc.text(`• Garantía: ${normalizePdfText(data.warranty || "12 meses de garantía oficial Infosistel")}`, 18, infoBoxesY + 23);

  if (noteLines.length > 0) {
    doc.setFontSize(6.2);
    doc.setTextColor(...brandDark);
    let noteY = infoBoxesY + 27;
    for (const nLine of noteLines) {
      doc.text(nLine, 18, noteY);
      noteY += 3.3;
    }
  }

  // Box 2: Bank Accounts
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14 + halfWidth + 4, infoBoxesY, halfWidth, infoBoxesHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...brandPrimary);
  doc.text("DEPÓSITOS A CUENTAS BANCARIAS", 18 + halfWidth + 4, infoBoxesY + 4.8);

  // Banco de la Nación
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.0);
  doc.setTextColor(...brandDark);
  doc.text("• BANCO DE LA NACIÓN (Cta. Corriente Soles):", 18 + halfWidth + 4, infoBoxesY + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.text("  Cta: 00-381-139530  |  CCI: 018-381-000381139530-44", 18 + halfWidth + 4, infoBoxesY + 11.9);
  doc.setTextColor(...mutedGray);
  doc.text("  Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL", 18 + halfWidth + 4, infoBoxesY + 14.7);

  // Interbank Soles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.0);
  doc.setTextColor(...brandDark);
  doc.text("• INTERBANK SOLES (Cuenta Negocios):", 18 + halfWidth + 4, infoBoxesY + 18.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.text("  Cta: 5003008920133  |  CCI: 00350000300892013366", 18 + halfWidth + 4, infoBoxesY + 21.3);

  // Interbank Dólares
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.0);
  doc.setTextColor(...brandDark);
  doc.text("• INTERBANK DÓLARES (Cuenta Negocios):", 18 + halfWidth + 4, infoBoxesY + 24.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.text("  Cta: 5003008920140  |  CCI: 00350000300892014061", 18 + halfWidth + 4, infoBoxesY + 27.9);

  // Yape / Plin
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.0);
  doc.setTextColor(...brandPrimary);
  doc.text("• Yape / Plin: 900 000 000 (Laboratorio INFOSISTEL / Infosistel)", 18 + halfWidth + 4, infoBoxesY + 31.8);

  // Box 3: Company Location & Contact ("Visítanos en Huancayo y en nuestra Web")
  const visitBoxY = infoBoxesY + infoBoxesHeight + 2.5;
  const visitBoxWidth = pageWidth - 28;
  const visitBoxHeight = 26;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, visitBoxY, visitBoxWidth, visitBoxHeight, 2, 2, "FD");

  // Title with brand primary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...brandPrimary);
  doc.text("VISÍTANOS EN NUESTRAS TIENDAS EN HUANCAYO", 18, visitBoxY + 5);

  // Left Column: Dirección
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...brandDark);
  doc.text("Dirección:", 18, visitBoxY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...brandDark);
  doc.text("• Av. Giráldez 274, Semisótano Stand S25, Huancayo", 18, visitBoxY + 12.8);
  doc.text("• Av. Giráldez 274, 1er Nivel Stand B-10, Huancayo", 18, visitBoxY + 16.5);

  // Right Column: Teléfono, Correo, Horario
  const visitCol2X = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...brandDark);
  doc.text("Teléfono / WhatsApp:", visitCol2X, visitBoxY + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("+51 900 000 000", visitCol2X + 28, visitBoxY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("Correo electrónico:", visitCol2X, visitBoxY + 12.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(COMPANY_EMAIL, visitCol2X + 28, visitBoxY + 12.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("Horario de atención:", visitCol2X, visitBoxY + 16.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Lun. a sáb., 9:00 am – 7:00 pm", visitCol2X + 28, visitBoxY + 16.5);

  // Pleasant Web Banner bar inside visit box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, visitBoxY + 19.5, visitBoxWidth - 2, 5.2, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...brandPrimary);
  doc.text(
    "¡Visítanos en https://www.infosistel.com.pe/! Explora nuestro catálogo tecnológico y cotiza online.",
    visitBoxWidth / 2 + 14,
    visitBoxY + 23.2,
    { align: "center" }
  );
  doc.link(15, visitBoxY + 19.5, visitBoxWidth - 2, 5.2, { url: "https://www.infosistel.com.pe/" });

  // ----------------------------------------------------
  // ANEXO FOTOGRÁFICO / IMÁGENES DE REFERENCIA ADJUNTAS
  // ----------------------------------------------------
  if (data.images && data.images.length > 0) {
    interface LoadedPhotoItem {
      dataUrl: string;
      productName: string;
      brandModel: string;
      priceText: string;
      itemNumber?: number;
    }

    const loadedPhotos: LoadedPhotoItem[] = [];
    const usedItemIndices = new Set<number>();

    for (let imgIdx = 0; imgIdx < data.images.length; imgIdx++) {
      const rawImg = data.images[imgIdx];
      if (rawImg && typeof rawImg === "string" && rawImg.trim()) {
        const trimmed = rawImg.trim();
        const loaded = await loadImageDataUrl(trimmed);
        if (loaded) {
          // Find matching item by image path
          let itemIdx = -1;
          if (data.items) {
            itemIdx = data.items.findIndex(
              (it, idx) => !usedItemIndices.has(idx) && it.image && it.image.trim() === trimmed
            );
            // If not found by exact image path, match by index if item exists
            if (itemIdx === -1 && data.items[imgIdx] && !usedItemIndices.has(imgIdx)) {
              itemIdx = imgIdx;
            }
          }

          let matchedItem: QuotationPdfItem | undefined;
          if (itemIdx !== -1 && data.items) {
            matchedItem = data.items[itemIdx];
            usedItemIndices.add(itemIdx);
          }

          const productName =
            matchedItem?.description?.trim() || `Producto / Servicio #${imgIdx + 1}`;
          const brandModel = [matchedItem?.brand?.trim(), matchedItem?.model?.trim()]
            .filter(Boolean)
            .join(" · ");
          const priceText =
            matchedItem && matchedItem.unitPrice > 0
              ? `${currSymbol} ${matchedItem.unitPrice.toFixed(2)}`
              : "";

          loadedPhotos.push({
            dataUrl: loaded,
            productName,
            brandModel,
            priceText,
            itemNumber: itemIdx !== -1 ? itemIdx + 1 : imgIdx + 1,
          });
        }
      }
    }

    if (loadedPhotos.length > 0) {
      const IMAGES_PER_PAGE = 4;
      const totalAnnexPages = Math.ceil(loadedPhotos.length / IMAGES_PER_PAGE);

      for (let pIdx = 0; pIdx < totalAnnexPages; pIdx++) {
        doc.addPage("a4", "portrait");

        // Top Header of Annex Page
        try {
          doc.addImage(INFOSISTEL_LOGO_BASE64, "PNG", 14, 10, 48, 5.8);
        } catch {
          doc.setTextColor(...brandPrimary);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("INFOSISTEL", 14, 15);
        }

        doc.setTextColor(...brandDark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.text("INFORMÁTICA · SISTEMAS · TELECOMUNICACIONES", 14, 19.5);

        // Header Annex Title Box on the right
        const annexBoxX = pageWidth - 80;
        doc.setFillColor(...lightBg);
        doc.setDrawColor(...brandPrimary);
        doc.setLineWidth(0.4);
        doc.roundedRect(annexBoxX, 8, 66, 15, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...brandPrimary);
        doc.text("ANEXO FOTOGRÁFICO", annexBoxX + 33, 13, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(...brandDark);
        doc.text(`COTIZACIÓN: ${data.code}`, annexBoxX + 33, 17.5, { align: "center" });

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...mutedGray);
        const displayClient = normalizePdfText(
          data.clientName.length > 28 ? data.clientName.slice(0, 26) + "..." : data.clientName
        );
        doc.text(`Cliente: ${displayClient}`, annexBoxX + 33, 21, { align: "center" });

        // Decorative Banner
        const bannerY = 25.5;
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.setLineWidth(0.2);
        doc.roundedRect(14, bannerY, pageWidth - 28, 6.5, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(...brandPrimary);
        doc.text(
          "FOTOGRAFÍAS Y REFERENCIAS VISUALES DE LOS PRODUCTOS O SERVICIOS COTIZADOS",
          pageWidth / 2,
          bannerY + 4.3,
          { align: "center" }
        );

        // 2x2 Grid of Cards
        const cardW = 88;
        const cardH = 114;
        const gapX = 6;
        const gapY = 6;
        const startGridY = 34.5;

        const pagePhotos = loadedPhotos.slice(
          pIdx * IMAGES_PER_PAGE,
          (pIdx + 1) * IMAGES_PER_PAGE
        );

        for (let i = 0; i < pagePhotos.length; i++) {
          const photo = pagePhotos[i];
          const globalIdx = pIdx * IMAGES_PER_PAGE + i + 1;
          const col = i % 2;
          const row = Math.floor(i / 2);

          const cardX = 14 + col * (cardW + gapX);
          const cardY = startGridY + row * (cardH + gapY);

          // Card Background
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...cardBorder);
          doc.setLineWidth(0.3);
          doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, "FD");

          // Header inside card
          doc.setFillColor(...lightBg);
          doc.roundedRect(cardX + 0.3, cardY + 0.3, cardW - 0.6, 7.2, 2.2, 2.2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.8);
          doc.setTextColor(...brandPrimary);
          doc.text(`FOTOGRAFÍA 0${globalIdx}`, cardX + 3.5, cardY + 5.0);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.0);
          doc.setTextColor(...mutedGray);
          doc.text(`Ítem #${photo.itemNumber}`, cardX + cardW - 3.5, cardY + 5.0, { align: "right" });

          // Caption Box at bottom of card
          const captionH = 17;
          const captionY = cardY + cardH - captionH - 1.5;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.roundedRect(cardX + 2.5, captionY, cardW - 5, captionH, 1.5, 1.5, "FD");

          // Product Name inside Caption Box
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(15, 23, 42);
          const maxTextWidth = cardW - 9;
          const nameLines = doc.splitTextToSize(normalizePdfText(photo.productName), maxTextWidth);
          doc.text(nameLines.slice(0, 2), cardX + 4.5, captionY + 4.5);

          // Brand, Model and Price
          const bottomLineY = captionY + 13.2;
          if (photo.brandModel) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.8);
            doc.setTextColor(...brandPrimary);
            const bmText = normalizePdfText(photo.brandModel);
            doc.text(bmText.length > 32 ? bmText.slice(0, 30) + "…" : bmText, cardX + 4.5, bottomLineY);
          }

          if (photo.priceText) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.2);
            doc.setTextColor(5, 150, 105);
            doc.text(photo.priceText, cardX + cardW - 4.5, bottomLineY, { align: "right" });
          }

          // Photo boundary inside card
          const innerX = cardX + 3.5;
          const innerY = cardY + 8.5;
          const innerW = cardW - 7;
          const innerH = captionY - innerY - 2;

          const dataUrl = photo.dataUrl;
          try {
            const imgProps = doc.getImageProperties(dataUrl);
            const naturalW = imgProps.width || 1;
            const naturalH = imgProps.height || 1;
            const aspect = naturalW / naturalH;

            let drawW = innerW;
            let drawH = innerW / aspect;

            if (drawH > innerH) {
              drawH = innerH;
              drawW = innerH * aspect;
            }

            const drawX = innerX + (innerW - drawW) / 2;
            const drawY = innerY + (innerH - drawH) / 2;

            doc.addImage(dataUrl, "JPEG", drawX, drawY, drawW, drawH);
          } catch (imgErr) {
            console.warn("Error adding image to PDF:", imgErr);
            doc.setTextColor(...mutedGray);
            doc.setFontSize(7);
            doc.text("Imagen no disponible", innerX + innerW / 2, innerY + innerH / 2, {
              align: "center",
            });
          }
        }
      }
    }
  }

  // Page Numbers and Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...mutedGray);
    const footerText =
      "Infosistel · Informática · Sistemas · Telecomunicaciones · Visítanos en https://www.infosistel.com.pe/";
    doc.text(footerText, 14, pageHeight - 6);
    doc.link(14, pageHeight - 9, 140, 5, { url: "https://www.infosistel.com.pe/" });
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }

  const cleanCode = data.code.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Cotizacion_INFOSISTEL_${cleanCode}.pdf`;
  safeSavePdf(doc, filename);
  return doc;
}
