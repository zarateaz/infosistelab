"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { sanitizeName, digitsOnly } from "@/lib/sanitize";
import { deleteServicePhotoFileIfManaged } from "./upload-actions";
import {
  pendingBalance,
  PAYMENT_METHODS,
  PAY_NOW_METHODS,
  type PaymentMethod,
  type PayNowMethod,
  type EquipmentStage,
  type PaymentStatus,
} from "./utils";
import { parseDateInput } from "../caja/month";

// Re-exported as types only — erased at compile time, so this doesn't
// trip the "use server" file's "every export must be an async function"
// rule the way re-exporting the arrays themselves would. Callers that need
// PAYMENT_METHODS/PAY_NOW_METHODS/EQUIPMENT_STAGES as values import them
// from "./utils" directly.
export type { PaymentMethod, PayNowMethod, EquipmentStage, PaymentStatus };

const PATH = "/taller-control/servicios";

function statusFor(paymentMethod: PaymentMethod): PaymentStatus {
  if (paymentMethod === "PARCIAL") return "PARCIAL";
  if (paymentMethod === "PENDIENTE") return "PENDIENTE";
  return "PAGADO";
}

// ----------------------------- Técnicos ----------------------------- //

export interface AdminTechnician {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
  serviceCount: number;
}

export async function getTechnicians(activeOnly = false): Promise<AdminTechnician[]> {
  const technicians = await prisma.technician.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  });
  return technicians.map((t) => ({
    id: t.id,
    name: t.name,
    phone: t.phone,
    specialty: t.specialty,
    isActive: t.isActive,
    serviceCount: t._count.services,
  }));
}

export interface TechnicianFormState {
  error?: string;
}

const technicianSchema = z.object({
  name: z.string().trim().min(1, "El nombre del técnico es obligatorio.").max(100),
  phone: z.string().trim().max(20).optional(),
  specialty: z.string().trim().max(100).optional(),
});

export async function createTechnician(
  _prevState: TechnicianFormState,
  formData: FormData
): Promise<TechnicianFormState> {
  const parsed = technicianSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    specialty: formData.get("specialty") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  await prisma.technician.create({
    data: {
      name: sanitizeName(parsed.data.name, 100),
      phone: parsed.data.phone ? sanitizeName(parsed.data.phone, 20) : null,
      specialty: parsed.data.specialty ? sanitizeName(parsed.data.specialty, 100) : null,
    },
  });

  revalidatePath(PATH);
  return {};
}

export async function updateTechnician(
  id: string,
  data: { name: string; phone: string; specialty: string }
): Promise<void> {
  const name = sanitizeName(data.name, 100);
  if (!name) return;
  await prisma.technician.update({
    where: { id },
    data: {
      name,
      phone: data.phone ? sanitizeName(data.phone, 20) : null,
      specialty: data.specialty ? sanitizeName(data.specialty, 100) : null,
    },
  });
  revalidatePath(PATH);
}

export async function toggleTechnicianStatus(id: string): Promise<void> {
  const tech = await prisma.technician.findUnique({ where: { id }, select: { isActive: true } });
  if (!tech) return;
  await prisma.technician.update({ where: { id }, data: { isActive: !tech.isActive } });
  revalidatePath(PATH);
}

// Only reachable once a technician has zero services attached — matches the
// original tool's rule exactly (delete button only shows then); enforced
// here too, not just hidden in the UI, since the FK is onDelete: Restrict
// and would otherwise fail loudly instead of with a clear message.
export async function deleteTechnician(id: string): Promise<{ error?: string }> {
  const count = await prisma.service.count({ where: { technicianId: id } });
  if (count > 0) return { error: "No se puede eliminar: este técnico tiene servicios registrados." };
  await prisma.technician.delete({ where: { id } });
  revalidatePath(PATH);
  return {};
}

// ----------------------------- Tipos de equipo ----------------------------- //

export interface AdminEquipmentType {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  serviceCount: number;
}

const DEFAULT_EQUIPMENT_TYPES = [
  { name: "Laptop", icon: "💻" },
  { name: "PC de escritorio", icon: "🖥️" },
  { name: "Impresora", icon: "🖨️" },
  { name: "Otro", icon: "🔧" },
];

/** A fresh install (or a database where every equipment type has since
 *  been deleted) leaves "Tipo de equipo" in the Nuevo servicio form
 *  completely empty — a required field with nothing to select, so the
 *  form can never actually be submitted. Reported directly: the button to
 *  add a service was there, but the form underneath it couldn't be
 *  completed. The original tool guards against exactly this with a
 *  permanent check on every load ("instalaciones previas... no tienen
 *  esta tabla poblada"): if the table is empty, seed these 4 defaults.
 *  Never reseeds once anything exists, so it never fights an admin who's
 *  renamed, added, or deactivated types since. */
async function ensureDefaultEquipmentTypes(): Promise<void> {
  const count = await prisma.equipmentType.count();
  if (count > 0) return;
  await prisma.equipmentType.createMany({ data: DEFAULT_EQUIPMENT_TYPES });
}

export async function getEquipmentTypes(activeOnly = false): Promise<AdminEquipmentType[]> {
  await ensureDefaultEquipmentTypes();
  const types = await prisma.equipmentType.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  });
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    isActive: t.isActive,
    serviceCount: t._count.services,
  }));
}

const equipmentTypeSchema = z.object({
  name: z.string().trim().min(1, "El nombre del tipo de equipo es obligatorio.").max(60),
  icon: z.string().trim().max(4).optional(),
});

export interface EquipmentTypeFormState {
  error?: string;
}

export async function createEquipmentType(
  _prevState: EquipmentTypeFormState,
  formData: FormData
): Promise<EquipmentTypeFormState> {
  const parsed = equipmentTypeSchema.safeParse({
    name: formData.get("name"),
    icon: formData.get("icon") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  await prisma.equipmentType.create({
    data: { name: sanitizeName(parsed.data.name, 60), icon: parsed.data.icon?.trim() || "🔧" },
  });
  revalidatePath(PATH);
  return {};
}

export async function updateEquipmentType(id: string, data: { name: string; icon: string }): Promise<void> {
  const name = sanitizeName(data.name, 60);
  if (!name) return;
  await prisma.equipmentType.update({
    where: { id },
    data: { name, icon: data.icon.trim() || "🔧" },
  });
  revalidatePath(PATH);
}

export async function toggleEquipmentTypeStatus(id: string): Promise<void> {
  const type = await prisma.equipmentType.findUnique({ where: { id }, select: { isActive: true } });
  if (!type) return;
  await prisma.equipmentType.update({ where: { id }, data: { isActive: !type.isActive } });
  revalidatePath(PATH);
}

// ----------------------------- Servicios: lectura ----------------------------- //

export interface AdminServicePhoto {
  id: string;
  path: string;
  originalName: string;
}

export interface AdminService {
  id: string;
  clientName: string;
  clientPhone: string;
  title: string;
  description: string;
  diagnosis: string | null;
  solution: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  equipmentTypeId: string;
  equipmentTypeName: string;
  equipmentTypeIcon: string;
  serviceDate: Date;
  deliveryDate: Date | null;
  equipmentStage: EquipmentStage;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  advanceAmount: number | null;
  advancePaymentMethod: PayNowMethod | null;
  balancePaymentMethod: PayNowMethod | null;
  technicianId: string;
  technicianName: string;
  photos: AdminServicePhoto[];
  createdAt: Date;
}

function toAdminService(s: Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>): AdminService {
  return {
    id: s.id,
    clientName: s.clientName,
    clientPhone: s.clientPhone,
    title: s.title,
    description: s.description,
    diagnosis: s.diagnosis,
    solution: s.solution,
    equipmentBrand: s.equipmentBrand,
    equipmentModel: s.equipmentModel,
    equipmentTypeId: s.equipmentTypeId,
    equipmentTypeName: s.equipmentType.name,
    equipmentTypeIcon: s.equipmentType.icon,
    serviceDate: s.serviceDate,
    deliveryDate: s.deliveryDate,
    equipmentStage: s.equipmentStage as EquipmentStage,
    amount: s.amount,
    paymentMethod: s.paymentMethod as PaymentMethod,
    paymentStatus: s.paymentStatus as PaymentStatus,
    advanceAmount: s.advanceAmount,
    advancePaymentMethod: s.advancePaymentMethod as PayNowMethod | null,
    balancePaymentMethod: s.balancePaymentMethod as PayNowMethod | null,
    technicianId: s.technicianId,
    technicianName: s.technician.name,
    photos: s.photos.map((p) => ({ id: p.id, path: p.path, originalName: p.originalName })),
    createdAt: s.createdAt,
  };
}

const serviceInclude = {
  technician: true,
  equipmentType: true,
  photos: { orderBy: { uploadedAt: "asc" as const } },
};

export interface ServiceFilters {
  q?: string;
  technicianId?: string;
  equipmentTypeId?: string;
  paymentStatus?: PaymentStatus;
  equipmentStage?: EquipmentStage;
  period?: "hoy" | "semana" | "mes" | "todo";
}

function periodStart(period: ServiceFilters["period"]): Date | null {
  const now = new Date();
  if (period === "hoy") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (period === "semana") {
    const day = (now.getDay() + 6) % 7; // lunes = 0
    now.setDate(now.getDate() - day);
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (period === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

/** Orden "más reciente primero" por fecha de recepción — igual que el
 *  listado principal del diseño original. Pendientes de cobro usa su
 *  propio orden ascendente (ver getPendingServices). */
export async function getAdminServices(filters: ServiceFilters = {}): Promise<AdminService[]> {
  const { q, technicianId, equipmentTypeId, paymentStatus, equipmentStage, period } = filters;
  const from = periodStart(period);

  const services = await prisma.service.findMany({
    where: {
      ...(from ? { serviceDate: { gte: from } } : {}),
      ...(technicianId ? { technicianId } : {}),
      ...(equipmentTypeId ? { equipmentTypeId } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(equipmentStage ? { equipmentStage } : {}),
      ...(q?.trim()
        ? {
            OR: [
              { clientName: { contains: q.trim() } },
              { title: { contains: q.trim() } },
              { technician: { name: { contains: q.trim() } } },
            ],
          }
        : {}),
    },
    include: serviceInclude,
    orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
  });

  return services.map(toAdminService);
}

export async function getServiceById(id: string): Promise<AdminService | null> {
  const s = await prisma.service.findUnique({ where: { id }, include: serviceInclude });
  return s ? toAdminService(s) : null;
}

export interface ServiceDashboard {
  total: number;
  paidCount: number;
  pendingCount: number; // PARCIAL + PENDIENTE
  totalCollected: number; // pagados.amount + parciales.advanceAmount
  totalPending: number; // pendientes.amount + parciales.saldo
  activeTechnicians: number;
  recent: AdminService[];
}

export async function getServiceDashboard(): Promise<ServiceDashboard> {
  const [all, activeTechnicians] = await Promise.all([
    prisma.service.findMany({ include: serviceInclude, orderBy: { createdAt: "desc" } }),
    prisma.technician.count({ where: { isActive: true } }),
  ]);

  const services = all.map(toAdminService);
  const paid = services.filter((s) => s.paymentStatus === "PAGADO");
  const partial = services.filter((s) => s.paymentStatus === "PARCIAL");
  const pending = services.filter((s) => s.paymentStatus === "PENDIENTE");

  const totalCollected =
    paid.reduce((sum, s) => sum + s.amount, 0) + partial.reduce((sum, s) => sum + (s.advanceAmount ?? 0), 0);
  const totalPending = pending.reduce((sum, s) => sum + s.amount, 0) + partial.reduce((sum, s) => sum + pendingBalance(s), 0);

  return {
    total: services.length,
    paidCount: paid.length,
    pendingCount: partial.length + pending.length,
    totalCollected,
    totalPending,
    activeTechnicians,
    recent: services.slice(0, 6),
  };
}

/** Ascendente por fecha de recepción — lo más antiguo (y por lo tanto más
 *  urgente de cobrar) primero, igual que el diseño original. */
export async function getPendingServices(): Promise<AdminService[]> {
  const services = await prisma.service.findMany({
    where: { paymentStatus: { in: ["PARCIAL", "PENDIENTE"] } },
    include: serviceInclude,
    orderBy: { serviceDate: "asc" },
  });
  return services.map(toAdminService);
}

export async function getGalleryServices(): Promise<AdminService[]> {
  const services = await prisma.service.findMany({
    where: { photos: { some: {} } },
    include: serviceInclude,
    orderBy: { serviceDate: "desc" },
  });
  return services.map(toAdminService);
}

export interface ClientSummary {
  clientName: string;
  services: AdminService[];
  totalPaid: number; // solo servicios con estado PAGADO (no incluye adelantos de parciales)
  totalPending: number; // solo servicios con estado PENDIENTE (no incluye saldo de parciales)
  pendingCount: number; // solo PENDIENTE, para el badge de la lista
  lastServiceDate: Date;
}

export async function getClientSummaries(): Promise<ClientSummary[]> {
  const services = await getAdminServices();
  const byClient = new Map<string, AdminService[]>();
  for (const s of services) {
    const list = byClient.get(s.clientName) ?? [];
    list.push(s);
    byClient.set(s.clientName, list);
  }

  return [...byClient.entries()]
    .map(([clientName, list]) => ({
      clientName,
      services: [...list].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime()),
      totalPaid: list.filter((s) => s.paymentStatus === "PAGADO").reduce((sum, s) => sum + s.amount, 0),
      totalPending: list.filter((s) => s.paymentStatus === "PENDIENTE").reduce((sum, s) => sum + s.amount, 0),
      pendingCount: list.filter((s) => s.paymentStatus === "PENDIENTE").length,
      lastServiceDate: list.reduce((max, s) => (s.serviceDate > max ? s.serviceDate : max), list[0].serviceDate),
    }))
    .sort((a, b) => b.services.length - a.services.length);
}

// ----------------------------- Servicios: escritura ----------------------------- //

export interface ServiceFormState {
  error?: string;
}

const photoSchema = z.object({ path: z.string().min(1), originalName: z.string().max(255) });

const baseServiceSchema = z.object({
  clientName: z.string().trim().min(1, "El nombre del cliente es obligatorio.").max(150),
  clientPhone: z
    .string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{9}$/.test(v), "El teléfono debe tener exactamente 9 dígitos numéricos."),
  title: z.string().trim().min(1, "El trabajo realizado es obligatorio.").max(150),
  description: z.string().trim().max(2000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  solution: z.string().trim().max(2000).optional(),
  // Either an existing type's id, or a brand-new name typed on the spot
  // (see resolveEquipmentTypeId) — the form sends exactly one of the two.
  equipmentTypeId: z.string().trim().optional(),
  equipmentTypeCustomName: z.string().trim().max(60).optional(),
  equipmentBrand: z.string().trim().max(100).optional(),
  equipmentModel: z.string().trim().max(100).optional(),
  serviceDate: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const parsed = parseDateInput(v);
      if (!parsed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de recepción inválida." });
        return z.NEVER;
      }
      return parsed;
    }),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
  technicianId: z.string().trim().min(1, "Selecciona un técnico."),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Forma de pago inválida." }),
  advanceAmount: z.coerce.number().optional(),
  advancePaymentMethod: z.enum(PAY_NOW_METHODS).optional(),
  photos: z.array(photoSchema).max(4, "Puedes subir un máximo de 4 fotos.").optional(),
});

/** El pago parcial exige adelanto > 0, menor al total, y su propia forma de
 *  pago — mismas reglas que el formulario y el modal de pago parcial del
 *  diseño original, aplicadas aquí también para que nunca dependan solo de
 *  la validación del cliente. */
function validatePartialPayment(data: {
  paymentMethod: PaymentMethod;
  amount: number;
  advanceAmount?: number;
  advancePaymentMethod?: PayNowMethod;
}): string | null {
  if (data.paymentMethod !== "PARCIAL") return null;
  if (!data.advanceAmount || data.advanceAmount <= 0) return "Ingresa un monto de adelanto válido.";
  if (data.advanceAmount >= data.amount) return "El adelanto no puede ser igual o mayor al monto total.";
  if (!data.advancePaymentMethod) return "Selecciona la forma de pago del adelanto.";
  return null;
}

function parsePhotosField(raw: FormDataEntryValue | null): { path: string; originalName: string }[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const decoded = JSON.parse(raw);
    if (!Array.isArray(decoded)) return [];
    return decoded.filter(
      (v): v is { path: string; originalName: string } =>
        v && typeof v.path === "string" && typeof v.originalName === "string"
    );
  } catch {
    return [];
  }
}

function readServiceForm(formData: FormData) {
  return baseServiceSchema.safeParse({
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    diagnosis: formData.get("diagnosis") || undefined,
    solution: formData.get("solution") || undefined,
    equipmentTypeId: formData.get("equipmentTypeId") || undefined,
    equipmentTypeCustomName: formData.get("equipmentTypeCustomName") || undefined,
    equipmentBrand: formData.get("equipmentBrand") || undefined,
    equipmentModel: formData.get("equipmentModel") || undefined,
    serviceDate: formData.get("serviceDate"),
    amount: formData.get("amount"),
    technicianId: formData.get("technicianId"),
    paymentMethod: formData.get("paymentMethod"),
    advanceAmount: formData.get("advanceAmount") || undefined,
    advancePaymentMethod: formData.get("advancePaymentMethod") || undefined,
    photos: parsePhotosField(formData.get("photos")),
  });
}

/** Reported directly: the "Tipo de equipo" dropdown only offers whatever
 *  someone already configured — no way to just type a new one on the spot
 *  while registering a service, unlike every other free-text field in this
 *  form. Mirrors productos/actions.ts's upsertCategory: the name is the
 *  identity (EquipmentType.name is @unique as of this migration), so
 *  typing a name that already exists quietly reuses that type instead of
 *  creating a duplicate — same behavior an admin would expect from
 *  Configuración's own "Agregar tipo". Returns an error only when NEITHER
 *  an existing selection nor a typed name was submitted. */
async function resolveEquipmentTypeId(data: {
  equipmentTypeId?: string;
  equipmentTypeCustomName?: string;
}): Promise<{ id: string } | { error: string }> {
  if (data.equipmentTypeCustomName) {
    const name = sanitizeName(data.equipmentTypeCustomName, 60);
    if (!name) return { error: "Escribe un nombre válido para el tipo de equipo." };
    const type = await prisma.equipmentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    return { id: type.id };
  }
  if (data.equipmentTypeId) return { id: data.equipmentTypeId };
  return { error: "Selecciona o escribe el tipo de equipo." };
}

export async function createService(_prevState: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const parsed = readServiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const partialError = validatePartialPayment(parsed.data);
  if (partialError) return { error: partialError };

  const [technician, equipmentTypeResult] = await Promise.all([
    prisma.technician.findUnique({ where: { id: parsed.data.technicianId } }),
    resolveEquipmentTypeId(parsed.data),
  ]);
  if (!technician) return { error: "El técnico seleccionado no existe." };
  if ("error" in equipmentTypeResult) return { error: equipmentTypeResult.error };

  const isPartial = parsed.data.paymentMethod === "PARCIAL";

  await prisma.service.create({
    data: {
      clientName: sanitizeName(parsed.data.clientName, 150),
      clientPhone: parsed.data.clientPhone,
      title: sanitizeName(parsed.data.title, 150),
      description: parsed.data.description ?? "",
      diagnosis: parsed.data.diagnosis ?? "",
      solution: parsed.data.solution ?? "",
      equipmentBrand: parsed.data.equipmentBrand,
      equipmentModel: parsed.data.equipmentModel,
      equipmentTypeId: equipmentTypeResult.id,
      serviceDate: parsed.data.serviceDate,
      equipmentStage: "RECIBIDO",
      amount: Math.round(parsed.data.amount * 100) / 100,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: statusFor(parsed.data.paymentMethod),
      advanceAmount: isPartial ? Math.round((parsed.data.advanceAmount ?? 0) * 100) / 100 : null,
      advancePaymentMethod: isPartial ? (parsed.data.advancePaymentMethod ?? null) : null,
      technicianId: parsed.data.technicianId,
      photos: {
        create: (parsed.data.photos ?? []).map((p) => ({
          path: p.path,
          originalName: sanitizeName(p.originalName, 255) || p.originalName.slice(0, 255),
        })),
      },
    },
  });

  revalidatePath(PATH);
  return {};
}

export async function updateService(
  id: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const parsed = readServiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const partialError = validatePartialPayment(parsed.data);
  if (partialError) return { error: partialError };

  const [technician, equipmentTypeResult] = await Promise.all([
    prisma.technician.findUnique({ where: { id: parsed.data.technicianId } }),
    resolveEquipmentTypeId(parsed.data),
  ]);
  if (!technician) return { error: "El técnico seleccionado no existe." };
  if ("error" in equipmentTypeResult) return { error: equipmentTypeResult.error };

  const isPartial = parsed.data.paymentMethod === "PARCIAL";

  await prisma.service.update({
    where: { id },
    data: {
      clientName: sanitizeName(parsed.data.clientName, 150),
      clientPhone: parsed.data.clientPhone,
      title: sanitizeName(parsed.data.title, 150),
      description: parsed.data.description ?? "",
      diagnosis: parsed.data.diagnosis ?? "",
      solution: parsed.data.solution ?? "",
      equipmentBrand: parsed.data.equipmentBrand,
      equipmentModel: parsed.data.equipmentModel,
      equipmentTypeId: equipmentTypeResult.id,
      serviceDate: parsed.data.serviceDate,
      amount: Math.round(parsed.data.amount * 100) / 100,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: statusFor(parsed.data.paymentMethod),
      advanceAmount: isPartial ? Math.round((parsed.data.advanceAmount ?? 0) * 100) / 100 : null,
      advancePaymentMethod: isPartial ? (parsed.data.advancePaymentMethod ?? null) : null,
      balancePaymentMethod: isPartial ? undefined : null,
      technicianId: parsed.data.technicianId,
      // Los edits solo AGREGAN fotos (igual que el original) — quitar una es
      // su propia acción (deleteServicePhoto) para que un edit a medio
      // llenar nunca borre evidencia ya guardada en silencio.
      photos: {
        create: (parsed.data.photos ?? []).map((p) => ({
          path: p.path,
          originalName: sanitizeName(p.originalName, 255) || p.originalName.slice(0, 255),
        })),
      },
    },
  });

  revalidatePath(PATH);
  return {};
}

export async function deleteService(id: string): Promise<void> {
  const photos = await prisma.servicePhoto.findMany({ where: { serviceId: id }, select: { path: true } });
  await prisma.service.delete({ where: { id } });
  await Promise.all(photos.map((p) => deleteServicePhotoFileIfManaged(p.path)));
  revalidatePath(PATH);
}

export async function deleteServicePhoto(photoId: string): Promise<void> {
  const photo = await prisma.servicePhoto.findUnique({ where: { id: photoId } });
  if (!photo) return;
  await prisma.servicePhoto.delete({ where: { id: photoId } });
  await deleteServicePhotoFileIfManaged(photo.path);
  revalidatePath(PATH);
}

// ----------------------------- Pago: cambios rápidos ----------------------------- //

/** Selector rápido de forma de pago (en la tabla o el detalle). EFECTIVO/
 *  YAPE marcan pagado de inmediato y limpian cualquier adelanto previo;
 *  PENDIENTE resetea todo. PARCIAL no se acepta aquí — igual que el
 *  original, ese caso abre un modal aparte (ver registerPartialPayment)
 *  porque necesita el monto del adelanto. */
export async function changePaymentMethod(
  id: string,
  method: "EFECTIVO" | "YAPE" | "PENDIENTE"
): Promise<{ error?: string }> {
  await prisma.service.update({
    where: { id },
    data: {
      paymentMethod: method,
      paymentStatus: statusFor(method),
      advanceAmount: null,
      advancePaymentMethod: null,
      balancePaymentMethod: null,
    },
  });
  revalidatePath(PATH);
  return {};
}

export async function registerPartialPayment(
  id: string,
  data: { advanceAmount: number; advancePaymentMethod: PayNowMethod }
): Promise<{ error?: string }> {
  const service = await prisma.service.findUnique({ where: { id }, select: { amount: true } });
  if (!service) return { error: "El servicio ya no existe." };

  const error = validatePartialPayment({
    paymentMethod: "PARCIAL",
    amount: service.amount,
    advanceAmount: data.advanceAmount,
    advancePaymentMethod: data.advancePaymentMethod,
  });
  if (error) return { error };

  await prisma.service.update({
    where: { id },
    data: {
      paymentMethod: "PARCIAL",
      paymentStatus: "PARCIAL",
      advanceAmount: Math.round(data.advanceAmount * 100) / 100,
      advancePaymentMethod: data.advancePaymentMethod,
      balancePaymentMethod: null,
    },
  });
  revalidatePath(PATH);
  return {};
}

/** Cubre los dos casos del modal "Marcar como pagado" del original: un
 *  servicio PENDIENTE pasa a PAGADO con la forma elegida; un PARCIAL cobra
 *  su saldo y pasa a PAGADO, pero paymentMethod se queda en "PARCIAL" como
 *  registro histórico de que empezó como un adelanto. */
export async function collectPayment(id: string, method: PayNowMethod): Promise<{ error?: string }> {
  const service = await prisma.service.findUnique({ where: { id }, select: { paymentStatus: true } });
  if (!service) return { error: "El servicio ya no existe." };

  await prisma.service.update({
    where: { id },
    data:
      service.paymentStatus === "PARCIAL"
        ? { balancePaymentMethod: method, paymentStatus: "PAGADO" }
        : { paymentMethod: method, paymentStatus: "PAGADO" },
  });
  revalidatePath(PATH);
  return {};
}

// ----------------------------- Etapa del equipo ----------------------------- //

/** Cambia la etapa a cualquier valor MENOS "ENTREGADO" — ese caso pide la
 *  fecha de entrega, así que pasa por markAsDelivered en su lugar (mismo
 *  comportamiento que el selector del original, que reabre un modal en vez
 *  de aplicar el cambio directo cuando se elige "Entregado"). Igual que el
 *  original, retroceder de "Entregado" a cualquier otra etapa limpia la
 *  fecha de entrega. */
export async function changeEquipmentStage(
  id: string,
  stage: Exclude<EquipmentStage, "ENTREGADO">
): Promise<void> {
  await prisma.service.update({ where: { id }, data: { equipmentStage: stage, deliveryDate: null } });
  revalidatePath(PATH);
}

export async function markAsDelivered(id: string, deliveryDate: string): Promise<{ error?: string }> {
  if (!deliveryDate) return { error: "Selecciona la fecha de entrega." };
  await prisma.service.update({
    where: { id },
    data: { equipmentStage: "ENTREGADO", deliveryDate: new Date(deliveryDate) },
  });
  revalidatePath(PATH);
  return {};
}
