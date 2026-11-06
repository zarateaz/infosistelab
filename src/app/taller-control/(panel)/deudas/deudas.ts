/** Helpers puros del módulo Deudas (sin "use server": se usan también en el cliente).
 *
 *  Modelo: cada obligación (Debt) vence un día fijo de cada mes (dueDay) entre
 *  startMonth y endMonth. Un período "YYYY-MM" está PAGADO si tiene un
 *  DebtPayment; si no, su estado depende de cuántos días faltan para su fecha
 *  de vencimiento. Todas las fechas viajan como strings "YYYY-MM-DD" para que
 *  el servidor (UTC) y el navegador (Lima) calculen exactamente lo mismo. */

export const DEBT_CATEGORIES = [
  "IMPUESTOS",
  "ALQUILER",
  "PERSONAL",
  "SERVICIOS",
  "INTERNET",
  "CELULAR",
  "DEFENSA_CIVIL",
  "PRESTAMOS",
  "OTROS",
] as const;
export type DebtCategory = (typeof DEBT_CATEGORIES)[number];

export const CATEGORY_INFO: Record<
  DebtCategory,
  { label: string; hint: string; chip: string; dot: string; bar: string }
> = {
  IMPUESTOS: {
    label: "Impuestos",
    hint: "SUNAT, AFP, EsSalud",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30",
    dot: "bg-rose-500",
    bar: "#f43f5e",
  },
  ALQUILER: {
    label: "Alquiler",
    hint: "Locales y stands",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    dot: "bg-amber-500",
    bar: "#f59e0b",
  },
  PERSONAL: {
    label: "Personal",
    hint: "Contador, sueldos, part time",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/30",
    dot: "bg-violet-500",
    bar: "#8b5cf6",
  },
  SERVICIOS: {
    label: "Luz y servicios",
    hint: "Luz, agua, CNG",
    chip: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-yellow-500/30",
    dot: "bg-yellow-500",
    bar: "#eab308",
  },
  INTERNET: {
    label: "Internet fijo",
    hint: "Claro, WIN, Cable Red, FOP, Movistar",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30",
    dot: "bg-blue-500",
    bar: "#3b82f6",
  },
  CELULAR: {
    label: "Celulares",
    hint: "Entel, Claro",
    chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-cyan-500/30",
    dot: "bg-cyan-500",
    bar: "#06b6d4",
  },
  DEFENSA_CIVIL: {
    label: "Defensa Civil",
    hint: "ITSE, licencias",
    chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/30",
    dot: "bg-orange-500",
    bar: "#f97316",
  },
  PRESTAMOS: {
    label: "Préstamos",
    hint: "Cuotas de créditos",
    chip: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30",
    dot: "bg-fuchsia-500",
    bar: "#d946ef",
  },
  OTROS: {
    label: "Otros",
    hint: "Cualquier otra obligación",
    chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/30",
    dot: "bg-slate-500",
    bar: "#64748b",
  },
};

export function isDebtCategory(v: string): v is DebtCategory {
  return (DEBT_CATEGORIES as readonly string[]).includes(v);
}

/** Medios con los que se paga una deuda. Los 3 primeros son los de Caja: solo
 *  con ellos se puede registrar el egreso automático en Caja. */
export const DEBT_PAYMENT_METHODS = ["EFECTIVO", "YAPE 1", "YAPE 2", "TRANSFERENCIA", "AGENTE / QR", "OTRO"] as const;
export type DebtPaymentMethod = (typeof DEBT_PAYMENT_METHODS)[number];
export const CASHBOX_COMPATIBLE_METHODS = ["EFECTIVO", "YAPE 1", "YAPE 2"] as const;

export function isCashboxMethod(m: string): m is (typeof CASHBOX_COMPATIBLE_METHODS)[number] {
  return (CASHBOX_COMPATIBLE_METHODS as readonly string[]).includes(m);
}

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
export const MONTH_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"] as const;

// ─── Tipos serializables (servidor → cliente) ──────────────────────────────

export interface DebtPaymentRow {
  id: string;
  period: string; // "YYYY-MM"
  amount: number;
  paidAt: string; // "YYYY-MM-DD"
  method: string;
  note: string | null;
  inCashbox: boolean;
}

export interface DebtRow {
  id: string;
  name: string;
  category: DebtCategory;
  payee: string | null;
  location: string | null;
  reference: string | null;
  payTo: string | null;
  phone: string | null;
  dueDay: number;
  amount: number;
  isVariable: boolean;
  startMonth: string;
  endMonth: string | null;
  notes: string | null;
  active: boolean;
  payments: DebtPaymentRow[];
}

export type DebtStatus = "PAGADO" | "VENCIDO" | "POR_VENCER" | "PENDIENTE" | "NO_APLICA";

export interface PeriodState {
  period: string;
  status: DebtStatus;
  dueDate: string; // "YYYY-MM-DD"
  daysLeft: number; // negativo = vencido hace N días
  expected: number; // monto esperado (referencial)
  payment: DebtPaymentRow | null;
}

/** Días antes del vencimiento a partir de los cuales se avisa "por vencer". */
export const DUE_SOON_DAYS = 5;

// ─── Utilidades de meses / fechas (todo en strings, sin zonas horarias) ────

export function isPeriod(v: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function periodOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function periodLabel(period: string, short = false): string {
  const [y, m] = period.split("-").map(Number);
  return short ? `${MONTH_SHORT[m - 1]} ${y}` : `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Lista inclusiva de períodos entre `from` y `to`. */
export function periodRange(from: string, to: string): string[] {
  const out: string[] = [];
  let p = from;
  let guard = 0;
  while (p <= to && guard++ < 600) {
    out.push(p);
    p = shiftPeriod(p, 1);
  }
  return out;
}

export function lastDayOfPeriod(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Fecha de vencimiento del período; un día 31 en febrero cae el 28/29. */
export function dueDateFor(period: string, dueDay: number): string {
  const day = Math.min(Math.max(1, dueDay), lastDayOfPeriod(period));
  return `${period}-${String(day).padStart(2, "0")}`;
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function money(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dueText(days: number): string {
  if (days < 0) return `Venció hace ${-days} día${days === -1 ? "" : "s"}`;
  if (days === 0) return "Vence HOY";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
}

// ─── Estado de cada período ────────────────────────────────────────────────

export function appliesTo(debt: Pick<DebtRow, "startMonth" | "endMonth">, period: string): boolean {
  if (period < debt.startMonth) return false;
  if (debt.endMonth && period > debt.endMonth) return false;
  return true;
}

export function periodState(debt: DebtRow, period: string, today: string): PeriodState {
  const dueDate = dueDateFor(period, debt.dueDay);
  const daysLeft = daysBetween(today, dueDate);
  const payment = debt.payments.find((p) => p.period === period) ?? null;
  const base = { period, dueDate, daysLeft, expected: debt.amount, payment };

  if (payment) return { ...base, status: "PAGADO" };
  if (!appliesTo(debt, period) || !debt.active) return { ...base, status: "NO_APLICA" };
  if (daysLeft < 0) return { ...base, status: "VENCIDO" };
  if (daysLeft <= DUE_SOON_DAYS) return { ...base, status: "POR_VENCER" };
  return { ...base, status: "PENDIENTE" };
}

/** Meses anteriores a `period` que siguen sin pagarse (deuda arrastrada). */
export function arrearsBefore(debt: DebtRow, period: string, today: string): PeriodState[] {
  if (!debt.active || debt.startMonth >= period) return [];
  const last = shiftPeriod(period, -1);
  const to = debt.endMonth && debt.endMonth < last ? debt.endMonth : last;
  return periodRange(debt.startMonth, to)
    .map((p) => periodState(debt, p, today))
    .filter((s) => s.status === "VENCIDO");
}

export interface MonthSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  overdueCount: number;
  dueSoonCount: number;
  paidCount: number;
  applicableCount: number;
  arrears: number; // deuda acumulada de meses anteriores
  arrearsCount: number;
  byCategory: { category: DebtCategory; total: number; paid: number }[];
}

export function summarizeMonth(debts: DebtRow[], period: string, today: string): MonthSummary {
  const s: MonthSummary = {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    paidCount: 0,
    applicableCount: 0,
    arrears: 0,
    arrearsCount: 0,
    byCategory: [],
  };
  const cat = new Map<DebtCategory, { total: number; paid: number }>();

  for (const d of debts) {
    const st = periodState(d, period, today);
    if (st.status === "NO_APLICA") continue;
    const paidAmount = st.payment?.amount ?? 0;
    const lineTotal = st.payment ? paidAmount : d.amount;
    s.applicableCount++;
    s.total += lineTotal;
    const c = cat.get(d.category) ?? { total: 0, paid: 0 };
    c.total += lineTotal;
    if (st.status === "PAGADO") {
      s.paid += paidAmount;
      s.paidCount++;
      c.paid += paidAmount;
    } else {
      s.pending += d.amount;
      if (st.status === "VENCIDO") {
        s.overdue += d.amount;
        s.overdueCount++;
      } else if (st.status === "POR_VENCER") s.dueSoonCount++;
    }
    cat.set(d.category, c);

    for (const a of arrearsBefore(d, period, today)) {
      s.arrears += a.expected;
      s.arrearsCount++;
    }
  }

  s.byCategory = DEBT_CATEGORIES.filter((k) => cat.has(k)).map((k) => ({ category: k, ...cat.get(k)! }));
  return s;
}

/** Link de WhatsApp para enviar la constancia del pago al beneficiario. */
export function paymentWhatsappLink(debt: DebtRow, st: PeriodState): string | null {
  const digits = (debt.phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const phone = digits.length === 9 ? `51${digits}` : digits;
  const who = debt.payee ? `Hola ${debt.payee}` : "Hola";
  const text = st.payment
    ? `${who}, le saluda INFOSISTEL. Le confirmamos el pago de *${debt.name}* correspondiente a *${periodLabel(st.period)}* por *${money(st.payment.amount)}* (${st.payment.method}, ${fmtDate(st.payment.paidAt)}). ¡Gracias!`
    : `${who}, le saluda INFOSISTEL. Le escribimos por el pago de *${debt.name}* de *${periodLabel(st.period)}* (vence el ${fmtDate(st.dueDate)}).`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** "Hoy" en Lima como "YYYY-MM-DD" — el negocio opera en Perú aunque el VPS esté en UTC. */
export function todayInLima(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
