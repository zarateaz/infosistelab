"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { dateToInputValue, parseDateInput } from "../caja/month";
import {
  DEBT_CATEGORIES,
  DEBT_PAYMENT_METHODS,
  isCashboxMethod,
  isDebtCategory,
  isPeriod,
  periodLabel,
  type DebtRow,
} from "./deudas";

const PATH = "/taller-control/deudas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getDebts(): Promise<DebtRow[]> {
  const rows = await prisma.debt.findMany({
    include: { payments: { orderBy: { period: "asc" } } },
    orderBy: [{ dueDay: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: isDebtCategory(r.category) ? r.category : "OTROS",
    payee: r.payee,
    location: r.location,
    reference: r.reference,
    payTo: r.payTo,
    phone: r.phone,
    dueDay: r.dueDay,
    amount: r.amount,
    isVariable: r.isVariable,
    startMonth: r.startMonth,
    endMonth: r.endMonth,
    notes: r.notes,
    active: r.active,
    payments: r.payments.map((p) => ({
      id: p.id,
      period: p.period,
      amount: p.amount,
      paidAt: dateToInputValue(p.paidAt),
      method: p.method,
      note: p.note,
      inCashbox: Boolean(p.cashboxTransactionId),
    })),
  }));
}

// ─── Obligaciones ─────────────────────────────────────────────────────────

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const periodField = z.string().refine(isPeriod, "Mes inválido (formato AAAA-MM)");

const debtSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(150),
    category: z.enum(DEBT_CATEGORIES),
    payee: optionalText(120),
    location: optionalText(40),
    reference: optionalText(120),
    payTo: optionalText(160),
    phone: z
      .string()
      .nullish()
      .transform((v) => (v ? v.replace(/\D/g, "") : null))
      .refine((v) => v === null || v.length === 0 || (v.length >= 6 && v.length <= 15), "Teléfono inválido")
      .transform((v) => (v ? v : null)),
    dueDay: z.coerce.number().int().min(1, "Día entre 1 y 31").max(31, "Día entre 1 y 31"),
    amount: z.coerce.number().min(0, "El monto no puede ser negativo"),
    isVariable: z.boolean().default(false),
    startMonth: periodField,
    endMonth: z
      .string()
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isPeriod(v), "Mes final inválido"),
    notes: optionalText(500),
  })
  .refine((d) => !d.endMonth || d.endMonth >= d.startMonth, {
    message: "El mes final no puede ser anterior al mes de inicio",
    path: ["endMonth"],
  });

export type DebtInput = z.input<typeof debtSchema>;

export async function createDebt(input: DebtInput): Promise<ActionResult> {
  await requireSession();
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  await prisma.debt.create({ data: parsed.data });
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateDebt(id: string, input: DebtInput): Promise<ActionResult> {
  await requireSession();
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const res = await prisma.debt.updateMany({ where: { id }, data: parsed.data });
  if (res.count === 0) return { ok: false, error: "La obligación ya no existe." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function toggleDebtActive(id: string): Promise<ActionResult> {
  await requireSession();
  const debt = await prisma.debt.findUnique({ where: { id }, select: { active: true } });
  if (!debt) return { ok: false, error: "La obligación ya no existe." };
  await prisma.debt.update({ where: { id }, data: { active: !debt.active } });
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  await requireSession();
  await prisma.debt.deleteMany({ where: { id } });
  revalidatePath(PATH);
  return { ok: true };
}

// ─── Pagos ────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  debtId: z.string().min(1),
  period: periodField,
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paidAt: z.string().refine((v) => parseDateInput(v) !== null, "Fecha de pago inválida"),
  method: z.enum(DEBT_PAYMENT_METHODS),
  note: optionalText(300),
  addToCashbox: z.boolean().optional(),
});

export type PaymentInput = z.input<typeof paymentSchema>;

export async function registerDebtPayment(input: PaymentInput): Promise<ActionResult> {
  await requireSession();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { debtId, period, amount, paidAt, method, note } = parsed.data;

  const debt = await prisma.debt.findUnique({ where: { id: debtId } });
  if (!debt) return { ok: false, error: "La obligación ya no existe." };

  const existing = await prisma.debtPayment.findUnique({ where: { debtId_period: { debtId, period } } });
  if (existing) return { ok: false, error: `${periodLabel(period)} ya figura como pagado.` };

  const paidDate = parseDateInput(paidAt)!;
  await prisma.debtPayment.create({
    data: { debtId, period, amount, paidAt: paidDate, method, note },
  });

  revalidatePath(PATH);
  return { ok: true };
}

export async function undoDebtPayment(paymentId: string): Promise<ActionResult> {
  await requireSession();
  const payment = await prisma.debtPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, error: "El pago ya no existe." };

  await prisma.debtPayment.delete({ where: { id: paymentId } });

  revalidatePath(PATH);
  return { ok: true };
}
