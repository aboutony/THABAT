/**
 * Phase 1.2: Added Zod validation on POST body (SwitchOrgSchema)
 */
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { signJWT, getSession, COOKIE_NAME } from '@/lib/auth';
import { parseBody, SwitchOrgSchema } from '@/lib/validation';
import { apiError } from '@/lib/apiError';

/**
 * POST /api/admin/switch-org
 * Switches the current session to a different org's demo user.
 * Admin-only: requires role 'admin' in the JWT session.
 * Body: { orgId: string }
 */
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return apiError.unauthorized();

    try {
        const parsed = await parseBody(request, SwitchOrgSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { orgId } = parsed.data;

        const isAdmin = session.role === 'admin';

        // Non-admin: verify the target org is in the same entity_group
        if (!isAdmin) {
            const [currentOrg] = await sql`SELECT entity_group FROM organizations WHERE id = ${session.orgId}`;
            const [targetOrg] = await sql`SELECT entity_group FROM organizations WHERE id = ${orgId}`;
            const currentGroup = currentOrg?.entity_group as string | null;
            const targetGroup = targetOrg?.entity_group as string | null;

            if (!currentGroup || !targetGroup || currentGroup !== targetGroup) {
                return apiError.forbidden();
            }
        }

        // Find any user for the target org to get a valid reference
        const users = await sql`SELECT id, org_id, role FROM users WHERE org_id = ${orgId} LIMIT 1`;
        if (users.length === 0) {
            return apiError.notFound('No user found for this org');
        }

        const user = users[0];

        // Admin: preserve admin role. Non-admin: use target org user's identity.
        const token = await signJWT({
            userId: isAdmin ? session.userId : user.id as string,
            orgId: user.org_id as string,
            role: isAdmin ? 'admin' : user.role as string,
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
        return apiError.internal(error, 'Switch org error');
    }
}

/**
 * GET /api/admin/switch-org
 * Returns organizations based on the user's role:
 *   - Admin: ALL demo orgs (full switcher)
 *   - Non-admin: Only orgs in the same entity_group (e.g., UNIMED KSA + UAE)
 */
export async function GET() {
    const session = await getSession();
    if (!session) return apiError.unauthorized();

    try {
        if (session.role === 'admin') {
            // Admin sees ALL demo orgs
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
        } else {
            // Non-admin: only show orgs in their entity_group
            const userOrg = await sql`SELECT entity_group FROM organizations WHERE id = ${session.orgId}`;
            const entityGroup = userOrg[0]?.entity_group as string | null;

            if (entityGroup) {
                const orgs = await sql`
                    SELECT o.id, o.name, o.industry, o.growth_stage, o.entity_group, o.currency,
                           o.corp_tax_rate, o.vat_rate,
                           s.total_score, s.trajectory_direction
                    FROM organizations o
                    LEFT JOIN stability_scores s ON s.org_id = o.id
                        AND s.date = (SELECT MAX(date) FROM stability_scores WHERE org_id = o.id)
                    WHERE o.entity_group = ${entityGroup}
                    ORDER BY o.name
                `;
                return NextResponse.json({ orgs });
            } else {
                // No entity group — show only their own org
                const orgs = await sql`
                    SELECT o.id, o.name, o.industry, o.growth_stage, o.entity_group, o.currency,
                           o.corp_tax_rate, o.vat_rate,
                           s.total_score, s.trajectory_direction
                    FROM organizations o
                    LEFT JOIN stability_scores s ON s.org_id = o.id
                        AND s.date = (SELECT MAX(date) FROM stability_scores WHERE org_id = o.id)
                    WHERE o.id = ${session.orgId}
                `;
                return NextResponse.json({ orgs });
            }
        }
    } catch (error) {
        return apiError.internal(error, 'List orgs error');
    }
}
