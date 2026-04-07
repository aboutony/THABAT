/**
 * POST /api/auth/login
 *
 * Phase 1.2 changes:
 *  - ADDED: Zod input validation (LoginSchema)
 *  - ADDED: Rate limiting — 5 attempts per IP per 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { verifyPassword, signJWT, COOKIE_NAME } from '@/lib/auth';
import { parseBody, LoginSchema } from '@/lib/validation';
import { rateLimitLogin, rateLimitResponse, getClientIp } from '@/lib/rateLimit';
import { apiError } from '@/lib/apiError';

// Static demo tier accounts (no DB required)
const DEMO_TIER_ACCOUNTS: Record<string, { fullName: string; orgName: string }> = {
    'guest@thabat.app': { fullName: 'Guest Commander', orgName: 'Guest Preview' },
    'client@thabat.app': { fullName: 'Client Commander', orgName: 'Client Preview' },
};
const DEMO_TIER_PASSWORD = 'Demo2026!';

export async function POST(request: NextRequest) {
    try {
        // Rate limit before any processing
        const ip = getClientIp(request);
        const limit = rateLimitLogin(ip);
        if (!limit.success) return rateLimitResponse(limit) as NextResponse;

        // Zod validation
        const parsed = await parseBody(request, LoginSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { email, password } = parsed.data;

        // Short-circuit for static demo tier accounts
        const tierAccount = DEMO_TIER_ACCOUNTS[email];
        if (tierAccount) {
            if (password !== DEMO_TIER_PASSWORD) {
                return apiError.unauthorized('Invalid email or password');
            }

            const staticId = email.replace(/[@.]/g, '_');
            const token = await signJWT({ userId: staticId, orgId: staticId, role: 'viewer' });
            const response = NextResponse.json({
                user: {
                    id: staticId,
                    orgId: staticId,
                    email,
                    fullName: tierAccount.fullName,
                    role: 'viewer',
                    languagePreference: 'en',
                    themePreference: 'dark',
                    orgName: tierAccount.orgName,
                },
            });

            response.cookies.set(COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
            return response;
        }

        // DB lookup — parameterized (safe)
        const users = await sql`
            SELECT u.id, u.org_id, u.password_hash, u.role, u.full_name, u.email,
                   u.language_preference, u.theme_preference,
                   o.name as org_name
            FROM users u
            JOIN organizations o ON o.id = u.org_id
            WHERE u.email = ${email}
        `;

        if (users.length === 0) {
            return apiError.unauthorized('Invalid email or password');
        }

        const user = users[0] as {
            id: string; org_id: string; password_hash: string; role: string;
            full_name: string; email: string; language_preference: string;
            theme_preference: string; org_name: string;
        };

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return apiError.unauthorized('Invalid email or password');
        }

        const token = await signJWT({ userId: user.id, orgId: user.org_id, role: user.role });

        const response = NextResponse.json({
            user: {
                id: user.id,
                orgId: user.org_id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                languagePreference: user.language_preference,
                themePreference: user.theme_preference,
                orgName: user.org_name,
            },
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        return apiError.internal(error, 'Login error');
    }
}
