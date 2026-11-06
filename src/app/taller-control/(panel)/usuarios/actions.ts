"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

export interface AdminUser {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireSuperAdmin();
  return prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, createdAt: true },
  });
}

export interface AdminUserFormState {
  error?: string;
  success?: boolean;
}

const adminUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(64),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres").max(256),
  role: z.enum(["admin", "superadmin"]),
});

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

export async function createAdminUser(
  _prevState: AdminUserFormState,
  formData: FormData
): Promise<AdminUserFormState> {
  await requireSuperAdmin();

  const parsed = adminUserSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const passwordHash = await hashPassword(parsed.data.password);
  try {
    await prisma.admin.create({
      data: { username: parsed.data.username, passwordHash, role: parsed.data.role },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "Ya existe un usuario con ese nombre." };
    throw err;
  }

  revalidatePath("/taller-control/usuarios");
  return { success: true };
}

export async function deleteAdminUser(id: string): Promise<void> {
  const session = await requireSuperAdmin();

  if (id === session.sub) {
    throw new Error("No puedes eliminar tu propia cuenta.");
  }

  const target = await prisma.admin.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "superadmin") {
    const superAdminCount = await prisma.admin.count({ where: { role: "superadmin" } });
    if (superAdminCount <= 1) {
      throw new Error("No puedes eliminar al último superadministrador.");
    }
  }

  await prisma.admin.delete({ where: { id } });
  revalidatePath("/taller-control/usuarios");
}
