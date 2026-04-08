/**
 * env.ts — Typed environment variable access
 *
 * Single source of truth for all env var reads in the application.
 * Centralises validation and makes environment dependencies explicit.
 *
 * Rules:
 *  - Server-side vars (no NEXT_PUBLIC_ prefix): only access in API routes / server components
 *  - Client-side vars (NEXT_PUBLIC_ prefix): safe to use anywhere
 *  - Never import this in a client component for server-only vars — it will throw at runtime
 *
 * Phase 1.1 — Environment Architecture
 */

// ─── Client-safe ──────────────────────────────────────────────────────────────

/**
 * Returns true when the app is running in demo mode.
 *
 * Demo mode:   NEXT_PUBLIC_DEMO_MODE=true
 *   → hardcoded demo clients and scenario data are active
 *   → no real DB or ERP connection required
 *
 * Production:  NEXT_PUBLIC_DEMO_MODE=false (or unset)
 *   → all data must come from Turso DB via the repository layer (Phase 1.5)
 *   → demo data modules return empty/null — delivery team fills in DB calls
 */
export function isDemoMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Returns the current runtime environment label.
 * Safe to call on both client and server.
 */
export function getAppEnv(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development';
}

// ─── Server-only ──────────────────────────────────────────────────────────────
// These throw at runtime if called from client-side code.

/**
 * JWT signing secret. Server-side only.
 * Used in: src/lib/auth.ts
 */
export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('[THABAT] JWT_SECRET is not set. See .env.example.');
    return secret;
}

/**
 * Turso database URL. Server-side only.
 * Used in: src/db/index.ts
 */
export function getTursoUrl(): string {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('[THABAT] TURSO_DATABASE_URL is not set. See .env.example.');
    return url;
}

/**
 * Turso auth token. Server-side only.
 * Used in: src/db/index.ts
 */
export function getTursoToken(): string {
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!token) throw new Error('[THABAT] TURSO_AUTH_TOKEN is not set. See .env.example.');
    return token;
}

/**
 * Admin key for /api/admin/* routes. Server-side only.
 */
export function getAdminKey(): string {
    const key = process.env.THABAT_ADMIN_KEY;
    if (!key) throw new Error('[THABAT] THABAT_ADMIN_KEY is not set. See .env.example.');
    return key;
}

/**
 * Sentry DSN for error tracking. Server-side only.
 * Returns undefined if not configured (Sentry is optional in Phase 1.8).
 */
export function getSentryDsn(): string | undefined {
    return process.env.SENTRY_DSN || undefined;
}

/**
 * AES-256 key for ERP credential encryption. Server-side only.
 * Used in: src/lib/crypto.ts
 * Must be exactly 64 hex characters (32 bytes).
 */
export function getErpEncryptionKey(): string {
    const key = process.env.ERP_ENCRYPTION_KEY;
    if (!key) throw new Error('[THABAT] ERP_ENCRYPTION_KEY is not set. See .env.example.');
    if (key.length !== 64) {
        throw new Error('[THABAT] ERP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
    }
    return key;
}
