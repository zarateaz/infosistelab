/** Plain utils, deliberately outside actions.ts: that file is "use server",
 *  and every export from a "use server" file must be an async Server
 *  Action — a synchronous helper like this one isn't allowed to live
 *  there (same reason caja/month.ts is a separate file). This also means
 *  these constant arrays (not just functions) have to live here too, not
 *  in actions.ts — a plain `export const X = [...]` there fails the build
 *  with "A 'use server' file can only export async functions". */

export const PAYMENT_METHODS = ["EFECTIVO", "YAPE", "PARCIAL", "PENDIENTE"] as const;
export const PAY_NOW_METHODS = ["EFECTIVO", "YAPE"] as const;
export const EQUIPMENT_STAGES = ["RECIBIDO", "REPARANDO", "LISTO", "ENTREGADO"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PayNowMethod = (typeof PAY_NOW_METHODS)[number];
export type EquipmentStage = (typeof EQUIPMENT_STAGES)[number];
export type PaymentStatus = "PAGADO" | "PARCIAL" | "PENDIENTE";

export const EQUIPMENT_STAGE_LABELS: Record<string, string> = {
  RECIBIDO: "Recibido",
  REPARANDO: "En reparación",
  LISTO: "Listo para entrega",
  ENTREGADO: "Entregado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "💵 Efectivo",
  YAPE: "📱 Yape",
  PARCIAL: "🔄 Pago parcial",
  PENDIENTE: "⏳ Pendiente",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAGADO: "Pagado",
  PARCIAL: "Parcial",
  PENDIENTE: "Pendiente",
};

/** Saldo pendiente de un servicio en pago parcial — 0 para cualquier otro
 *  estado. Un solo lugar para esta cuenta: dashboard, pendientes de cobro,
 *  la celda de pago en la tabla y el detalle todos la necesitan igual. */
export function pendingBalance(s: { paymentStatus: string; amount: number; advanceAmount: number | null }): number {
  if (s.paymentStatus === "PARCIAL") return Math.max(s.amount - (s.advanceAmount ?? 0), 0);
  if (s.paymentStatus === "PENDIENTE") return s.amount;
  return 0;
}

export function formatSoles(n: number): string {
  return `S/. ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "17 sep 2026" — UTC getters, not local: serviceDate/deliveryDate are
 *  calendar days with no time-of-day (see caja/month.ts's dateToInputValue
 *  for why local getters here would show the wrong day on a machine in a
 *  different time zone than whichever one wrote the record). */
export function formatFecha(date: Date): string {
  const d = new Date(date);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
