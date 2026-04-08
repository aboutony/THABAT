/**
 * tokenBlocklist.ts — In-memory JWT revocation list
 *
 * Provides server-side logout by blocking specific JWT tokens
 * until they naturally expire. Tokens are keyed by their raw value
 * and automatically removed once their `exp` timestamp passes.
 *
 * NOTE for delivery team: In a multi-instance deployment, replace this
 * with a Redis SET with TTL (e.g. Upstash Redis free tier).
 * The function signatures are intentionally minimal for easy replacement.
 *
 * Phase 1.2 — Security Hardening
 */

// key: JWT token string  →  value: expiry in Unix seconds
const blocklist = new Map<string, number>();

// Cleanup runs at most once per minute
let lastCleanup = 0;
function maybeCleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    if (now - lastCleanup < 60) return;
    lastCleanup = now;
    for (const [token, exp] of blocklist.entries()) {
        if (now > exp) blocklist.delete(token);
    }
}

/**
 * Add a JWT token to the blocklist.
 *
 * @param token    - The raw JWT string from the cookie
 * @param expiresAt - The `exp` claim from the JWT payload (Unix seconds)
 */
export function blockToken(token: string, expiresAt: number): void {
    blocklist.set(token, expiresAt);
    maybeCleanup();
}

/**
 * Check whether a token has been explicitly revoked.
 * Expired entries are cleaned up on read.
 */
export function isTokenBlocked(token: string): boolean {
    maybeCleanup();
    const exp = blocklist.get(token);
    if (exp === undefined) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now > exp) {
        // Token already expired — remove from blocklist
        blocklist.delete(token);
        return false;
    }

    return true;
}

/** Returns current blocklist size — useful for health checks / monitoring */
export function blocklistSize(): number {
    return blocklist.size;
}
