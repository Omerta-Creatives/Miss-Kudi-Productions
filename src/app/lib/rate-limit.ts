import { NextRequest, NextResponse } from "next/server";

export interface RateLimitProfile {
  /** Namespace prefix for bucket isolation */
  namespace: string;
  /** Maximum requests permitted within windowMs */
  limit: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
  retryAfterSeconds: number;
}

interface BucketEntry {
  timestamps: number[];
  expiresAt: number;
}

// Predefined security & operational rate-limit profiles
export const RATE_LIMIT_PROFILES = {
  /** Global API burst protection (per IP) */
  apiGlobal: {
    namespace: "api_global",
    limit: 120,
    windowMs: 60_000,
  },
  /** Sign-in credential attempts (per IP) */
  authLoginIp: {
    namespace: "auth_login_ip",
    limit: 10,
    windowMs: 60_000,
  },
  /** Sign-in credential attempts (per target email) */
  authLoginAccount: {
    namespace: "auth_login_account",
    limit: 6,
    windowMs: 60_000,
  },
  /** Password reset OTP generation & verification (per IP) */
  authRecoveryIp: {
    namespace: "auth_recovery_ip",
    limit: 8,
    windowMs: 15 * 60_000,
  },
  /** Password reset OTP generation & verification (per target email) */
  authRecoveryAccount: {
    namespace: "auth_recovery_account",
    limit: 5,
    windowMs: 15 * 60_000,
  },
  /** Authenticated password rotation & sign-out mutations */
  authMutation: {
    namespace: "auth_mutation",
    limit: 15,
    windowMs: 60_000,
  },
  /** Session validation checks */
  authSession: {
    namespace: "auth_session",
    limit: 60,
    windowMs: 60_000,
  },
  /** Public B2B quote submissions */
  inquirySubmit: {
    namespace: "inquiry_submit",
    limit: 8,
    windowMs: 10 * 60_000,
  },
  /** Public/internal order list reads */
  inquiryRead: {
    namespace: "inquiry_read",
    limit: 45,
    windowMs: 60_000,
  },
  /** Admin mutations (users, facilities, schema initialization) */
  adminWrite: {
    namespace: "admin_write",
    limit: 30,
    windowMs: 60_000,
  },
  /** Admin directory & branch reads */
  adminRead: {
    namespace: "admin_read",
    limit: 60,
    windowMs: 60_000,
  },
  /** Health check endpoint */
  healthRead: {
    namespace: "health_read",
    limit: 60,
    windowMs: 60_000,
  },
} as const satisfies Record<string, RateLimitProfile>;

const MAX_BUCKETS = 5_000;

const globalStore = globalThis as unknown as {
  __mkpRateLimitBuckets?: Map<string, BucketEntry>;
  __mkpRateLimitLastSweep?: number;
};

function getBuckets(): Map<string, BucketEntry> {
  if (!globalStore.__mkpRateLimitBuckets) {
    globalStore.__mkpRateLimitBuckets = new Map<string, BucketEntry>();
  }
  return globalStore.__mkpRateLimitBuckets;
}

function sweepExpiredBuckets(now: number) {
  const lastSweep = globalStore.__mkpRateLimitLastSweep || 0;
  const buckets = getBuckets();
  if (now - lastSweep < 30_000 && buckets.size < MAX_BUCKETS) {
    return;
  }
  globalStore.__mkpRateLimitLastSweep = now;
  for (const [key, entry] of buckets.entries()) {
    if (entry.expiresAt <= now) {
      buckets.delete(key);
    }
  }
  // Bound memory if under heavy spoofed-key flood
  if (buckets.size > MAX_BUCKETS) {
    const excess = buckets.size - MAX_BUCKETS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

export function getClientIdentifier(request: Request | NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp.slice(0, 80);
  }
  const realIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for");
  if (realIp) {
    return realIp.split(",")[0].trim().slice(0, 80);
  }
  const ua = (request.headers.get("user-agent") || "unknown-ua").slice(0, 64);
  return `local:${ua}`;
}

export function checkRateLimit(
  profile: RateLimitProfile,
  identifier: string
): RateLimitResult {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const buckets = getBuckets();
  const key = `${profile.namespace}:${identifier.toLowerCase()}`;
  const cutoff = now - profile.windowMs;

  const existing = buckets.get(key);
  const activeTimestamps = existing
    ? existing.timestamps.filter((ts) => ts > cutoff)
    : [];

  if (activeTimestamps.length >= profile.limit) {
    const oldestInWindow = activeTimestamps[0] || now;
    const resetMs = oldestInWindow + profile.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000));
    buckets.set(key, {
      timestamps: activeTimestamps,
      expiresAt: now + profile.windowMs,
    });
    return {
      allowed: false,
      limit: profile.limit,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds,
    };
  }

  activeTimestamps.push(now);
  const resetMs = activeTimestamps[0] + profile.windowMs;
  buckets.set(key, {
    timestamps: activeTimestamps,
    expiresAt: now + profile.windowMs,
  });

  return {
    allowed: true,
    limit: profile.limit,
    remaining: Math.max(0, profile.limit - activeTimestamps.length),
    resetAtEpochSeconds: Math.ceil(resetMs / 1000),
    retryAfterSeconds: 0,
  };
}

export function attachRateLimitHeaders<T extends Response | NextResponse>(
  response: T,
  result: RateLimitResult
): T {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetAtEpochSeconds));
  if (!result.allowed && result.retryAfterSeconds > 0) {
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
  }
  return response;
}

export function buildRateLimitExceededResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const response = NextResponse.json(
    {
      ok: false,
      rateLimited: true,
      retryAfterSeconds: result.retryAfterSeconds,
      error:
        customMessage ||
        `Too many requests. Please wait ${result.retryAfterSeconds}s before trying again.`,
    },
    { status: 429 }
  );
  return attachRateLimitHeaders(response, result);
}

/**
 * Convenience guard for API route handlers. Returns a 429 NextResponse when
 * blocked, or `{ blocked: null, result }` when permitted so callers can attach headers.
 */
export function enforceRequestRateLimit(
  request: Request | NextRequest,
  profile: RateLimitProfile,
  secondaryKey?: string,
  customMessage?: string
): { blocked: NextResponse | null; result: RateLimitResult } {
  const ip = getClientIdentifier(request);
  const compositeKey = secondaryKey ? `${ip}:${secondaryKey}` : ip;
  const result = checkRateLimit(profile, compositeKey);
  if (!result.allowed) {
    return {
      blocked: buildRateLimitExceededResponse(result, customMessage),
      result,
    };
  }
  return { blocked: null, result };
}
