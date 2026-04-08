/**
 * POST /api/auth/signup
 *
 * Phase 1.2 changes:
 *  - ADDED: Zod input validation (SignupSchema)
 *  - ADDED: Rate limiting — 3 signups per IP per hour
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { hashPassword, signJWT, COOKIE_NAME } from '@/lib/auth';
import { parseBody, SignupSchema } from '@/lib/validation';
import { rateLimitSignup, rateLimitResponse, getClientIp } from '@/lib/rateLimit';
import { apiError } from '@/lib/apiError';

export async function POST(request: NextRequest) {
    try {
        // Rate limit before any processing
        const ip = getClientIp(request);
        const limit = rateLimitSignup(ip);
        if (!limit.success) return rateLimitResponse(limit) as NextResponse;

        // Zod validation — replaces the manual field checks
        const parsed = await parseBody(request, SignupSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { email, password, fullName, orgName, industry, revenueBand, growthStage } = parsed.data;

        // Check if email already exists
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return apiError.conflict('Email already registered');
        }

        // Create organization
        const [org] = await sql`
            INSERT INTO organizations (name, industry, revenue_band, growth_stage)
            VALUES (${orgName}, ${industry ?? null}, ${revenueBand ?? null}, ${growthStage ?? null})
            RETURNING id
        ` as { id: string }[];

        // Hash password & create user as 'owner'
        const passwordHash = await hashPassword(password);
        const [user] = await sql`
            INSERT INTO users (org_id, email, password_hash, full_name, role)
            VALUES (${org.id}, ${email}, ${passwordHash}, ${fullName}, 'owner')
            RETURNING id, org_id, role, language_preference, theme_preference
        ` as { id: string; org_id: string; role: string; language_preference: string; theme_preference: string }[];

        const token = await signJWT({ userId: user.id, orgId: user.org_id, role: user.role });

        const response = NextResponse.json({
            user: {
                id: user.id,
                orgId: user.org_id,
                email,
                fullName,
                role: user.role,
                languagePreference: user.language_preference,
                themePreference: user.theme_preference,
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
        return apiError.internal(error, 'Signup error');
    }
}
