import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { signJWT, COOKIE_NAME } from '@/lib/auth';

function verifyAdminKey(request: NextRequest): boolean {
    const key = request.headers.get('x-admin-key');
    const expected = process.env.THABAT_ADMIN_KEY || '';
    if (!expected || !key) return false;
    return key === expected;
}

/**
 * POST /api/admin/switch-org
 * Switches the current session to a different org's demo user.
 * Requires x-admin-key header.
 * Body: { orgId: string }
 */
export async function POST(request: NextRequest) {
    if (!verifyAdminKey(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { orgId } = await request.json();
        if (!orgId) {
            return NextResponse.json({ error: 'orgId required' }, { status: 400 });
        }

        // Find the demo user for this org
        const users = await sql`SELECT id, org_id, role FROM users WHERE org_id = ${orgId} AND role = 'owner' LIMIT 1`;
        if (users.length === 0) {
            return NextResponse.json({ error: 'No user found for this org' }, { status: 404 });
        }

        const user = users[0];
        const token = await signJWT({
            userId: user.id as string,
            orgId: user.org_id as string,
            role: user.role as string,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Switch org error:', error);
        return NextResponse.json({ error: 'Switch failed' }, { status: 500 });
    }
}

/**
 * GET /api/admin/switch-org
 * Returns all demo organizations for the switcher UI.
 * Requires x-admin-key header.
 */
export async function GET(request: NextRequest) {
    if (!verifyAdminKey(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Get all orgs that have a demo user
        const orgs = await sql`
            SELECT o.id, o.name, o.industry, o.growth_stage, o.entity_group, o.currency,
                   o.corp_tax_rate, o.vat_rate,
                   s.total_score, s.trajectory_direction
            FROM organizations o
            JOIN users u ON u.org_id = o.id AND u.email LIKE '%@demo.%'
            LEFT JOIN stability_scores s ON s.org_id = o.id
                AND s.date = (SELECT MAX(date) FROM stability_scores WHERE org_id = o.id)
            ORDER BY o.entity_group, o.name
        `;

        return NextResponse.json({ orgs });
    } catch (error) {
        console.error('List orgs error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
