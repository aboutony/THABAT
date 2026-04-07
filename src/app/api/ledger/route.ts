/**
 * /api/ledger — Action Ledger persistence
 *
 * GET    — Return all ledger entries for the current org (newest first)
 * POST   — Save a new entry (LedgerEntry payload in request body)
 * PATCH  — Mark an entry as realized { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { getSession } from '@/lib/auth';
import { apiError } from '@/lib/apiError';
import { logger } from '@/lib/logger';
import type { LedgerEntry } from '@/lib/ledger';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const rows = await sql`
            SELECT id, action_type, note, metadata, created_at
            FROM action_logs
            WHERE org_id = ${session.orgId}
              AND metadata IS NOT NULL
              AND json_extract(metadata, '$.avoidedCost') IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const entries: LedgerEntry[] = rows.map((r) => {
            const meta = typeof r.metadata === 'string'
                ? JSON.parse(r.metadata as string)
                : r.metadata as Record<string, unknown>;
            return {
                id:         r.id as string,
                date:       r.created_at as string,
                actionType: meta.actionType ?? r.action_type,
                ...meta,
            } as LedgerEntry;
        });

        return NextResponse.json({ entries });
    } catch (error) {
        return apiError.internal(error, 'Ledger fetch error');
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const body = await request.json() as Partial<LedgerEntry>;

        if (!body.actionType || body.avoidedCost === undefined) {
            return apiError.badRequest('actionType and avoidedCost are required');
        }

        const note = buildNote(body);

        const rows = await sql`
            INSERT INTO action_logs (org_id, user_id, action_type, note, metadata)
            VALUES (
                ${session.orgId},
                ${session.userId},
                ${body.actionType},
                ${note},
                ${JSON.stringify(body)}
            )
            RETURNING id, created_at
        ` as { id: string; created_at: string }[];

        const saved: LedgerEntry = {
            ...body,
            id:     rows[0].id,
            date:   rows[0].created_at,
            status: 'pending',
        } as LedgerEntry;

        return NextResponse.json({ entry: saved });
    } catch (error) {
        return apiError.internal(error, 'Ledger save error');
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const body = await request.json() as { id?: string };
        if (!body.id) return apiError.badRequest('id is required');

        // Fetch existing to verify ownership and get current metadata
        const rows = await sql`
            SELECT id, metadata FROM action_logs
            WHERE id = ${body.id} AND org_id = ${session.orgId}
        `;

        if (rows.length === 0) return apiError.notFound('Ledger entry not found');

        const existing = typeof rows[0].metadata === 'string'
            ? JSON.parse(rows[0].metadata as string)
            : rows[0].metadata as Record<string, unknown>;

        const updated = { ...existing, status: 'realized' };

        await sql`
            UPDATE action_logs
            SET metadata = ${JSON.stringify(updated)},
                note     = ${(rows[0].metadata as string)?.includes('realized') ? rows[0].metadata : `REALIZED: ${existing.note ?? ''}`}
            WHERE id = ${body.id} AND org_id = ${session.orgId}
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Ledger realize error', { error });
        return apiError.internal(error, 'Ledger realize error');
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildNote(entry: Partial<LedgerEntry>): string {
    switch (entry.actionType) {
        case 'NITAQAT':
            return `Nitaqat plan — ${entry.plannedExpats ?? 0} expats, SAR ${entry.avoidedCost?.toLocaleString() ?? 0} avoided`;
        case 'SUPPLY_CHAIN_PIVOT':
            return entry.meta?.description ?? 'Supply chain pivot';
        case 'SCENARIO_PLAN':
            return `Scenario plan — SAR ${entry.avoidedCost?.toLocaleString() ?? 0} projected`;
        case 'VERIFIED_STRATEGY':
            return `Verified strategy — SAR ${entry.avoidedCost?.toLocaleString() ?? 0} projected`;
        default:
            return `Action — SAR ${entry.avoidedCost?.toLocaleString() ?? 0}`;
    }
}
