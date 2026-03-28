import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { verifyPassword, signJWT, COOKIE_NAME } from '@/lib/auth';

// ── Static demo tier accounts — no DB dependency ──────────────────────────────
const DEMO_TIER_ACCOUNTS: Record<string, { fullName: string; orgName: string }> = {
    'guest@thabat.app':  { fullName: 'Guest Commander',  orgName: 'Guest Preview'  },
    'client@thabat.app': { fullName: 'Client Commander', orgName: 'Client Preview' },
};
const DEMO_TIER_PASSWORD = 'Demo2026!';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password required' },
                { status: 400 }
            );
        }

        // ── Static tier account short-circuit (no DB required) ────────────────
        const tierAccount = DEMO_TIER_ACCOUNTS[email.toLowerCase()];
        if (tierAccount) {
            if (password !== DEMO_TIER_PASSWORD) {
                return NextResponse.json(
                    { error: 'Invalid email or password' },
                    { status: 401 }
                );
            }
            const staticId = email.replace(/[@.]/g, '_');
            const token = await signJWT({ userId: staticId, orgId: staticId, role: 'viewer' });
            const response = NextResponse.json({
                user: {
                    id:                 staticId,
                    orgId:              staticId,
                    email,
                    fullName:           tierAccount.fullName,
                    role:               'viewer',
                    languagePreference: 'en',
                    themePreference:    'dark',
                    orgName:            tierAccount.orgName,
                },
            });
            response.cookies.set(COOKIE_NAME, token, {
                httpOnly: true,
                secure:   process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge:   60 * 60 * 24 * 7,
                path:     '/',
            });
            return response;
        }

        // Find user (no RLS — cross-tenant lookup for auth)
        const users = await sql`
      SELECT u.id, u.org_id, u.password_hash, u.role, u.full_name, u.email,
             u.language_preference, u.theme_preference,
             o.name as org_name
      FROM users u
      JOIN organizations o ON o.id = u.org_id
      WHERE u.email = ${email}
    `;

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const user = users[0] as { id: string; org_id: string; password_hash: string; role: string; full_name: string; email: string; language_preference: string; theme_preference: string; org_name: string };

        // Verify password
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Sign JWT
        const token = await signJWT({
            userId: user.id,
            orgId: user.org_id,
            role: user.role,
        });

        // Return user data + preferences for zero-flicker login
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
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
