"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encryptPII, decryptPII, blindIndex } from "@/lib/crypto";
import { digitsOnly, sanitizeName } from "@/lib/sanitize";
import { requireSession } from "@/lib/requireSession";
import { logAudit } from "@/lib/audit";

export interface AdminRepair {
  id: string;
  code: string;
  dni: string;
  equipment: string;
  problem: string;
  progress: number;
  statusText: string;
  lastUpdate: Date;
  createdAt: Date;
}

/** Same defensive fallback as pedidos/actions.ts's safeDecryptPhone — a row
 *  written before encryption existed (or corrupted) shouldn't crash the list. */
function safeDecryptDni(stored: string): string {
  try {
    return decryptPII(stored);
  } catch {
    return "⚠ no se pudo descifrar";
  }
}

async function nextRepairCode(): Promise<string> {
  const count = await prisma.repair.count();
  return `INF${String(count + 1).padStart(3, "0")}`;
}

export async function getAdminRepairs(dniQuery?: string): Promise<AdminRepair[]> {
  const session = await requireSession();

  const where = dniQuery ? { dniIndex: blindIndex(digitsOnly(dniQuery)) } : {};

  const repairs = await prisma.repair.findMany({ where, orderBy: { createdAt: "desc" } });

  if (repairs.length > 0) {
    await logAudit({
      action: "DATA_ACCESS",
      adminId: session.sub,
      username: session.username,
      details: dniQuery 
        ? `Búsqueda de reparaciones por DNI: ${dniQuery}`
        : "Consulta general de lista de reparaciones (DNIs descifrados)",
    });
  }

  return repairs.map((r) => ({
    id: r.id,
    code: r.code,
    dni: safeDecryptDni(r.dniEncrypted),
    equipment: r.equipment,
    problem: r.problem,
    progress: r.progress,
    statusText: r.statusText,
    lastUpdate: r.lastUpdate,
    createdAt: r.createdAt,
  }));
}

export interface RepairFormState {
  error?: string;
}

const repairSchema = z.object({
  dni: z.string().trim().min(1, "El DNI es obligatorio").max(20),
  equipment: z.string().trim().min(1, "El equipo es obligatorio").max(150),
  problem: z.string().trim().min(1, "El problema es obligatorio").max(1000),
});

export async function createRepair(
  _prevState: RepairFormState,
  formData: FormData
): Promise<RepairFormState> {
  const parsed = repairSchema.safeParse({
    dni: formData.get("dni"),
    equipment: formData.get("equipment"),
    problem: formData.get("problem"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const dniDigits = digitsOnly(parsed.data.dni);
  if (!dniDigits) return { error: "El DNI debe contener números." };

  const code = await nextRepairCode();
  await prisma.repair.create({
    data: {
      code,
      dniEncrypted: encryptPII(dniDigits),
      dniIndex: blindIndex(dniDigits),
      equipment: sanitizeName(parsed.data.equipment, 150),
      problem: parsed.data.problem,
      progress: 0,
      statusText: "Recibido",
    },
  });

  revalidatePath("/taller-control/reparaciones");
  return {};
}

export async function updateRepairProgress(id: string, progress: number, statusText: string): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  await prisma.repair.update({
    where: { id },
    data: { progress: clamped, statusText: sanitizeName(statusText, 100) || "Sin estado", lastUpdate: new Date() },
  });
  revalidatePath("/taller-control/reparaciones");
}

export async function deleteRepair(id: string): Promise<void> {
  await prisma.repair.delete({ where: { id } });
  revalidatePath("/taller-control/reparaciones");
}
