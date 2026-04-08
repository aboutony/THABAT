/**
 * /api/metrics — Financial metrics ingestion and retrieval
 *
 * Phase 1.2 changes:
 *  - ADDED: Zod validation on POST body (MetricsPostSchema)
 *  - ADDED: Rate limiting — 60 ingestions per org per hour
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { getSession } from '@/lib/auth';
import {
    calculateStabilityScore,
    computeNormalizedMetrics,
    type RawMetrics,
    type CalibrationProfile,
} from '@/lib/scoring';
import { parseBody, MetricsPostSchema } from '@/lib/validation';
import { rateLimitMetrics, rateLimitResponse } from '@/lib/rateLimit';
import { apiError } from '@/lib/apiError';

/**
 * POST /api/metrics — Ingest daily metrics and calculate calibrated score
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const rl = rateLimitMetrics(session.orgId);
        if (!rl.success) return rateLimitResponse(rl) as NextResponse;

        const parsed = await parseBody(request, MetricsPostSchema);
        if (!parsed.ok) {
            return parsed.status === 400
                ? apiError.badRequest(parsed.error)
                : apiError.validation(parsed.error);
        }
        const { date, cash, revenue, expenses, receivables, payables } = parsed.data;

        const orgId = session.orgId;

        // Fetch org profile for calibration
        const orgs = await sql`
            SELECT industry, industry_code, revenue_band, growth_stage,
                   receivables_warning_days, corp_tax_rate, vat_rate
            FROM organizations WHERE id = ${orgId}
        ` as { industry: string; industry_code: string; revenue_band: string; growth_stage: string; receivables_warning_days: number; corp_tax_rate: number; vat_rate: number }[];

        const org = orgs[0] || {};
        const calibration: CalibrationProfile = {
            industryCode: org.industry_code || org.industry,
            revenueBand: org.revenue_band,
            growthStage: org.growth_stage,
            receivablesWarningDays: Number(org.receivables_warning_days) || 30,
            corpTaxRate: Number(org.corp_tax_rate) || 0,
        };

        // Upsert daily metrics (delete + insert for SQLite compatibility)
        await sql`DELETE FROM metrics_daily WHERE org_id = ${orgId} AND date = ${date}`;
        await sql`
            INSERT INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables)
            VALUES (${orgId}, ${date}, ${cash}, ${revenue}, ${expenses}, ${receivables}, ${payables})
        `;

        // Fetch historical scores for EMA trajectory
        const history = await sql`
            SELECT stability_score FROM normalized_metrics
            WHERE org_id = ${orgId} AND date < ${date} AND stability_score IS NOT NULL
            ORDER BY date DESC LIMIT 30
        ` as { stability_score: number }[];

        const historicalScores = history.map((r) => Number(r.stability_score));

        // Calculate calibrated stability score
        const rawMetrics: RawMetrics = { cash, revenue, expenses, receivables, payables };
        const scoreResult = calculateStabilityScore(rawMetrics, historicalScores, calibration);
        const normalized = computeNormalizedMetrics(rawMetrics);

        // Upsert normalized metrics
        await sql`DELETE FROM normalized_metrics WHERE org_id = ${orgId} AND date = ${date}`;
        await sql`
            INSERT INTO normalized_metrics
                (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio,
                 collection_days, stability_score, trend)
            VALUES
                (${orgId}, ${date}, ${normalized.runway_months}, ${normalized.burn_rate},
                 ${normalized.margin_pct}, ${normalized.liquidity_ratio},
                 ${normalized.collection_days}, ${scoreResult.overall}, ${scoreResult.trend})
        `;

        // Upsert stability scores
        await sql`DELETE FROM stability_scores WHERE org_id = ${orgId} AND date = ${date}`;
        await sql`
            INSERT INTO stability_scores
                (org_id, date, total_score, trajectory_direction, score_delta,
                 liquidity_component, margin_component, receivables_component,
                 cost_component, revenue_component, calibration_profile)
            VALUES
                (${orgId}, ${date}, ${scoreResult.overall}, ${scoreResult.trend},
                 ${scoreResult.delta}, ${scoreResult.liquidity}, ${scoreResult.margins},
                 ${scoreResult.receivables}, ${scoreResult.costs}, ${scoreResult.revenue},
                 ${JSON.stringify(scoreResult.calibration)})
        `;

        // Audit log
        await sql`
            INSERT INTO action_logs (org_id, user_id, action_type, note, metadata)
            VALUES (${orgId}, ${session.userId}, ${'metrics_ingestion'},
                    ${'Manual data entry for ' + date},
                    ${JSON.stringify({ date, score: scoreResult.overall })})
        `;

        return NextResponse.json({ score: scoreResult });
    } catch (error) {
        return apiError.internal(error, 'Metrics ingestion error');
    }
}

/**
 * GET /api/metrics — Get latest metrics, score, and 30-day history
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return apiError.unauthorized();

        const orgId = session.orgId;

        const metrics = await sql`
            SELECT * FROM metrics_daily WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
        `;

        const score = await sql`
            SELECT * FROM stability_scores WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
        `;

        const history = await sql`
            SELECT date, total_score as stability_score, trajectory_direction as trend, score_delta
            FROM stability_scores WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 30
        `;

        return NextResponse.json({
            latestMetrics: metrics[0] || null,
            latestScore: score[0] || null,
            history,
        });
    } catch (error) {
        return apiError.internal(error, 'Metrics fetch error');
    }
}
