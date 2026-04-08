/**
 * rateLimit.ts — In-process sliding-window rate limiter
 *
 * Free, zero-dependency implementation using a Map with TTL entries.
 * Suitable for single-instance deployments (pilot / delivery team setup).
 *
 * NOTE for delivery team: For multi-instance / serverless deployments,
 * replace this with an Upstash Redis rate limiter (free tier available).
 * The function signature is intentionally compatible with @upstash/ratelimit.
 *
 * Phase 1.2 — Security Hardening
 */

interface WindowEntry {
    count: number;
    resetAt: number; // Unix ms
}

// Singleton store — survives across requests in the same process
const store = new Map<string, WindowEntry>();

// Periodic cleanup to prevent unbounded growth (runs at most once per minute)
let lastCleanup = 0;
function maybeCleanup(): void {
    const now = Date.now();
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
    }
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number; // Unix ms
    retryAfterMs: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key      - Unique identifier (e.g. "login:1.2.3.4", "metrics:org-id")
 * @param limit    - Max requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    maybeCleanup();

    const now = Date.now();
    const entry = store.get(key);

    // New or expired window
    if (!entry || now > entry.resetAt) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return { success: true, remaining: limit - 1, resetAt, retryAfterMs: 0 };
    }

    // Window active — check limit
    if (entry.count >= limit) {
        return {
            success: false,
            remaining: 0,
            resetAt: entry.resetAt,
            retryAfterMs: entry.resetAt - now,
        };
    }

    entry.count++;
    return {
        success: true,
        remaining: limit - entry.count,
        resetAt: entry.resetAt,
        retryAfterMs: 0,
    };
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** 5 login attempts per IP per 15 minutes */
export function rateLimitLogin(ip: string): RateLimitResult {
    return rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
}

/** 3 signup attempts per IP per hour */
export function rateLimitSignup(ip: string): RateLimitResult {
    return rateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
}

/** 60 metrics ingestion calls per org per hour */
export function rateLimitMetrics(orgId: string): RateLimitResult {
    return rateLimit(`metrics:${orgId}`, 60, 60 * 60 * 1000);
}

/** 10 ERP integration calls (save or sync) per org per hour */
export function rateLimitIntegrations(orgId: string): RateLimitResult {
    return rateLimit(`integrations:${orgId}`, 10, 60 * 60 * 1000);
}

// ─── Response helper ─────────────────────────────────────────────────────────

/**
 * Returns a 429 JSON response with Retry-After header.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSec),
                'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
            },
        }
    );
}

// ─── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extract client IP from Next.js request headers.
 * Falls back to 'unknown' if no IP is available.
 */
export function getClientIp(request: Request): string {
    const forwarded = (request as Request & { headers: Headers }).headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}
