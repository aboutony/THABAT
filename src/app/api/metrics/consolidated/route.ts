import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { getSession } from '@/lib/auth';
import {
    calculateStabilityScore,
    type RawMetrics,
    type CalibrationProfile,
} from '@/lib/scoring';

/**
 * GET /api/metrics/consolidated?group=unimed
 *
 * Aggregates metrics across all entities in an entity_group,
 * normalizes currencies to SAR, and returns a consolidated score.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = request.nextUrl.searchParams.get('group');
        if (!group) {
            return NextResponse.json({ error: 'group parameter required' }, { status: 400 });
        }

        // Exchange rates (Executive Currency = SAR)
        const FX_RATES: Record<string, number> = {
            SAR: 1.0,
            AED: 0.98,
            USD: 3.75,
            EUR: 4.10,
        };

        // Get all orgs in the entity group
        const orgs = await sql`
            SELECT id, name, currency, vat_rate, corp_tax_rate, receivables_warning_days,
                   industry_code, revenue_band, growth_stage
            FROM organizations WHERE entity_group = ${group}
        `;

        if (orgs.length === 0) {
            return NextResponse.json({ error: 'No entities found for group' }, { status: 404 });
        }

        // Per-entity scores
        const entityBreakdowns = [];
        let totalCash = 0, totalRevenue = 0, totalExpenses = 0, totalReceivables = 0, totalPayables = 0, totalVat = 0;

        for (const org of orgs) {
            const orgId = org.id as string;
            const currency = (org.currency as string) || 'SAR';
            const rate = FX_RATES[currency] || 1.0;

            // Latest metrics for this entity
            const metrics = await sql`
                SELECT * FROM metrics_daily WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
            `;

            // Latest score
            const score = await sql`
                SELECT * FROM stability_scores WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
            `;

            if (metrics.length > 0) {
                const m = metrics[0];
                const cashNorm = (Number(m.cash_balance) || 0) * rate;
                const revNorm = (Number(m.revenue) || 0) * rate;
                const expNorm = (Number(m.expenses) || 0) * rate;
                const recNorm = (Number(m.receivables) || 0) * rate;
                const payNorm = (Number(m.payables) || 0) * rate;
                const vatNorm = (Number(m.vat_amount) || 0) * rate;

                totalCash += cashNorm;
                totalRevenue += revNorm;
                totalExpenses += expNorm;
                totalReceivables += recNorm;
                totalPayables += payNorm;
                totalVat += vatNorm;

                entityBreakdowns.push({
                    orgId,
                    name: org.name,
                    currency,
                    rate,
                    corpTaxRate: Number(org.corp_tax_rate) || 0,
                    latestScore: score[0] ? Number(score[0].total_score) : null,
                    trend: score[0] ? score[0].trajectory_direction : 'stable',
                    metrics: {
                        cash: cashNorm,
                        revenue: revNorm,
                        expenses: expNorm,
                        receivables: recNorm,
                        payables: payNorm,
                        vatAmount: vatNorm,
                    },
                });
            }
        }

        // Calculate consolidated score
        const consolidatedMetrics: RawMetrics = {
            cash: totalCash,
            revenue: totalRevenue,
            expenses: totalExpenses,
            receivables: totalReceivables,
            payables: totalPayables,
            vatAmount: totalVat,
        };

        const calibration: CalibrationProfile = {
            industryCode: (orgs[0].industry_code as string) || 'MEDICAL_MFG',
            revenueBand: '50-200m',
            growthStage: 'growth',
            receivablesWarningDays: 90,
        };

        // Get historical consolidated scores (simplified — average of entity scores)
        const histScores: number[] = [];

        const consolidatedScore = calculateStabilityScore(consolidatedMetrics, histScores, calibration);

        return NextResponse.json({
            group,
            executiveCurrency: 'SAR',
            consolidatedScore: consolidatedScore,
            entities: entityBreakdowns,
            aggregatedMetrics: {
                cash: Math.round(totalCash),
                revenue: Math.round(totalRevenue),
                expenses: Math.round(totalExpenses),
                receivables: Math.round(totalReceivables),
                payables: Math.round(totalPayables),
                vatAmount: Math.round(totalVat),
            },
        });
    } catch (error) {
        console.error('Consolidated metrics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
