/** Helpers puros de la cobranza de internet (sin "use server": se usan también en el cliente). */

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MONTH_SHORT_NAMES = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OCT",
  "NOV",
  "DIC",
] as const;

export const ROUTERS = [
  "Router 1",
  "Router 2",
  "Router 3",
  "Router 4",
  "Router 5",
] as const;

export type RouterType = (typeof ROUTERS)[number];

export const TOTAL_SWITCH_PORTS = 16;
export const SWITCH_PORTS = Array.from({ length: TOTAL_SWITCH_PORTS }, (_, i) => i + 1); // 1..16

export interface MonthPaymentRecord {
  status: "paid" | "unpaid";
  paidAt?: string; // YYYY-MM-DD
  amount?: number;
  method?: string; // "YAPE" | "PLIN" | "EFECTIVO" | "TRANSFERENCIA" | "OTRO"
  note?: string;
}

export type PaidMonthsMap = Record<string, MonthPaymentRecord>; // Key: "YYYY-MM" (ej: "2026-01")

export interface InternetClientRow {
  id: string;
  clientCode?: string | null;
  clientName: string;
  whatsapp: string;
  galeria?: string | null;
  router?: string | null;
  portNumber?: number | null;
  startDate: string; // YYYY-MM-DD
  nextPaymentDate: string; // YYYY-MM-DD
  amount: number;
  concept: string | null;
  paidMonths?: string | null; // JSON string
}

/** Días hasta la fecha de pago, contando calendario (negativo = vencido). */
export function daysUntil(dateStr: string, today: Date = new Date()): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

export type CobranzaState = "vencido" | "hoy" | "pronto" | "ok";
/** Con cuántos días de anticipación se avisa en rojo. */
export const WARN_DAYS = 3;

export function cobranzaState(days: number): CobranzaState {
  if (days < 0) return "vencido";
  if (days === 0) return "hoy";
  if (days <= WARN_DAYS) return "pronto";
  return "ok";
}

export function whatsappLink(row: InternetClientRow, days: number): string {
  const monto = row.amount > 0 ? ` por S/. ${row.amount.toFixed(2)}` : "";
  const infoExtra = [
    row.galeria ? `Galería: ${row.galeria}` : null,
    row.router && row.portNumber ? `${row.router} - Pto ${row.portNumber}` : null,
    row.clientCode ? `Cód: ${row.clientCode}` : null,
  ].filter(Boolean).join(" · ");

  const conexionTxt = infoExtra ? ` (${infoExtra})` : "";

  const msg =
    days < 0
      ? `Hola ${row.clientName}, te escribimos de Infosistel Internet${conexionTxt}. Tu pago mensual del servicio${monto} venció hace ${-days} día(s). ¿Nos confirmas tu pago? Muchas gracias.`
      : days === 0
        ? `Hola ${row.clientName}, te escribimos de Infosistel Internet${conexionTxt}. Hoy vence tu pago mensual del servicio${monto}. Muchas gracias.`
        : `Hola ${row.clientName}, te recordamos de Infosistel Internet${conexionTxt} que tu pago mensual del servicio${monto} vence en ${days} día(s). Muchas gracias.`;
  return `https://wa.me/${row.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function directWhatsappLink(whatsapp: string, clientName?: string): string {
  const clean = whatsapp.replace(/\D/g, "");
  const number = clean.length === 9 ? `51${clean}` : clean;
  const msg = clientName
    ? `Hola ${clientName}, te saludamos de Infosistel Internet.`
    : `Hola, te saludamos del soporte de Infosistel Internet.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/**
 * Parsea el mapa de meses pagados o deriva el historial de pagos para clientes
 * existentes basándose en startDate y nextPaymentDate.
 */
export function parsePaidMonths(
  raw?: string | null,
  startDate?: string,
  nextPaymentDate?: string,
  defaultAmount: number = 0
): PaidMonthsMap {
  const result: PaidMonthsMap = {};

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as PaidMonthsMap;
      }
    } catch {
      // fallback a derivación
    }
  }

  // Derivación automática para clientes preexistentes
  if (startDate && nextPaymentDate) {
    const [sy, sm] = startDate.split("-").map(Number);
    const [ny, nm] = nextPaymentDate.split("-").map(Number);

    let cy = sy;
    let cm = sm;
    const endKey = `${ny}-${String(nm).padStart(2, "0")}`;

    while (true) {
      const key = `${cy}-${String(cm).padStart(2, "0")}`;
      if (key >= endKey) break;
      result[key] = {
        status: "paid",
        paidAt: `${cy}-${String(cm).padStart(2, "0")}-01`,
        amount: defaultAmount,
        note: "Registrado al inicio",
      };
      cm++;
      if (cm > 12) {
        cm = 1;
        cy++;
      }
      if (cy > ny + 2) break;
    }
  }

  return result;
}

/**
 * Calcula la próxima fecha de pago buscando el primer mes pendiente (unpaid).
 * Conserva el día original de corte de nextPaymentDate / startDate.
 */
export function calculateNextPaymentDate(
  startDate: string,
  currentNextPaymentDate: string,
  paidMonths: PaidMonthsMap
): string {
  const [, , origDay] = currentNextPaymentDate.split("-").map(Number);
  const [sy, sm] = startDate.split("-").map(Number);

  let cy = sy;
  let cm = sm;
  const maxYear = new Date().getFullYear() + 4;

  while (cy <= maxYear) {
    const key = `${cy}-${String(cm).padStart(2, "0")}`;
    const rec = paidMonths[key];
    if (!rec || rec.status !== "paid") {
      const lastDayOfMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
      const day = Math.min(origDay || 1, lastDayOfMonth);
      return `${cy}-${String(cm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    cm++;
    if (cm > 12) {
      cm = 1;
      cy++;
    }
  }

  const lastDay = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
  return `${cy}-${String(cm).padStart(2, "0")}-${String(Math.min(origDay || 1, lastDay)).padStart(2, "0")}`;
}

export interface MonthUIInfo {
  monthIndex: number; // 0..11
  monthNum: number; // 1..12
  monthName: string;
  monthShort: string;
  key: string; // "YYYY-MM"
  isPaid: boolean;
  paidAt?: string;
  amount?: number;
  method?: string;
  note?: string;
  isOverdue: boolean;
  isDueThisMonth: boolean;
  isAdvance: boolean;
  isFuture: boolean;
  badgeText: string;
  badgeStyle: "paid" | "advance" | "overdue" | "due" | "future";
}

/**
 * Obtiene la información para pintar los 12 meses (Enero a Diciembre) de un año dado.
 */
export function getYearMonthsInfo(
  year: number,
  paidMonths: PaidMonthsMap,
  today: Date = new Date(),
  clientAmount: number = 0
): {
  months: MonthUIInfo[];
  paidCount: number;
  advanceCount: number;
  overdueCount: number;
  totalCollected: number;
} {
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  let paidCount = 0;
  let advanceCount = 0;
  let overdueCount = 0;
  let totalCollected = 0;

  const months: MonthUIInfo[] = MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const key = `${year}-${String(monthNum).padStart(2, "0")}`;
    const rec = paidMonths[key];
    const isPaid = rec?.status === "paid";

    const isAdvance = isPaid && key > currentKey;
    const isOverdue = !isPaid && key < currentKey;
    const isDueThisMonth = !isPaid && key === currentKey;
    const isFuture = !isPaid && key > currentKey;

    if (isPaid) {
      paidCount++;
      totalCollected += rec?.amount ?? clientAmount;
      if (isAdvance) advanceCount++;
    } else if (isOverdue) {
      overdueCount++;
    }

    let badgeText = "Pendiente";
    let badgeStyle: MonthUIInfo["badgeStyle"] = "future";

    if (isAdvance) {
      badgeText = "Adelantado";
      badgeStyle = "advance";
    } else if (isPaid) {
      badgeText = "Pagado";
      badgeStyle = "paid";
    } else if (isOverdue) {
      badgeText = "Vencido";
      badgeStyle = "overdue";
    } else if (isDueThisMonth) {
      badgeText = "Por pagar";
      badgeStyle = "due";
    }

    return {
      monthIndex: idx,
      monthNum,
      monthName: name,
      monthShort: MONTH_SHORT_NAMES[idx],
      key,
      isPaid,
      paidAt: rec?.paidAt,
      amount: rec?.amount ?? clientAmount,
      method: rec?.method,
      note: rec?.note,
      isOverdue,
      isDueThisMonth,
      isAdvance,
      isFuture,
      badgeText,
      badgeStyle,
    };
  });

  return {
    months,
    paidCount,
    advanceCount,
    overdueCount,
    totalCollected,
  };
}
