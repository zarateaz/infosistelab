// Orden y set exactos del dropdown real usado en la hoja de cálculo del
// negocio (Yape/Plin/Transferencia/Efectivo/Depósito/Otro) — específico de
// Cuentas por Cobrar/Pagar, no toca los métodos de Caja (EFECTIVO/YAPE 1/YAPE 2).
export const PAYMENT_METHODS = ["YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "DEPÓSITO", "OTRO"] as const;

export const DOCUMENT_TYPES = ["FACTURA", "BOLETA", "SIN COMPROBANTE"] as const;

export type AccountStatus = "PAGADO" | "VENCIDO" | "POR VENCER" | "PENDIENTE";

// "Por vencer" is a heads-up window, not a real state change — a due date
// inside the next 5 days gets flagged before it actually lapses into VENCIDO.
const UPCOMING_WINDOW_DAYS = 5;

export function computeStatus(saldo: number, dueDate: Date, today: Date = new Date()): AccountStatus {
  if (saldo <= 0) return "PAGADO";
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000);
  if (diffDays > 0) return "VENCIDO";
  if (diffDays >= -UPCOMING_WINDOW_DAYS) return "POR VENCER";
  return "PENDIENTE";
}

export function overdueDays(dueDate: Date, today: Date = new Date()): number {
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000);
  return diffDays > 0 ? diffDays : 0;
}

export const STATUS_STYLES: Record<AccountStatus, string> = {
  PAGADO: "bg-accent/10 text-accent",
  VENCIDO: "bg-red-50 text-red-600",
  "POR VENCER": "bg-amber-50 text-amber-600",
  PENDIENTE: "bg-fg-muted/10 text-fg-muted",
};
