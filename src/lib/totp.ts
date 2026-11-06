/**
 * lib/totp.ts
 * TOTP (RFC 6238) second factor for the admin panel — closes ASVS V4.3.1.
 * `otpauth` is pure JS (no native deps, same dependency-minimalism as
 * lib/auth.ts and lib/crypto.ts). Node-runtime only — never import from
 * proxy.ts.
 */
import { randomBytes } from "node:crypto";
import { TOTP, Secret } from "otpauth";

const ISSUER = "Infosistel";
const RECOVERY_CODE_COUNT = 8;

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function buildOtpAuthUri(username: string, base32Secret: string): string {
  const totp = new TOTP({ issuer: ISSUER, label: username, secret: Secret.fromBase32(base32Secret) });
  return totp.toString();
}

/** Accepts a 6-digit code within one 30s step of drift either side. */
export function verifyTotpToken(base32Secret: string, token: string): boolean {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const totp = new TOTP({ issuer: ISSUER, secret: Secret.fromBase32(base32Secret) });
  return totp.validate({ token: cleaned, window: 1 }) !== null;
}

/** 8 one-time codes, "XXXX-XXXX" using an unambiguous alphabet (no 0/O/1/I). */
export function generateRecoveryCodes(): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const bytes = randomBytes(8);
    let raw = "";
    for (const b of bytes) raw += alphabet[b % alphabet.length];
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
