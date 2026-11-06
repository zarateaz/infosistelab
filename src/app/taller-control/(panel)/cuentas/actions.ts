"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, DOCUMENT_TYPES, computeStatus, overdueDays, type AccountStatus } from "./constants";

const PATH = "/taller-control/cuentas";

export interface AccountRow {
  id: string;
  issueDate: Date;
  party: string; // clientName or providerName, unified for shared UI
  ruc: string | null;
  documentType: string | null;
  concept: string;
  total: number;
  settled: number; // collected or paid, unified
  saldo: number;
  dueDate: Date;
  overdueDays: number;
  status: AccountStatus;
  paymentMethod: string | null;
  notes: string | null;
}

export async function getReceivables(): Promise<AccountRow[]> {
  const rows = await prisma.receivable.findMany({ orderBy: { dueDate: "asc" } });
  const now = new Date();
  return rows.map((r) => {
    const saldo = r.total - r.collected;
    return {
      id: r.id,
      issueDate: r.issueDate,
      party: r.clientName,
      ruc: r.ruc,
      documentType: r.documentType,
      concept: r.concept,
      total: r.total,
      settled: r.collected,
      saldo,
      dueDate: r.dueDate,
      overdueDays: overdueDays(r.dueDate, now),
      status: computeStatus(saldo, r.dueDate, now),
      paymentMethod: r.paymentMethod,
      notes: r.notes,
    };
  });
}

export async function getPayables(): Promise<AccountRow[]> {
  const rows = await prisma.payable.findMany({ orderBy: { dueDate: "asc" } });
  const now = new Date();
  return rows.map((p) => {
    const saldo = p.total - p.paid;
    return {
      id: p.id,
      issueDate: p.issueDate,
      party: p.providerName,
      ruc: p.ruc,
      documentType: p.documentType,
      concept: p.concept,
      total: p.total,
      settled: p.paid,
      saldo,
      dueDate: p.dueDate,
      overdueDays: overdueDays(p.dueDate, now),
      status: computeStatus(saldo, p.dueDate, now),
      paymentMethod: p.paymentMethod,
      notes: p.notes,
    };
  });
}

export interface AccountFormState {
  error?: string;
}

// Shared by both the create form and the full edit form — the create form
// lets Cobrado/Medio de pago be filled right away so historical rows (a
// debt that was already partially paid before it got typed in) don't need
// a separate "registrar cobro" step just to reflect reality.
const baseFields = {
  issueDate: z.coerce.date(),
  ruc: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => (v ? v : null)),
  documentType: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || (DOCUMENT_TYPES as readonly string[]).includes(v), "Documento inválido")
    .transform((v) => (v ? v : null)),
  concept: z.string().trim().min(1, "El concepto es obligatorio").max(200),
  total: z.coerce.number().positive("El total debe ser mayor a 0"),
  dueDate: z.coerce.date(),
  settled: z.coerce
    .number()
    .min(0, "No puede ser negativo")
    .nullish()
    .transform((v) => v ?? 0),
  paymentMethod: z.enum(PAYMENT_METHODS).nullish().transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
};

const receivableSchema = z
  .object({ ...baseFields, clientName: z.string().trim().min(1, "El cliente es obligatorio").max(150) })
  .refine((d) => d.settled <= d.total, { message: "El monto cobrado no puede superar el total.", path: ["settled"] });

const payableSchema = z
  .object({ ...baseFields, providerName: z.string().trim().min(1, "El proveedor es obligatorio").max(150) })
  .refine((d) => d.settled <= d.total, { message: "El monto pagado no puede superar el total.", path: ["settled"] });

function fromForm(formData: FormData) {
  return {
    issueDate: formData.get("issueDate") || new Date(),
    ruc: formData.get("ruc"),
    documentType: formData.get("documentType"),
    concept: formData.get("concept"),
    total: formData.get("total"),
    dueDate: formData.get("dueDate"),
    settled: formData.get("settled") || 0,
    paymentMethod: formData.get("paymentMethod") || null,
    notes: formData.get("notes"),
  };
}

export async function createReceivable(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const parsed = receivableSchema.safeParse({ ...fromForm(formData), clientName: formData.get("clientName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { settled, ...rest } = parsed.data;
  await prisma.receivable.create({ data: { ...rest, collected: settled } });
  revalidatePath(PATH);
  return {};
}

export async function createPayable(_prevState: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const parsed = payableSchema.safeParse({ ...fromForm(formData), providerName: formData.get("providerName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { settled, ...rest } = parsed.data;
  await prisma.payable.create({ data: { ...rest, paid: settled } });
  revalidatePath(PATH);
  return {};
}

// Full edit — every field is correctable here, not just the balance (the
// quick "registrar cobro/pago" actions below only ever ADD to the settled
// amount; this REPLACES every field with what the admin typed).
export type AccountPatch = {
  party: string;
  ruc: string | null;
  documentType: string | null;
  concept: string;
  total: number;
  issueDate: Date;
  dueDate: Date;
  settled: number;
  paymentMethod: string | null;
  notes: string | null;
};

const patchSchema = z
  .object({
    party: z.string().trim().min(1, "Este campo es obligatorio").max(150),
    ruc: z.string().trim().max(20).nullable(),
    documentType: z
      .string()
      .trim()
      .nullable()
      .refine((v) => !v || (DOCUMENT_TYPES as readonly string[]).includes(v), "Documento inválido"),
    concept: z.string().trim().min(1, "El concepto es obligatorio").max(200),
    total: z.coerce.number().positive("El total debe ser mayor a 0"),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    settled: z.coerce.number().min(0, "No puede ser negativo"),
    paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
    notes: z.string().trim().max(500).nullable(),
  })
  .refine((d) => d.settled <= d.total, { message: "El monto no puede superar el total.", path: ["settled"] });

export async function updateReceivable(id: string, patch: AccountPatch): Promise<{ error?: string }> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { party, settled, ruc, documentType, concept, total, issueDate, dueDate, paymentMethod, notes } = parsed.data;
  await prisma.receivable.update({
    where: { id },
    data: { clientName: party, ruc, documentType, concept, total, issueDate, dueDate, collected: settled, paymentMethod, notes },
  });
  revalidatePath(PATH);
  return {};
}

export async function updatePayable(id: string, patch: AccountPatch): Promise<{ error?: string }> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const { party, settled, ruc, documentType, concept, total, issueDate, dueDate, paymentMethod, notes } = parsed.data;
  await prisma.payable.update({
    where: { id },
    data: { providerName: party, ruc, documentType, concept, total, issueDate, dueDate, paid: settled, paymentMethod, notes },
  });
  revalidatePath(PATH);
  return {};
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

/** Registers a partial or full payment against a receivable's balance — ADDS to what's already collected. */
export async function registerCollection(id: string, patch: z.infer<typeof paymentSchema>): Promise<{ error?: string }> {
  const parsed = paymentSchema.safeParse(patch);
  if (!parsed.success) return { error: "Valor inválido." };

  const row = await prisma.receivable.findUnique({ where: { id } });
  if (!row) return { error: "Registro no encontrado." };

  await prisma.receivable.update({
    where: { id },
    data: {
      collected: Math.min(row.total, row.collected + parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
    },
  });
  revalidatePath(PATH);
  return {};
}

export async function registerPayment(id: string, patch: z.infer<typeof paymentSchema>): Promise<{ error?: string }> {
  const parsed = paymentSchema.safeParse(patch);
  if (!parsed.success) return { error: "Valor inválido." };

  const row = await prisma.payable.findUnique({ where: { id } });
  if (!row) return { error: "Registro no encontrado." };

  await prisma.payable.update({
    where: { id },
    data: {
      paid: Math.min(row.total, row.paid + parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
    },
  });
  revalidatePath(PATH);
  return {};
}

export async function deleteReceivable(id: string): Promise<void> {
  await prisma.receivable.delete({ where: { id } });
  revalidatePath(PATH);
}

export async function deletePayable(id: string): Promise<void> {
  await prisma.payable.delete({ where: { id } });
  revalidatePath(PATH);
}
