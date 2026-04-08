/**
 * auth.ts — JWT signing/verification, password hashing, session extraction
 *
 * Changes in Phase 1.2:
 *  - JWT secret sourced exclusively from env.ts (single source of truth)
 *  - getSession() checks the token blocklist for server-side logout support
 *  - COOKIE_NAME exported for use by logout endpoint
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getJwtSecret } from './env';
import { isTokenBlocked } from './tokenBlocklist';

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
export const COOKIE_NAME = 'thabat_token';

function getSecret(): Uint8Array {
    return new TextEncoder().encode(getJwtSecret());
}

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface TokenPayload extends JWTPayload {
    userId: string;
    orgId: string;
    role: string;
}

export async function signJWT(payload: {
    userId: string;
    orgId: string;
    role: string;
}): Promise<string> {
    return new SignJWT(payload as unknown as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .setIssuer('thabat')
        .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, getSecret(), {
        issuer: 'thabat',
    });
    return payload as TokenPayload;
}

// ─── Session extraction ───────────────────────────────────────────────────────

/**
 * Reads the session from the httpOnly cookie.
 * Returns null if:
 *  - No cookie is present
 *  - JWT is invalid or expired
 *  - Token has been explicitly revoked (server-side logout)
 */
export async function getSession(): Promise<TokenPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;

        // Server-side revocation check (Phase 1.2.5)
        if (isTokenBlocked(token)) return null;

        return await verifyJWT(token);
    } catch {
        return null;
    }
}

/**
 * Returns the raw JWT token string from the cookie, without verifying it.
 * Used by the logout endpoint to add the token to the blocklist.
 */
export async function getRawToken(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get(COOKIE_NAME)?.value ?? null;
    } catch {
        return null;
    }
}
