import { NextResponse } from 'next/server';
import sql from '@/db';
import { getSession, COOKIE_NAME } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch fresh user data
        const users = await sql`
      SELECT u.id, u.org_id, u.email, u.full_name, u.role,
             u.language_preference, u.theme_preference,
             o.name as org_name, o.industry, o.revenue_band, o.growth_stage
      FROM users u
      JOIN organizations o ON o.id = u.org_id
      WHERE u.id = ${session.userId}
    `;

        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = users[0];

        return NextResponse.json({
            user: {
                id: user.id,
                orgId: user.org_id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                languagePreference: user.language_preference,
                themePreference: user.theme_preference,
                orgName: user.org_name,
                industry: user.industry,
                revenueBand: user.revenue_band,
                growthStage: user.growth_stage,
            },
        });
    } catch (error) {
        console.error('Session error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Update language preference
        if (body.languagePreference) {
            await sql`
                UPDATE users SET language_preference = ${body.languagePreference}
                WHERE id = ${session.userId}
            `;
        }

        // Update theme preference
        if (body.themePreference) {
            await sql`
                UPDATE users SET theme_preference = ${body.themePreference}
                WHERE id = ${session.userId}
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Preference update error:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE() {
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
