/**
 * lib/auth.ts
 * Password hashing for the admin account. Uses Node's built-in `scrypt`
 * (NIST-recommended KDF) instead of bcrypt/argon2 — no extra native
 * dependency to audit, matching this project's dependency-minimalism
 * (see docs/security/hardening-log.md #5).
 *
 * Node-runtime only (`node:crypto`) — never import this from `proxy.ts`,
 * which runs in the Edge runtime. JWT session logic lives in `lib/session.ts`
 * instead, which only needs `jose` (Edge-safe).
 */
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Fixed salt used only to burn realistic CPU time when a username doesn't
// exist, so login response time doesn't leak which usernames are valid.
const DUMMY_SALT = Buffer.alloc(16, 7);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  if (derivedKey.length !== storedHash.length) return false;
  return timingSafeEqual(derivedKey, storedHash);
}

/** Call when no matching admin was found, so a bad username and a bad
 *  password take the same amount of time to reject. */
export function burnPasswordCheckTime(password: string): void {
  scryptSync(password, DUMMY_SALT, KEY_LENGTH);
}
