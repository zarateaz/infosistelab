/**
 * lib/crypto.ts
 * Fase 4 — cifrado de datos personales. AES-256-GCM (authenticated —
 * detects tampering, not just confidentiality) for PII at rest, plus a
 * deterministic HMAC "blind index" so an exact-match lookup (e.g. find
 * past orders by phone) doesn't require decrypting every row to compare.
 *
 * Node-runtime only (`node:crypto`) — same reasoning as lib/auth.ts.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce — the size GCM is designed for

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars) — see .env.example.");
  }
  return key;
}

/** Returns "iv:authTag:ciphertext", all hex. Store the whole string. */
export function encryptPII(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptPII(stored: string): string {
  const [ivHex, authTagHex, cipherHex] = stored.split(":");
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("Malformed encrypted value — expected 'iv:authTag:ciphertext'.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Deterministic HMAC-SHA256 for exact-match search on an encrypted column
 * (AES-GCM ciphertext is non-deterministic by design — a WHERE clause can
 * never match it directly). Only ever compare this for equality; never
 * treat it as reversible, and never rotate DNI_HMAC_SECRET once real data
 * has been indexed with it — every existing row's index would stop
 * matching new lookups (see .env.example).
 */
export function blindIndex(value: string): string {
  return createHmac("sha256", env.DNI_HMAC_SECRET).update(value).digest("hex");
}
