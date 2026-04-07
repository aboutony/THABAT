/**
 * /api/auth/me — Session management
 *
 * GET    — Return current user profile
 * PATCH  — Update language/theme preference
 * DELETE — Logout: revoke token server-side + clear cookie
 *
 * Phase 1.2 changes:
 *  - ADDED: Zod validation on PATCH body (PreferencePatchSchema)
 *  - FIXED: DELETE now adds the JWT to the server-side blocklist before
 *           clearing the cookie — true server-side logout (Phase 1.2.5)
 */

import { NextResponse } from 'next/server';
import sql from '@/db';
import { getSession, getRawToken, COOKIE_NAME } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { blockToken } from '@/lib/tokenBlocklist';
import { parseBody, PreferencePatchSchema } from '@/lib/validation';
import { apiError } from '@/lib/apiError';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const users = await sql`
            SELECT u.id, u.org_id, u.email, u.full_name, u.role,
                   u.language_preference, u.theme_preference,
                   o.name as org_name, o.industry, o.revenue_band, o.growth_stage
            FROM users u
            JOIN organizations o ON o.id = u.org_id
            WHERE u.id = ${session.userId}
        `;

        if (users.length === 0) return apiError.notFound('User not found');

        const user = users[0];

        let orgId = user.org_id as string;
        let orgName = user.org_name as string;
        const role = session.role || user.role;

        if (session.role === 'admin' && session.orgId !== user.org_id) {
            orgId = session.orgId;
            const switchedOrg = await sql`
                SELECT name, industry, revenue_band, growth_stage
                FROM organizations WHERE id = ${session.orgId}
            `;
            if (switchedOrg.length > 0) orgName = switchedOrg[0].name as string;
        }

        return NextResponse.json({
            user: {
                id: user.id,
                orgId,
                email: user.email,
                fullName: user.full_name,
                role,
                languagePreference: user.language_preference,
                themePreference: user.theme_preference,
                orgName,
                industry: user.industry,
                revenueBand: user.revenue_band,
                growthStage: user.growth_stage,
            },
        });
    } catch (error) {
        return apiError.internal(error, 'Session error');
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const parsed = await parseBody(request, PreferencePatchSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { languagePreference, themePreference } = parsed.data;

        if (languagePreference) {
            await sql`
                UPDATE users SET language_preference = ${languagePreference}
                WHERE id = ${session.userId}
            `;
        }

        if (themePreference) {
            await sql`
                UPDATE users SET theme_preference = ${themePreference}
                WHERE id = ${session.userId}
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return apiError.internal(error, 'Preference update error');
    }
}

/**
 * DELETE /api/auth/me — Server-side logout
 *
 * 1. Reads the current JWT from the cookie
 * 2. Adds it to the in-memory blocklist (prevents reuse even if cookie is re-set)
 * 3. Clears the httpOnly cookie
 *
 * The blocklist entry expires automatically when the JWT's own `exp` passes.
 */
export async function DELETE() {
    try {
        // Get the raw token before clearing the cookie
        const token = await getRawToken();

        if (token) {
            // Verify to extract `exp`, then blocklist the token
            try {
                const { verifyJWT } = await import('@/lib/auth');
                const payload = await verifyJWT(token);
                if (payload.exp) {
                    blockToken(token, payload.exp);
                }
            } catch {
                // Token already invalid — no need to blocklist
            }
        }

        // Clear the cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });
        return response;
    } catch (error) {
        // Log but still clear the cookie — partial logout is better than none
        logger.error('Logout error — cookie still cleared', { error });
        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });
        return response;
    }
}
