import { NextRequest, NextResponse } from "next/server";
import {
  ArtisanRole,
  ArtisanStaff,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  sanitizeSpecialtyText,
  UserAccessTier,
} from "./production-os";
import { executeSqlQuery, getDatabaseConnectionString } from "./database";

export const SESSION_COOKIE_DEV = "mkp_session";
export const SESSION_COOKIE_SECURE = "__Host-mkp_session";

export const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const SHIFT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8-hour factory shift
export const RESET_CODE_TTL_SECONDS = 60 * 15; // 15 minutes
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface SessionTokenPayload {
  sid: string;
  sub: string;
  email: string;
  name: string;
  accessTier: UserAccessTier;
  role: ArtisanRole;
  branchId: string;
  branchName: string;
  station: string;
  specialty: string;
  rememberMe: boolean;
  iat: number;
  exp: number;
}

// Seeded fallback credentials for initial Superadmin & Admin accounts before custom DB password reset
const SEEDED_DEFAULT_PASSWORDS: Record<string, string> = {
  "demolablaze@gmail.com": "$Omerta93",
  "kudi@kproductions.com": "misskudi",
};

function getAuthSecret(): string {
  const candidates = [
    process.env.AUTH_SECRET?.trim(),
    process.env.AUTH_SESSION_SECRET?.trim(),
    process.env.DATABASE_URL?.trim(),
  ];
  for (const c of candidates) {
    if (c && c.length >= 16) {
      return `mkp-hmac-v1:${c}`;
    }
  }
  return "mkp-hmac-v1:miss-kudi-productions-lagos-atelier-secret-key-2026";
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) return new Uint8Array();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toBase64Url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64UrlToString(b64url: string): string {
  const padded =
    b64url.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

async function hmacSha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return bytesToHex(new Uint8Array(digest));
}

/**
 * PBKDF2-SHA256 password hashing (Web Crypto compatible across Node & Edge Proxy).
 * Format: pbkdf2_sha256$120000$<saltHex>$<derivedHex>
 */
export async function hashPassword(password: string): Promise<string> {
  const iterations = 120000;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return `pbkdf2_sha256$${iterations}$${bytesToHex(salt)}$${bytesToHex(
    new Uint8Array(bits)
  )}`;
}

export async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith("pbkdf2_sha256$")) {
    return false;
  }
  const parts = storedHash.split("$");
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expectedHex = parts[3];
  if (!iterations || salt.length === 0 || !expectedHex) return false;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const actualHex = bytesToHex(new Uint8Array(bits));
  return timingSafeEqualString(actualHex, expectedHex);
}

export function verifySeededDefaultPassword(
  email: string,
  password: string
): boolean {
  const clean = email.trim().toLowerCase();
  const expected = SEEDED_DEFAULT_PASSWORDS[clean];
  if (!expected) return false;
  return timingSafeEqualString(password, expected);
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

export async function createSessionToken(
  user: ArtisanStaff,
  rememberMe: boolean,
  sessionId?: string
): Promise<{ token: string; payload: SessionTokenPayload }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = rememberMe
    ? REMEMBER_ME_MAX_AGE_SECONDS
    : SHIFT_SESSION_MAX_AGE_SECONDS;
  const payload: SessionTokenPayload = {
    sid:
      sessionId ||
      `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    sub: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    accessTier: user.accessTier,
    role: user.role,
    branchId: user.branchId,
    branchName: user.branchName,
    station: user.station,
    specialty: user.specialty,
    rememberMe,
    iat: nowSec,
    exp: nowSec + ttl,
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = await hmacSha256Hex(encoded);
  return {
    token: `${encoded}.${sig}`,
    payload,
  };
}

export async function verifySessionToken(
  token?: string | null
): Promise<SessionTokenPayload | null> {
  if (!token || !token.includes(".")) return null;
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);

  try {
    const expectedSig = await hmacSha256Hex(encoded);
    if (!timingSafeEqualString(providedSig, expectedSig)) {
      return null;
    }
    const parsed = JSON.parse(
      fromBase64UrlToString(encoded)
    ) as SessionTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!parsed.exp || parsed.exp <= nowSec || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function payloadToArtisan(payload: SessionTokenPayload): ArtisanStaff {
  const seed = INITIAL_ARTISANS.find(
    (a) => a.email.toLowerCase() === payload.email.toLowerCase()
  );
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    accessTier: payload.accessTier,
    role: payload.role,
    branchId: payload.branchId || INITIAL_BRANCHES[0].id,
    branchName: payload.branchName || INITIAL_BRANCHES[0].name,
    specialty: sanitizeSpecialtyText(
      payload.specialty || seed?.specialty || "Garment Operations"
    ),
    station: payload.station || seed?.station || "Main Factory Floor",
    activeRuns: seed?.activeRuns ?? 0,
    unitsCompletedMonth: seed?.unitsCompletedMonth ?? 0,
    qcPassRate: seed?.qcPassRate ?? 99.5,
    shiftStatus: "CLOCKED_IN",
    status:
      payload.accessTier === "superadmin"
        ? "Executive HQ"
        : payload.role === "pattern_designer"
        ? "Pattern Studio"
        : payload.role === "quality_control"
        ? "QC Station"
        : "Active on Floor",
  };
}

export function isHttpsRequest(request: Request | NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/**
 * Attaches __Host-mkp_session (HTTPS) or mkp_session (HTTP localhost) cookie.
 * When rememberMe is true: 30-day persistent cookie.
 * When rememberMe is false: browser-session cookie (omits Max-Age so closing browser clears it).
 */
export function attachSessionCookie(
  response: NextResponse,
  request: Request | NextRequest,
  token: string,
  rememberMe: boolean
): void {
  const secure = isHttpsRequest(request);
  const cookieName = secure ? SESSION_COOKIE_SECURE : SESSION_COOKIE_DEV;

  response.cookies.set({
    name: cookieName,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    priority: "high",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });
}

export function clearSessionCookies(
  response: NextResponse,
  request: Request | NextRequest
): void {
  const secure = isHttpsRequest(request);
  response.cookies.set({
    name: SESSION_COOKIE_DEV,
    value: "",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  if (secure) {
    response.cookies.set({
      name: SESSION_COOKIE_SECURE,
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export function extractSessionTokenFromRequest(
  request: Request | NextRequest
): string | null {
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    return (
      request.cookies.get(SESSION_COOKIE_SECURE)?.value ||
      request.cookies.get(SESSION_COOKIE_DEV)?.value ||
      null
    );
  }
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE_SECURE || rawKey === SESSION_COOKIE_DEV) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export async function requireAuthenticatedSession(
  request: Request | NextRequest,
  allowedTiers?: UserAccessTier[]
): Promise<
  | { session: SessionTokenPayload; denied: null }
  | { session: null; denied: NextResponse }
> {
  const token = extractSessionTokenFromRequest(request);
  const session = await verifySessionToken(token);
  if (!session) {
    return {
      session: null,
      denied: NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      ),
    };
  }
  if (allowedTiers && !allowedTiers.includes(session.accessTier)) {
    return {
      session: null,
      denied: NextResponse.json(
        { ok: false, error: "Insufficient permissions for this action." },
        { status: 403 }
      ),
    };
  }
  return { session, denied: null };
}

/**
 * modern-web-guidance (security §3.7): Fetch Metadata Resource Isolation
 * Rejects cross-site mutating requests before auth checks to prevent CSRF & timing leaks.
 */
export function guardSameOriginMutation(
  request: Request
): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) {
    const res = NextResponse.json(
      { ok: false, error: "Cross-site mutation rejected by resource isolation policy." },
      { status: 403 }
    );
    res.headers.set("Vary", "Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site");
    return res;
  }
  return null;
}

/**
 * Generates a 6-digit numeric OTP and an HMAC-sealed stateless challenge
 * so password recovery works both with PostgreSQL and in offline/local sandboxes.
 */
export async function createResetOtpChallenge(email: string): Promise<{
  code: string;
  codeHash: string;
  expiresAtMs: number;
  resetChallenge: string;
}> {
  const randomBuf = new Uint32Array(1);
  crypto.getRandomValues(randomBuf);
  const numeric = 100000 + (randomBuf[0] % 900000);
  const code = String(numeric);
  const cleanEmail = email.trim().toLowerCase();
  const expiresAtMs = Date.now() + RESET_CODE_TTL_SECONDS * 1000;
  const codeHash = await sha256Hex(`${cleanEmail}:${code}`);
  const seal = await hmacSha256Hex(`reset:${cleanEmail}:${code}:${expiresAtMs}`);

  return {
    code,
    codeHash,
    expiresAtMs,
    resetChallenge: `${expiresAtMs}.${seal}`,
  };
}

export async function verifyResetOtpChallenge(
  email: string,
  code: string,
  resetChallenge?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, reason: "Please enter the 6-digit verification code." };
  }

  // 1. Check PostgreSQL password_reset_tokens first if database is reachable
  if (getDatabaseConnectionString()) {
    try {
      await ensureAuthSchema();
      const codeHash = await sha256Hex(`${cleanEmail}:${cleanCode}`);
      const { rows } = await executeSqlQuery<{
        id: string;
        expires_at: string;
        used_at: string | null;
      }>(
        `SELECT id, expires_at, used_at
         FROM password_reset_tokens
         WHERE email = $1 AND code_hash = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [cleanEmail, codeHash]
      );

      if (rows.length > 0) {
        const tokenRow = rows[0];
        if (tokenRow.used_at) {
          return {
            valid: false,
            reason: "This verification code has already been used. Request a fresh code.",
          };
        }
        if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
          return {
            valid: false,
            reason: "This verification code has expired. Request a new 6-digit code.",
          };
        }
        await executeSqlQuery(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
          [tokenRow.id]
        );
        return { valid: true };
      }
    } catch {
      // Fall through to HMAC challenge verification if database network is unreachable
    }
  }

  // 2. Cryptographic HMAC challenge verification (hybrid / local fallback)
  if (!resetChallenge || !resetChallenge.includes(".")) {
    return {
      valid: false,
      reason: "Invalid or expired verification code. Please request a new reset code.",
    };
  }
  const [expRaw, providedSeal] = resetChallenge.split(".");
  const expMs = Number(expRaw);
  if (!expMs || !providedSeal || Date.now() > expMs) {
    return {
      valid: false,
      reason: "Verification code expired (15-minute window). Please request a new code.",
    };
  }
  const expectedSeal = await hmacSha256Hex(
    `reset:${cleanEmail}:${cleanCode}:${expMs}`
  );
  if (!timingSafeEqualString(providedSeal, expectedSeal)) {
    return {
      valid: false,
      reason: "Incorrect 6-digit verification code. Check the digits and try again.",
    };
  }
  return { valid: true };
}

let authSchemaEnsured = false;

/**
 * Idempotently upgrades PostgreSQL with password_hash, lockout tracking,
 * auth_sessions, and password_reset_tokens tables.
 */
export async function ensureAuthSchema(): Promise<void> {
  if (authSchemaEnsured || !getDatabaseConnectionString()) return;

  const statements = [
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      access_tier TEXT NOT NULL,
      remember_me BOOLEAN NOT NULL DEFAULT FALSE,
      user_agent TEXT NOT NULL DEFAULT '',
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ];

  for (const sql of statements) {
    await executeSqlQuery(sql);
  }
  authSchemaEnsured = true;
}
