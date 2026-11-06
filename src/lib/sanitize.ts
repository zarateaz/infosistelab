/**
 * lib/sanitize.ts
 * Input sanitization for anything that reaches the database from a public,
 * unauthenticated form (Prisma's parameterized queries already prevent SQL
 * injection — this is about data quality and XSS-safety at the app layer).
 */

export function sanitizeName(input: unknown, maxLength = 100): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>&"'`\\]/g, "");
}

export function sanitizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[^0-9+\-\s()]/g, "").slice(0, 20).trim();
}

/** Digits only, for the phone blind index (lib/crypto.ts) — so "987 654
 *  321" and "(987)654-321" hash to the same lookup value. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

export function sanitizeInt(input: unknown, min = 0, max = 100_000): number | null {
  const n = parseInt(String(input), 10);
  if (isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}
