"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dateToInputValue, parseDateInput } from "../caja/month";
import {
  calculateNextPaymentDate,
  parsePaidMonths,
  type InternetClientRow,
  type PaidMonthsMap,
} from "./cobranza";

const PATH = "/taller-control/cobranza-internet";

export async function getInternetClients(): Promise<InternetClientRow[]> {
  const rows = await prisma.internetClient.findMany({ orderBy: { nextPaymentDate: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    clientCode: r.clientCode,
    clientName: r.clientName,
    whatsapp: r.whatsapp,
    galeria: r.galeria,
    router: r.router,
    portNumber: r.portNumber,
    startDate: dateToInputValue(r.startDate),
    nextPaymentDate: dateToInputValue(r.nextPaymentDate),
    amount: r.amount,
    concept: r.concept,
    paidMonths: r.paidMonths,
  }));
}

/** Normaliza a dígitos con código de país: 9 dígitos => antepone 51 (Perú). */
function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 9 ? `51${digits}` : digits;
}

const clientSchema = z.object({
  clientCode: z
    .string()
    .trim()
    .max(50, "El código no puede superar 50 caracteres")
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase() : null)),
  clientName: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  whatsapp: z
    .string()
    .transform(normalizeWhatsapp)
    .refine((v) => v.length >= 9 && v.length <= 15, "WhatsApp inválido (9 dígitos, ej. 900000000)"),
  galeria: z
    .string()
    .trim()
    .max(120, "El nombre de la galería no puede superar 120 caracteres")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  router: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  portNumber: z.coerce
    .number()
    .min(1, "El puerto debe ser entre 1 y 16")
    .max(16, "El puerto debe ser entre 1 y 16")
    .optional()
    .nullable()
    .transform((v) => (v && v >= 1 && v <= 16 ? v : null)),
  startDate: z.string().refine((v) => parseDateInput(v) !== null, "Fecha de inicio inválida"),
  nextPaymentDate: z.string().refine((v) => parseDateInput(v) !== null, "Fecha de pago inválida"),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo").default(0),
  concept: z
    .string()
    .trim()
    .max(200, "El concepto no puede superar 200 caracteres")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export interface InternetFormState {
  error?: string;
}

export async function createInternetClient(
  _prev: InternetFormState,
  formData: FormData
): Promise<InternetFormState> {
  const parsed = clientSchema.safeParse({
    clientCode: formData.get("clientCode")?.toString() || null,
    clientName: formData.get("clientName"),
    whatsapp: formData.get("whatsapp") ?? "",
    galeria: formData.get("galeria")?.toString() || null,
    router: formData.get("router")?.toString() || null,
    portNumber: formData.get("portNumber") ? Number(formData.get("portNumber")) : null,
    startDate: formData.get("startDate"),
    nextPaymentDate: formData.get("nextPaymentDate"),
    amount: formData.get("amount") || 0,
    concept: formData.get("concept")?.toString() ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { startDate, nextPaymentDate, ...rest } = parsed.data;
  const start = parseDateInput(startDate)!;
  const nextPay = parseDateInput(nextPaymentDate)!;

  // Inicializar mapa de meses pagados
  const map = parsePaidMonths(null, startDate, nextPaymentDate, rest.amount);

  await prisma.internetClient.create({
    data: {
      ...rest,
      startDate: start,
      nextPaymentDate: nextPay,
      paidMonths: JSON.stringify(map),
    },
  });
  revalidatePath(PATH);
  return {};
}

/** Suma un mes (UTC) conservando el día; si no existe (31 → feb) usa el último día. */
function addOneMonthUTC(date: Date): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const lastDayNext = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDayNext)));
}

/** "Pagó": corre la próxima fecha de pago un mes y marca el mes pagado en paidMonths. */
export async function markInternetPaid(id: string): Promise<void> {
  const row = await prisma.internetClient.findUnique({ where: { id } });
  if (!row) return;

  const startStr = dateToInputValue(row.startDate);
  const nextPayStr = dateToInputValue(row.nextPaymentDate);
  const map: PaidMonthsMap = parsePaidMonths(row.paidMonths, startStr, nextPayStr, row.amount);

  const [ny, nm] = nextPayStr.split("-").map(Number);
  const key = `${ny}-${String(nm).padStart(2, "0")}`;
  const todayStr = dateToInputValue(new Date());

  map[key] = {
    status: "paid",
    paidAt: todayStr,
    amount: row.amount,
    method: "YAPE",
    note: "Pago puntual",
  };

  const newNextPaymentDateStr = calculateNextPaymentDate(startStr, nextPayStr, map);
  const newNextPay = parseDateInput(newNextPaymentDateStr) ?? addOneMonthUTC(row.nextPaymentDate);

  await prisma.internetClient.update({
    where: { id },
    data: {
      paidMonths: JSON.stringify(map),
      nextPaymentDate: newNextPay,
    },
  });
  revalidatePath(PATH);
}

export async function deleteInternetClient(id: string): Promise<void> {
  await prisma.internetClient.deleteMany({ where: { id } });
  revalidatePath(PATH);
}

export async function updateInternetClient(
  _prev: InternetFormState,
  formData: FormData
): Promise<InternetFormState> {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "ID de cliente no proporcionado." };

  const parsed = clientSchema.safeParse({
    clientCode: formData.get("clientCode")?.toString() || null,
    clientName: formData.get("clientName"),
    whatsapp: formData.get("whatsapp") ?? "",
    galeria: formData.get("galeria")?.toString() || null,
    router: formData.get("router")?.toString() || null,
    portNumber: formData.get("portNumber") ? Number(formData.get("portNumber")) : null,
    startDate: formData.get("startDate"),
    nextPaymentDate: formData.get("nextPaymentDate"),
    amount: formData.get("amount") || 0,
    concept: formData.get("concept")?.toString() ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { startDate, nextPaymentDate, ...rest } = parsed.data;
  const start = parseDateInput(startDate);
  const nextPay = parseDateInput(nextPaymentDate);
  if (!start || !nextPay) return { error: "Fechas inválidas." };

  await prisma.internetClient.update({
    where: { id },
    data: {
      ...rest,
      startDate: start,
      nextPaymentDate: nextPay,
    },
  });
  revalidatePath(PATH);
  return {};
}

export async function updateInternetClientDirect(
  id: string,
  data: {
    clientCode?: string | null;
    clientName: string;
    whatsapp: string;
    galeria?: string | null;
    router?: string | null;
    portNumber?: number | null;
    startDate: string;
    nextPaymentDate: string;
    amount: number;
    concept?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { startDate, nextPaymentDate, ...rest } = parsed.data;
  const start = parseDateInput(startDate);
  const nextPay = parseDateInput(nextPaymentDate);
  if (!start || !nextPay) {
    return { ok: false, error: "Fechas inválidas." };
  }

  await prisma.internetClient.update({
    where: { id },
    data: {
      ...rest,
      startDate: start,
      nextPaymentDate: nextPay,
    },
  });
  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Alterna (o fija) el estado de pago de un mes específico (ej: "2026-08").
 * Recalcula automáticamente la próxima fecha de pago para mantener total coherencia.
 */
export async function toggleInternetClientMonth(
  id: string,
  yearMonth: string,
  details?: {
    paid?: boolean;
    amount?: number;
    method?: string;
    note?: string;
  }
): Promise<{ ok: boolean; newNextPaymentDate?: string; error?: string }> {
  const row = await prisma.internetClient.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Cliente no encontrado." };

  const startStr = dateToInputValue(row.startDate);
  const nextPayStr = dateToInputValue(row.nextPaymentDate);
  const map: PaidMonthsMap = parsePaidMonths(row.paidMonths, startStr, nextPayStr, row.amount);

  const currentlyPaid = map[yearMonth]?.status === "paid";
  const shouldBePaid = details?.paid !== undefined ? details.paid : !currentlyPaid;
  const todayStr = dateToInputValue(new Date());

  if (shouldBePaid) {
    map[yearMonth] = {
      status: "paid",
      paidAt: map[yearMonth]?.paidAt || todayStr,
      amount: details?.amount !== undefined ? details.amount : (map[yearMonth]?.amount ?? row.amount),
      method: details?.method ?? map[yearMonth]?.method ?? "YAPE",
      note: details?.note ?? map[yearMonth]?.note ?? "Pago registrado",
    };
  } else {
    map[yearMonth] = {
      status: "unpaid",
    };
  }

  // Recalcular la fecha del primer mes que queda impago
  const newNextPaymentDateStr = calculateNextPaymentDate(startStr, nextPayStr, map);
  const newNextPayDate = parseDateInput(newNextPaymentDateStr);

  await prisma.internetClient.update({
    where: { id },
    data: {
      paidMonths: JSON.stringify(map),
      ...(newNextPayDate ? { nextPaymentDate: newNextPayDate } : {}),
    },
  });

  revalidatePath(PATH);
  return { ok: true, newNextPaymentDate: newNextPaymentDateStr };
}

/**
 * Paga N meses por adelantado (ej. 2 meses adelantados).
 * Marca los siguientes N meses impagos como pagados y actualiza la fecha de próximo pago.
 */
export async function payAdvanceInternetMonths(
  id: string,
  count: number = 2,
  options?: {
    amountPerMonth?: number;
    method?: string;
    note?: string;
  }
): Promise<{ ok: boolean; countPaid?: number; newNextPaymentDate?: string; error?: string }> {
  if (count <= 0) return { ok: false, error: "Cantidad de meses inválida." };

  const row = await prisma.internetClient.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Cliente no encontrado." };

  const startStr = dateToInputValue(row.startDate);
  const nextPayStr = dateToInputValue(row.nextPaymentDate);
  const map: PaidMonthsMap = parsePaidMonths(row.paidMonths, startStr, nextPayStr, row.amount);

  const todayStr = dateToInputValue(new Date());
  const [ny, nm] = nextPayStr.split("-").map(Number);

  let cy = ny;
  let cm = nm;
  let paidSoFar = 0;

  while (paidSoFar < count && cy <= new Date().getFullYear() + 4) {
    const key = `${cy}-${String(cm).padStart(2, "0")}`;
    if (map[key]?.status !== "paid") {
      map[key] = {
        status: "paid",
        paidAt: todayStr,
        amount: options?.amountPerMonth ?? row.amount,
        method: options?.method ?? "YAPE",
        note: options?.note || `Adelanto (${paidSoFar + 1}/${count} meses)`,
      };
      paidSoFar++;
    }
    cm++;
    if (cm > 12) {
      cm = 1;
      cy++;
    }
  }

  const newNextPaymentDateStr = calculateNextPaymentDate(startStr, nextPayStr, map);
  const newNextPayDate = parseDateInput(newNextPaymentDateStr);

  await prisma.internetClient.update({
    where: { id },
    data: {
      paidMonths: JSON.stringify(map),
      ...(newNextPayDate ? { nextPaymentDate: newNextPayDate } : {}),
    },
  });

  revalidatePath(PATH);
  return { ok: true, countPaid: paidSoFar, newNextPaymentDate: newNextPaymentDateStr };
}

/**
 * Actualiza los detalles específicos de un mes (monto especial, método de pago, nota).
 */
export async function updateInternetMonthDetails(
  id: string,
  yearMonth: string,
  details: {
    status: "paid" | "unpaid";
    amount: number;
    method?: string;
    note?: string;
    paidAt?: string;
  }
): Promise<{ ok: boolean; newNextPaymentDate?: string; error?: string }> {
  const row = await prisma.internetClient.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Cliente no encontrado." };

  const startStr = dateToInputValue(row.startDate);
  const nextPayStr = dateToInputValue(row.nextPaymentDate);
  const map: PaidMonthsMap = parsePaidMonths(row.paidMonths, startStr, nextPayStr, row.amount);

  map[yearMonth] = {
    status: details.status,
    amount: details.amount,
    method: details.method,
    note: details.note,
    paidAt: details.paidAt || dateToInputValue(new Date()),
  };

  const newNextPaymentDateStr = calculateNextPaymentDate(startStr, nextPayStr, map);
  const newNextPayDate = parseDateInput(newNextPaymentDateStr);

  await prisma.internetClient.update({
    where: { id },
    data: {
      paidMonths: JSON.stringify(map),
      ...(newNextPayDate ? { nextPaymentDate: newNextPayDate } : {}),
    },
  });

  revalidatePath(PATH);
  return { ok: true, newNextPaymentDate: newNextPaymentDateStr };
}
