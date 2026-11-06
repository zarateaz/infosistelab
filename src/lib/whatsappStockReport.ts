export const COMPANY_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "51900000000";

export interface LowStockProductItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price?: number;
}

/**
 * Builds the official WhatsApp click-to-chat URL with pre-encoded message.
 */
export function buildWhatsAppLink(message: string, phone = COMPANY_WHATSAPP_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an executive WhatsApp report for all products with critical or low stock.
 */
export function generateStockReportMessage(products: LowStockProductItem[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const critical = products.filter((p) => p.stock === 1);
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 1 && p.stock <= 3);

  const sections: string[] = [];

  sections.push(`🚨 *INFOSISTEL - REPORTE DE STOCK BAJO* 🚨`);
  sections.push(`📅 *Fecha:* ${dateStr} - ${timeStr}`);
  sections.push(`🏢 *Control de Inventario y Ventas*`);
  sections.push(`----------------------------------------`);

  if (critical.length > 0) {
    sections.push(`⚠️ *STOCK CRÍTICO (SOLO 1 UNIDAD RESTANTE):*`);
    critical.forEach((p) => {
      const priceText = p.price != null ? ` · S/. ${p.price.toFixed(2)}` : "";
      sections.push(`• *${p.name.trim()}*`);
      sections.push(`   └ Cat: ${p.category} | Queda: *1 unid.*${priceText}`);
    });
    sections.push(``);
  }

  if (outOfStock.length > 0) {
    sections.push(`⛔ *PRODUCTOS AGOTADOS (STOCK 0):*`);
    outOfStock.forEach((p) => {
      sections.push(`• *${p.name.trim()}* (${p.category}) - *0 unid.*`);
    });
    sections.push(``);
  }

  if (lowStock.length > 0) {
    sections.push(`🟡 *STOCK BAJO (2 A 3 UNIDADES):*`);
    lowStock.forEach((p) => {
      sections.push(`• *${p.name.trim()}* - Stock: *${p.stock} unid.*`);
    });
    sections.push(``);
  }

  if (critical.length === 0 && outOfStock.length === 0 && lowStock.length === 0) {
    sections.push(`✅ *Todos los productos tienen stock saludable.*`);
  } else {
    sections.push(`----------------------------------------`);
    sections.push(`📊 *Total en alerta:* ${products.length} producto(s)`);
    sections.push(`⚠️ *Acción requerida:* Gestionar compras con proveedores.`);
  }

  return sections.join("\n");
}

/**
 * Generates an instant WhatsApp message for a single product that just reached critical stock (<= 1).
 */
export function generateSingleProductStockAlertMessage(
  productName: string,
  remainingStock: number,
  category?: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-PE", { dateStyle: "short" });
  const timeStr = now.toLocaleTimeString("es-PE", { timeStyle: "short" });

  const isOne = remainingStock === 1;
  const isZero = remainingStock <= 0;

  return [
    `🚨 *ALERTA INMEDIATA DE STOCK - INFOSISTEL*`,
    `📅 ${dateStr} - ${timeStr}`,
    `----------------------------------------`,
    `📦 *Producto:* ${productName}`,
    category ? `📁 *Categoría:* ${category}` : null,
    isOne
      ? `⚠️ *ESTADO:* ¡QUEDA SOLO 1 UNIDAD DISPONIBLE!`
      : isZero
        ? `⛔ *ESTADO:* ¡PRODUCTO AGOTADO (0 UNIDADES)!`
        : `🟡 *ESTADO:* Stock bajo (${remainingStock} unidades restantes)`,
    `----------------------------------------`,
    `_Favor tramitar pedido de reposición a la brevedad._`,
  ]
    .filter(Boolean)
    .join("\n");
}
