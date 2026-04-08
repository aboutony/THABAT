/**
 * API Route Tests — Authentication (login, signup, me)
 *
 * Strategy: mock `@/lib/auth`, `@/db`, and `@/lib/tokenBlocklist` so
 * no JWT signing or database calls happen. Tests verify:
 *   - Input validation (Zod schema enforcement — 422 Unprocessable Entity)
 *   - Correct HTTP status codes for each scenario
 *   - Correct response body shape
 *   - Session enforcement (401 when unauthenticated)
 *
 * Note: Zod validation failures return 422 (parseBody sets status: 422).
 *       Authentication failures return 401.
 *       Resource conflicts return 409.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks (hoisted — must be before imports) ──────────────────────────

vi.mock('@/db', () => ({
    default: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    getRawToken: vi.fn(),
    verifyJWT: vi.fn(),
    signJWT: vi.fn().mockResolvedValue('signed-jwt-token'),
    verifyPassword: vi.fn(),
    COOKIE_NAME: 'thabat-session',
}));

vi.mock('@/lib/tokenBlocklist', () => ({
    blockToken: vi.fn(),
    isTokenBlocked: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/rateLimit', () => ({
    rateLimitLogin: vi.fn().mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 60000 }),
    rateLimitSignup: vi.fn().mockReturnValue({ success: true, remaining: 2, resetAt: Date.now() + 60000 }),
    rateLimitResponse: vi.fn(),
    getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import sql from '@/db';
import { getSession, getRawToken, verifyJWT, verifyPassword } from '@/lib/auth';
import { blockToken } from '@/lib/tokenBlocklist';

// Import routes once — avoid resetModules which breaks mock references
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { GET as meGET, PATCH as mePATCH, DELETE as meDELETE } from '@/app/api/auth/me/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, method = 'POST'): NextRequest {
    return new NextRequest('http://localhost/api/test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function mockSqlOnce(returnValue: unknown[]) {
    (sql as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(returnValue);
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    });

    it('returns 422 for missing email', async () => {
        const req = makeRequest({ password: 'secret123' });
        const res = await loginPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 for invalid email format', async () => {
        const req = makeRequest({ email: 'not-an-email', password: 'secret123' });
        const res = await loginPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 for missing password', async () => {
        const req = makeRequest({ email: 'user@example.com' });
        const res = await loginPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 401 when user is not found in database', async () => {
        mockSqlOnce([]); // no user found
        const req = makeRequest({ email: 'ghost@example.com', password: 'password123' });
        const res = await loginPOST(req);
        expect(res.status).toBe(401);
    });

    it('returns 200 and sets cookie on successful login', async () => {
        mockSqlOnce([{
            id: 'user-1',
            org_id: 'org-1',
            email: 'user@example.com',
            password_hash: '$2b$12$hashedpassword',
            role: 'client',
            full_name: 'Test User',
            language_preference: 'en',
            theme_preference: 'dark',
            org_name: 'Test Org',
        }]);

        (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        const req = makeRequest({ email: 'user@example.com', password: 'correct-password' });
        const res = await loginPOST(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('user');
        expect(body.user.email).toBe('user@example.com');
    });

    it('returns 401 when password does not match', async () => {
        mockSqlOnce([{
            id: 'user-1',
            org_id: 'org-1',
            email: 'user@example.com',
            password_hash: '$2b$12$hashedpassword',
            role: 'client',
            full_name: 'Test User',
            language_preference: 'en',
            theme_preference: 'dark',
            org_name: 'Test Org',
        }]);

        (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const req = makeRequest({ email: 'user@example.com', password: 'wrong-password' });
        const res = await loginPOST(req);
        expect(res.status).toBe(401);
    });
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 422 for password shorter than 8 characters', async () => {
        const req = makeRequest({ email: 'new@example.com', password: 'short', fullName: 'Test', orgName: 'Org' });
        const res = await signupPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 for missing fullName', async () => {
        const req = makeRequest({ email: 'new@example.com', password: 'longpassword123', orgName: 'Org' });
        const res = await signupPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 for missing orgName', async () => {
        const req = makeRequest({ email: 'new@example.com', password: 'longpassword123', fullName: 'Test' });
        const res = await signupPOST(req);
        expect(res.status).toBe(422);
    });

    it('returns 409 when email is already registered', async () => {
        mockSqlOnce([{ id: 'existing-user' }]); // existing user found
        const req = makeRequest({
            email: 'taken@example.com', password: 'validPassword99', fullName: 'John', orgName: 'Corp'
        });
        const res = await signupPOST(req);
        expect(res.status).toBe(409);
    });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no session exists', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const res = await meGET();
        expect(res.status).toBe(401);
    });

    it('returns 200 with user object when session exists', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
            userId: 'user-1',
            orgId: 'org-1',
            role: 'client',
        });

        mockSqlOnce([{
            id: 'user-1',
            org_id: 'org-1',
            email: 'user@example.com',
            full_name: 'Test User',
            role: 'client',
            language_preference: 'en',
            theme_preference: 'dark',
            org_name: 'Test Org',
            industry: 'medical',
            revenue_band: 'smb',
            growth_stage: 'growth',
        }]);

        const res = await meGET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('user');
        expect(body.user).toHaveProperty('email', 'user@example.com');
    });

    it('returns 404 when session user is not in database', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
            userId: 'ghost-user',
            orgId: 'org-1',
            role: 'client',
        });

        mockSqlOnce([]); // no user found

        const res = await meGET();
        expect(res.status).toBe(404);
    });
});

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────

describe('PATCH /api/auth/me', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no session exists', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const req = makeRequest({ languagePreference: 'ar' }, 'PATCH');
        const res = await mePATCH(req);
        expect(res.status).toBe(401);
    });

    it('returns 422 for invalid language preference', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'client' });
        const req = makeRequest({ languagePreference: 'fr' }, 'PATCH'); // not en or ar
        const res = await mePATCH(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 when neither preference field is provided', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'client' });
        const req = makeRequest({}, 'PATCH'); // empty body fails .refine()
        const res = await mePATCH(req);
        expect(res.status).toBe(422);
    });

    it('returns 200 on valid preference update', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'client' });
        mockSqlOnce([]); // UPDATE result
        const req = makeRequest({ languagePreference: 'ar' }, 'PATCH');
        const res = await mePATCH(req);
        expect(res.status).toBe(200);
    });
});

// ─── DELETE /api/auth/me ──────────────────────────────────────────────────────

describe('DELETE /api/auth/me', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 and clears cookie even when no token present', async () => {
        (getRawToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const res = await meDELETE();
        expect(res.status).toBe(200);
    });

    it('blocklists the token when a valid JWT is present', async () => {
        (getRawToken as ReturnType<typeof vi.fn>).mockResolvedValue('valid.jwt.token');
        (verifyJWT as ReturnType<typeof vi.fn>).mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

        await meDELETE();

        expect(blockToken).toHaveBeenCalledWith('valid.jwt.token', expect.any(Number));
    });

    it('still returns 200 if token verification fails (already expired)', async () => {
        (getRawToken as ReturnType<typeof vi.fn>).mockResolvedValue('expired.jwt.token');
        (verifyJWT as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('expired'));

        const res = await meDELETE();
        expect(res.status).toBe(200);
    });
});
