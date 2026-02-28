import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { withTenant } from '@/db';
import { getSession } from '@/lib/auth';
import { encrypt, decrypt, type EncryptedData } from '@/lib/crypto';
import { getConnector, type ERPProvider } from '@/connectors';
import { calculateStabilityScore, computeNormalizedMetrics, type RawMetrics } from '@/lib/scoring';

/**
 * GET /api/integrations — List connected ERPs for this org
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connections = await withTenant(session.orgId, async (tx) => {
            return tx.unsafe(`
        SELECT id, provider, created_at, updated_at
        FROM encrypted_credentials
        WHERE org_id = '${session.orgId}'
      `);
        });

        return NextResponse.json({ connections });
    } catch (error) {
        console.error('List integrations error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/integrations — Save or update ERP credentials (AES-256 encrypted)
 * Body: { provider, credentials: { ...provider-specific fields } }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { provider, credentials } = body as { provider: ERPProvider; credentials: Record<string, string> };

        if (!provider || !credentials) {
            return NextResponse.json({ error: 'Provider and credentials required' }, { status: 400 });
        }

        // Test connection first
        const connector = getConnector(provider);
        const testResult = await connector.testConnection({ provider, ...credentials } as never);

        if (!testResult.success) {
            return NextResponse.json({
                error: testResult.message,
                testResult,
            }, { status: 400 });
        }

        // Encrypt credentials
        const encrypted: EncryptedData = encrypt(JSON.stringify(credentials));

        // Upsert into encrypted_credentials
        await sql`
      INSERT INTO encrypted_credentials (org_id, provider, encrypted_token, iv, auth_tag)
      VALUES (${session.orgId}, ${provider}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag})
      ON CONFLICT (org_id, provider)
      DO UPDATE SET
        encrypted_token = EXCLUDED.encrypted_token,
        iv = EXCLUDED.iv,
        auth_tag = EXCLUDED.auth_tag,
        updated_at = NOW()
    `;

        return NextResponse.json({ success: true, testResult });
    } catch (error) {
        console.error('Save integration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/integrations — Trigger sync for a provider
 * Body: { provider, fromDate?, toDate? }
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { provider } = body as { provider: ERPProvider };

        // Default: last 30 days
        const toDate = body.toDate || new Date().toISOString().split('T')[0];
        const fromDate = body.fromDate || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        })();

        // Retrieve and decrypt credentials
        const creds = await withTenant(session.orgId, async (tx) => {
            return tx.unsafe(`
        SELECT encrypted_token, iv, auth_tag
        FROM encrypted_credentials
        WHERE org_id = '${session.orgId}' AND provider = '${provider}'
      `);
        });

        if (!creds || creds.length === 0) {
            return NextResponse.json({ error: 'No credentials found for this provider' }, { status: 404 });
        }

        const decrypted = decrypt({
            ciphertext: creds[0].encrypted_token,
            iv: creds[0].iv,
            authTag: creds[0].auth_tag,
        });

        const credentials = { provider, ...JSON.parse(decrypted) };

        // Fetch metrics from ERP
        const connector = getConnector(provider);
        const metrics = await connector.fetchMetrics(credentials, fromDate, toDate);

        // Upsert each day's metrics and calculate scores
        let recordsProcessed = 0;

        for (const day of metrics) {
            await withTenant(session.orgId, async (tx) => {
                // Upsert raw metrics
                await tx.unsafe(`
          INSERT INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables)
          VALUES ('${session.orgId}', '${day.date}', ${day.cashBalance}, ${day.revenue}, ${day.expenses}, ${day.receivables}, ${day.payables})
          ON CONFLICT (org_id, date) DO UPDATE SET
            cash_balance = EXCLUDED.cash_balance,
            revenue = EXCLUDED.revenue,
            expenses = EXCLUDED.expenses,
            receivables = EXCLUDED.receivables,
            payables = EXCLUDED.payables
        `);

                // Calculate score
                const raw: RawMetrics = {
                    cash: day.cashBalance,
                    revenue: day.revenue,
                    expenses: day.expenses,
                    receivables: day.receivables,
                    payables: day.payables,
                };

                const history = await tx.unsafe(`
          SELECT stability_score FROM normalized_metrics
          WHERE org_id = '${session.orgId}' AND date < '${day.date}' AND stability_score IS NOT NULL
          ORDER BY date DESC LIMIT 30
        `);

                const historicalScores = history.map((r: { stability_score: number }) => r.stability_score);
                const scoreResult = calculateStabilityScore(raw, historicalScores);
                const normalized = computeNormalizedMetrics(raw);

                await tx.unsafe(`
          INSERT INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend)
          VALUES ('${session.orgId}', '${day.date}', ${normalized.runway_months}, ${normalized.burn_rate}, ${normalized.margin_pct}, ${normalized.liquidity_ratio}, ${normalized.collection_days}, ${scoreResult.overall}, '${scoreResult.trend}')
          ON CONFLICT (org_id, date) DO UPDATE SET
            runway_months = EXCLUDED.runway_months,
            burn_rate = EXCLUDED.burn_rate,
            margin_pct = EXCLUDED.margin_pct,
            liquidity_ratio = EXCLUDED.liquidity_ratio,
            collection_days = EXCLUDED.collection_days,
            stability_score = EXCLUDED.stability_score,
            trend = EXCLUDED.trend
        `);
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
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
