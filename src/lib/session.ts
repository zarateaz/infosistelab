/**
 * lib/session.ts
 * Admin session JWTs, signed/verified with `jose` — pure WebCrypto, so this
 * file is safe to import from both Node routes/Server Actions AND
 * `proxy.ts` (Edge runtime). Password hashing (Node-only `scrypt`) lives in
 * `lib/auth.ts` instead; never merge the two files.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "infosistel_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h — short-lived, re-login after a workday

interface SessionPayload extends JWTPayload {
  sub: string; // Admin.id
  username: string;
  role: string; // "admin" or "superadmin" — see Admin.role
  v: number; // tokenVersion
}

function getSecretKey() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.v !== "number"
    ) {
      return null;
    }
    return { sub: payload.sub, username: payload.username, role: payload.role, v: payload.v };
  } catch {
    // Expired, malformed, or wrong-signature token — all treated the same:
    // no session.
    return null;
  }
}

// Fase 6 — MFA (V4.3.1). A separate cookie/claim shape from the real
// session above, on purpose: verifySessionToken() rejects this token
// outright (no `username`/`role` claims), so proxy.ts can never mistake a
// password-only, not-yet-second-factor login for an authenticated one.
export const MFA_PENDING_COOKIE = "infosistel_mfa_pending";
const MFA_PENDING_TTL_SECONDS = 60 * 5; // 5 min — just long enough to type a code

interface MfaPendingPayload extends JWTPayload {
  sub: string; // Admin.id
  mfaPending: true;
}

export async function createMfaPendingToken(adminId: string): Promise<string> {
  return new SignJWT({ sub: adminId, mfaPending: true } satisfies MfaPendingPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyMfaPendingToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.mfaPending !== true || typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
