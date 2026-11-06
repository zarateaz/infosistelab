/**
 * lib/rateLimit.ts
 * In-memory, per-IP rate limiter. Single-process only (fine for `next start`
 * on one VPS instance) — swap for Redis if this ever runs multi-instance.
 *
 * Only trusts the `x-real-ip` header, which Nginx overwrites with
 * $remote_addr on every request — a client cannot forge it. Deliberately
 * does NOT fall back to X-Forwarded-For (client-settable, trivial bypass).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
  lastSeen: number;
}

const store = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 50_000;

function evictOldestEntries(): void {
  const entries = Array.from(store.entries()).sort(([, a], [, b]) => a.lastSeen - b.lastSeen);
  const toEvict = Math.floor(entries.length * 0.2);
  for (let i = 0; i < toEvict; i++) store.delete(entries[i][0]);
}

setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of store) {
      if (record.resetAt < now && (!record.blockedUntil || record.blockedUntil < now)) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts = 20,
  windowMs = 60 * 1000,
  blockMs?: number
): RateLimitResult {
  const now = Date.now();
  const blockDuration = blockMs ?? windowMs;
  const record = store.get(key);

  if (record?.blockedUntil && record.blockedUntil > now) {
    record.lastSeen = now;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (!record || record.resetAt < now) {
    if (!record && store.size >= MAX_STORE_SIZE) evictOldestEntries();
    store.set(key, { count: 1, resetAt: now + windowMs, lastSeen: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  record.count++;
  record.lastSeen = now;

  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDuration;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(blockDuration / 1000) };
  }

  return { allowed: true, remaining: maxAttempts - record.count };
}

/**
 * Real client IP — trusts ONLY x-real-ip (set by Nginx from $remote_addr).
 * Returns "unknown" for direct/local connections that bypass Nginx (e.g.
 * `npm run dev`), which the rate limiter then just treats as one shared
 * bucket. Accepts either a `Request` (API routes) or the `next/headers()`
 * result (Server Actions) — both expose the same `.get(name)` shape.
 */
type HeadersLike = { get(name: string): string | null };

export function getClientIP(source: Request | HeadersLike): string {
  // Duck-type on an actually-callable `.get` rather than "does a `headers`
  // property exist" — Next's ReadonlyHeaders has its own internal `headers`
  // field, so that check was true for BOTH cases and grabbed the wrong thing.
  const headers: HeadersLike =
    typeof (source as HeadersLike).get === "function" ? (source as HeadersLike) : (source as Request).headers;
  const xRealIP = headers.get("x-real-ip");
  if (xRealIP) return xRealIP.trim().split(",")[0].trim();
  return "unknown";
}

/** Namespaced key so different endpoints don't share the same bucket. */
export function rateLimitKey(namespace: string, ip: string): string {
  return `${namespace}:${ip}`;
}
