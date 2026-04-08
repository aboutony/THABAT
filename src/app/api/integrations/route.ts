/**
 * /api/integrations — ERP connector management
 *
 * Phase 1.2 changes:
 *  - FIXED: All tx.unsafe() calls replaced with parameterized tagged-template queries
 *  - ADDED: Zod validation on POST and PUT bodies
 *  - ADDED: Rate limiting (10 calls/org/hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { withTenant } from '@/db';
import { getSession } from '@/lib/auth';
import { encrypt, decrypt, type EncryptedData } from '@/lib/crypto';
import { getConnector, type ERPProvider } from '@/connectors';
import { calculateStabilityScore, computeNormalizedMetrics, type RawMetrics } from '@/lib/scoring';
import { parseBody, IntegrationsPostSchema, IntegrationsPutSchema } from '@/lib/validation';
import { rateLimitIntegrations, rateLimitResponse } from '@/lib/rateLimit';
import { apiError } from '@/lib/apiError';

/**
 * GET /api/integrations — List connected ERPs for this org
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const connections = await sql`
            SELECT id, provider, created_at, updated_at
            FROM encrypted_credentials
            WHERE org_id = ${session.orgId}
        `;

        return NextResponse.json({ connections });
    } catch (error) {
        return apiError.internal(error, 'List integrations error');
    }
}

/**
 * POST /api/integrations — Save or update ERP credentials (AES-256 encrypted)
 * Body: { provider, credentials: { ...provider-specific fields } }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const rl = rateLimitIntegrations(session.orgId);
        if (!rl.success) return rateLimitResponse(rl) as NextResponse;

        const parsed = await parseBody(request, IntegrationsPostSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { provider, credentials } = parsed.data;

        const connector = getConnector(provider as ERPProvider);
        const testResult = await connector.testConnection({ provider, ...credentials } as never);

        if (!testResult.success) {
            return NextResponse.json({ error: testResult.message, testResult }, { status: 400 });
        }

        const encrypted: EncryptedData = encrypt(JSON.stringify(credentials));

        await sql`
            INSERT INTO encrypted_credentials (org_id, provider, encrypted_token, iv, auth_tag)
            VALUES (${session.orgId}, ${provider}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag})
            ON CONFLICT (org_id, provider)
            DO UPDATE SET
                encrypted_token = excluded.encrypted_token,
                iv = excluded.iv,
                auth_tag = excluded.auth_tag,
                updated_at = datetime('now')
        `;

        return NextResponse.json({ success: true, testResult });
    } catch (error) {
        return apiError.internal(error, 'Save integration error');
    }
}

/**
 * PUT /api/integrations — Trigger ERP sync for a provider
 * Body: { provider, fromDate?, toDate? }
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const rl = rateLimitIntegrations(session.orgId);
        if (!rl.success) return rateLimitResponse(rl) as NextResponse;

        const parsed = await parseBody(request, IntegrationsPutSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { provider } = parsed.data;

        const toDate = parsed.data.toDate ?? new Date().toISOString().split('T')[0];
        const fromDate = parsed.data.fromDate ?? (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        })();

        const creds = await withTenant(session.orgId, async (tx) => {
            return tx`
                SELECT encrypted_token, iv, auth_tag
                FROM encrypted_credentials
                WHERE org_id = ${session.orgId} AND provider = ${provider}
            `;
        });

        if (!creds || creds.length === 0) {
            return apiError.notFound('No credentials found for this provider');
        }

        const decrypted = decrypt({
            ciphertext: creds[0].encrypted_token as string,
            iv: creds[0].iv as string,
            authTag: creds[0].auth_tag as string,
        });

        const credentials = { provider, ...JSON.parse(decrypted) };

        const connector = getConnector(provider as ERPProvider);
        const metrics = await connector.fetchMetrics(credentials, fromDate, toDate);

        let recordsProcessed = 0;

        for (const day of metrics) {
            await withTenant(session.orgId, async (tx) => {
                await tx`
                    DELETE FROM metrics_daily
                    WHERE org_id = ${session.orgId} AND date = ${day.date}
                `;
                await tx`
                    INSERT INTO metrics_daily
                        (org_id, date, cash_balance, revenue, expenses, receivables, payables)
                    VALUES
                        (${session.orgId}, ${day.date}, ${day.cashBalance}, ${day.revenue},
                         ${day.expenses}, ${day.receivables}, ${day.payables})
                `;

                const history = await tx`
                    SELECT stability_score FROM normalized_metrics
                    WHERE org_id = ${session.orgId}
                      AND date < ${day.date}
                      AND stability_score IS NOT NULL
                    ORDER BY date DESC LIMIT 30
                `;

                const historicalScores = (history as { stability_score: unknown }[]).map(
                    r => Number(r.stability_score)
                );

                const raw: RawMetrics = {
                    cash: day.cashBalance,
                    revenue: day.revenue,
                    expenses: day.expenses,
                    receivables: day.receivables,
                    payables: day.payables,
                };

                const scoreResult = calculateStabilityScore(raw, historicalScores);
                const normalized = computeNormalizedMetrics(raw);

                await tx`
                    DELETE FROM normalized_metrics
                    WHERE org_id = ${session.orgId} AND date = ${day.date}
                `;
                await tx`
                    INSERT INTO normalized_metrics
                        (org_id, date, runway_months, burn_rate, margin_pct,
                         liquidity_ratio, collection_days, stability_score, trend)
                    VALUES
                        (${session.orgId}, ${day.date}, ${normalized.runway_months},
                         ${normalized.burn_rate}, ${normalized.margin_pct},
                         ${normalized.liquidity_ratio}, ${normalized.collection_days},
                         ${scoreResult.overall}, ${scoreResult.trend})
                `;
            });

            recordsProcessed++;
        }

        return NextResponse.json({
            success: true,
            sync: {
                provider,
                recordsProcessed,
                dateRange: { from: fromDate, to: toDate },
                message: `Synced ${recordsProcessed} days of data from ${provider}`,
            },
        });
    } catch (error) {
        return apiError.internal(error, 'Sync error');
    }
}
