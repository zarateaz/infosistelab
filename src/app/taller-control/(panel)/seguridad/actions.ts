"use server";

import { toDataURL } from "qrcode";
import { prisma } from "@/lib/prisma";
import { encryptPII, decryptPII } from "@/lib/crypto";
import { hashPassword } from "@/lib/auth";
import { requireSession } from "@/lib/requireSession";
import { generateTotpSecret, buildOtpAuthUri, verifyTotpToken, generateRecoveryCodes } from "@/lib/totp";

export interface MfaStatus {
  enabled: boolean;
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const session = await requireSession();
  const admin = await prisma.admin.findUnique({ where: { id: session.sub }, select: { totpEnabled: true } });
  return { enabled: admin?.totpEnabled ?? false };
}

export interface EnrollmentStart {
  qrDataUrl: string;
  manualKey: string;
}

// Stores the new secret right away (with totpEnabled still false), so
// confirmEnrollment() below only needs the 6-digit code, not the secret
// round-tripped back from the client.
export async function beginEnrollment(): Promise<EnrollmentStart> {
  const session = await requireSession();
  const secret = generateTotpSecret();
  await prisma.admin.update({
    where: { id: session.sub },
    data: { totpSecret: encryptPII(secret), totpEnabled: false },
  });
  const otpauthUri = buildOtpAuthUri(session.username, secret);
  const qrDataUrl = await toDataURL(otpauthUri, { margin: 1, width: 240 });
  return { qrDataUrl, manualKey: secret };
}

export interface CodeResult {
  error?: string;
  recoveryCodes?: string[];
}

async function hashRecoveryCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((code) => hashPassword(code)));
  return hashes.join(",");
}

export async function confirmEnrollment(code: string): Promise<CodeResult> {
  const session = await requireSession();
  const admin = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (!admin?.totpSecret) return { error: "Genera un código QR primero." };
  if (!verifyTotpToken(decryptPII(admin.totpSecret), code)) {
    return { error: "Código incorrecto. Verifica la hora de tu teléfono." };
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.admin.update({
    where: { id: session.sub },
    data: { totpEnabled: true, recoveryCodesHash: await hashRecoveryCodes(recoveryCodes) },
  });
  return { recoveryCodes };
}

async function verifyCurrentCode(adminId: string, code: string): Promise<boolean> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin?.totpSecret) return false;
  return verifyTotpToken(decryptPII(admin.totpSecret), code);
}

export async function disableMfa(code: string): Promise<{ error?: string }> {
  const session = await requireSession();
  if (!(await verifyCurrentCode(session.sub, code))) return { error: "Código incorrecto." };
  await prisma.admin.update({
    where: { id: session.sub },
    data: { totpEnabled: false, totpSecret: null, recoveryCodesHash: null },
  });
  return {};
}

export async function regenerateRecoveryCodes(code: string): Promise<CodeResult> {
  const session = await requireSession();
  if (!(await verifyCurrentCode(session.sub, code))) return { error: "Código incorrecto." };
  const recoveryCodes = generateRecoveryCodes();
  await prisma.admin.update({
    where: { id: session.sub },
    data: { recoveryCodesHash: await hashRecoveryCodes(recoveryCodes) },
  });
  return { recoveryCodes };
}
