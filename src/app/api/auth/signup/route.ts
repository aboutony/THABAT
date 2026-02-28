import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { hashPassword, signJWT, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, fullName, orgName, industry, revenueBand, growthStage } = body;

        // Validation
        if (!email || !password || !fullName || !orgName) {
            return NextResponse.json(
                { error: 'Missing required fields: email, password, fullName, orgName' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            );
        }

        // Create organization
        const [org] = await sql`
      INSERT INTO organizations (name, industry, revenue_band, growth_stage)
      VALUES (${orgName}, ${industry || null}, ${revenueBand || null}, ${growthStage || null})
      RETURNING id
    ` as { id: string }[];

        // Hash password & create user as 'owner'
        const passwordHash = await hashPassword(password);
        const [user] = await sql`
      INSERT INTO users (org_id, email, password_hash, full_name, role)
      VALUES (${org.id}, ${email}, ${passwordHash}, ${fullName}, 'owner')
      RETURNING id, org_id, role, language_preference, theme_preference
    ` as { id: string; org_id: string; role: string; language_preference: string; theme_preference: string }[];

        // Sign JWT
        const token = await signJWT({
            userId: user.id,
            orgId: user.org_id,
            role: user.role,
        });

        // Build response with httpOnly cookie
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
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
