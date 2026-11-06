"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PAYMENT_METHODS } from "./constants";
import { monthKey, monthKeyUTC, parseDateInput } from "./month";

export interface AdminTransaction {
  id: string;
  date: Date;
  description: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  paymentMethod: string;
  notes: string | null;
}

// `date` alone is a calendar day with no time-of-day (see month.ts) — two
// transactions entered on the same day are a genuine tie on it, and SQLite
// doesn't promise a stable order for ties with no secondary key. That's
// what made the list look like it "reorganized itself" as new same-day
// rows got added (reported directly). `createdAt` (real insertion instant)
// as a tiebreaker makes the order deterministic: same-day rows always
// appear in the order they were actually entered, and a transaction you
// just added always lands after that day's earlier ones — not randomly.
const CHRONOLOGICAL_ORDER: Prisma.CashboxTransactionOrderByWithRelationInput[] = [
  { date: "asc" },
  { createdAt: "asc" },
];

export async function getCashboxTransactions(): Promise<AdminTransaction[]> {
  const rows = await prisma.cashboxTransaction.findMany({
    where: { deletedAt: null },
    orderBy: CHRONOLOGICAL_ORDER,
  });
  return rows as AdminTransaction[];
}

export async function getCashboxTransactionsCount(): Promise<number> {
  return prisma.cashboxTransaction.count({
    where: { deletedAt: null },
  });
}

// UTC-anchored, matching how transaction dates are stored (see month.ts's
// parseDateInput) — a local-time boundary here would exclude/include rows
// near the 1st incorrectly whenever this runs somewhere other than UTC
// (e.g. this app's dev box, in Lima).
function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1)); // first day of the NEXT month, exclusive upper bound
  return { start, end };
}

export async function getCashboxTransactionsForMonth(month: string): Promise<AdminTransaction[]> {
  const { start, end } = monthRange(month);
  const rows = await prisma.cashboxTransaction.findMany({
    where: { date: { gte: start, lt: end }, deletedAt: null },
    orderBy: CHRONOLOGICAL_ORDER,
  });
  return rows as AdminTransaction[];
}

export interface AdminCashboxPeriod {
  month: string;
  responsible: string;
}

export async function getCashboxPeriod(month: string): Promise<AdminCashboxPeriod | null> {
  const row = await prisma.cashboxPeriod.findUnique({ where: { month } });
  return row ? { month: row.month, responsible: row.responsible } : null;
}

/** Every month that has at least one transaction OR an explicit period
 *  row — lets the report page offer a "previous months" selector without
 *  needing the admin to remember which months actually have data. */
export async function listCashboxMonths(): Promise<string[]> {
  const [txDates, periods] = await Promise.all([
    prisma.cashboxTransaction.findMany({ where: { deletedAt: null }, select: { date: true } }),
    prisma.cashboxPeriod.findMany({ select: { month: true } }),
  ]);
  const months = new Set<string>([
    ...txDates.map((t) => monthKeyUTC(t.date)),
    ...periods.map((p) => p.month),
    monthKey(), // always include the current month, even with zero data yet
  ]);
  return [...months].sort().reverse();
}

export interface CashboxMonthSummary {
  month: string;
  label: string;
  isCurrent: boolean;
  count: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  responsible: string | null;
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function getCashboxMonthsSummary(): Promise<CashboxMonthSummary[]> {
  const [transactions, periods] = await Promise.all([
    prisma.cashboxTransaction.findMany({
      where: { deletedAt: null },
      orderBy: CHRONOLOGICAL_ORDER,
      select: { id: true, date: true, type: true, amount: true },
    }),
    prisma.cashboxPeriod.findMany({ select: { month: true, responsible: true } }),
  ]);

  const periodMap = new Map(periods.map((p) => [p.month, p.responsible]));
  const current = monthKey();

  const monthKeys = new Set<string>([
    current,
    ...transactions.map((t) => monthKeyUTC(t.date)),
    ...periods.map((p) => p.month),
  ]);

  const sortedMonths = [...monthKeys].sort().reverse();

  return sortedMonths.map((m) => {
    const [year, monthNum] = m.split("-").map(Number);
    const label = `${MONTH_NAMES_ES[monthNum - 1] || m} de ${year}`;
    const txs = transactions.filter((t) => monthKeyUTC(t.date) === m);

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of txs) {
      if (t.type === "INCOME") totalIncome += t.amount;
      else totalExpense += t.amount;
    }

    return {
      month: m,
      label,
      isCurrent: m === current,
      count: txs.length,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      responsible: periodMap.get(m) ?? null,
    };
  });
}

const periodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mes inválido."),
  responsible: z.string().trim().min(1, "El responsable es obligatorio.").max(120),
});

export async function setCashboxPeriodResponsible(
  month: string,
  responsible: string
): Promise<{ error?: string }> {
  const parsed = periodSchema.safeParse({ month, responsible });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  await prisma.cashboxPeriod.upsert({
    where: { month: parsed.data.month },
    update: { responsible: parsed.data.responsible },
    create: { month: parsed.data.month, responsible: parsed.data.responsible },
  });
  revalidatePath("/taller-control/caja");
  return {};
}

export interface TransactionFormState {
  error?: string;
}

const dateField = z.string().transform((v, ctx) => {
  const parsed = parseDateInput(v);
  if (!parsed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha inválida." });
    return z.NEVER;
  }
  return parsed;
});

const transactionSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  date: dateField,
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export async function createTransaction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const parsed = transactionSchema.safeParse({
    description: formData.get("description"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  await prisma.cashboxTransaction.create({ data: parsed.data });
  revalidatePath("/taller-control/caja");
  return {};
}

// Same validation as createTransaction, but taking a plain object instead of
// FormData — lets AddTransactionRow (inline "+" in the table) call it after
// its own ConfirmDialog, the same object-in/patch-out shape updateTransaction
// already uses, instead of going through useActionState + a real <form>.
export async function createTransactionRecord(input: {
  description: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  date: string;
  notes?: string | null;
}): Promise<{ error?: string }> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  await prisma.cashboxTransaction.create({ data: parsed.data });
  revalidatePath("/taller-control/caja");
  return {};
}

const updateSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0").optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  date: dateField.optional(),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function updateTransaction(
  id: string,
  // Input shape, not z.infer's output shape: callers pass a raw
  // <input type="date"> string, which dateField below converts to a Date.
  patch: {
    description?: string;
    type?: "INCOME" | "EXPENSE";
    amount?: number;
    paymentMethod?: (typeof PAYMENT_METHODS)[number];
    date?: string;
    notes?: string | null;
  }
): Promise<{ error?: string }> {
  const parsed = updateSchema.safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Valor inválido." };

  await prisma.cashboxTransaction.update({ where: { id }, data: parsed.data });
  revalidatePath("/taller-control/caja");
  return {};
}

export interface DeletedTransaction extends AdminTransaction {
  deletedAt: Date;
}

export async function getDeletedTransactions(): Promise<DeletedTransaction[]> {
  const rows = await prisma.cashboxTransaction.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  // The `where` above guarantees deletedAt is non-null; Prisma's generated
  // type still widens it to Date | null for the column itself.
  return rows.map((r) => ({ ...r, deletedAt: r.deletedAt as Date })) as DeletedTransaction[];
}

// Soft delete — same Papelera pattern as Ventas (see ventas/actions.ts's
// deleteSale): moves the movement to the Papelera instead of destroying
// it. `date` is never touched, so a restored movement reappears under its
// real, original date, not today's.
export async function deleteTransaction(id: string): Promise<void> {
  await prisma.cashboxTransaction.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/taller-control/caja");
  revalidatePath("/taller-control/papelera");
}

export async function restoreTransaction(id: string): Promise<void> {
  await prisma.cashboxTransaction.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/taller-control/caja");
  revalidatePath("/taller-control/papelera");
}

export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  await prisma.cashboxTransaction.delete({ where: { id } });
  revalidatePath("/taller-control/papelera");
}
