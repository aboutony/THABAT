import { NextRequest, NextResponse } from 'next/server';
import sql from '@/db';
import { getSession } from '@/lib/auth';
import {
    calculateStabilityScore,
    computeNormalizedMetrics,
    type RawMetrics,
    type CalibrationProfile,
} from '@/lib/scoring';

/**
 * POST /api/metrics — Ingest daily metrics and calculate calibrated score
 * Body: { date, cash, revenue, expenses, receivables, payables }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, cash, revenue, expenses, receivables, payables } = body;

        if (!date || cash == null || revenue == null || expenses == null || receivables == null || payables == null) {
            return NextResponse.json(
                { error: 'All fields required: date, cash, revenue, expenses, receivables, payables' },
                { status: 400 }
            );
        }

        const orgId = session.orgId;

        // 1. Fetch org profile for calibration
        const orgs = sql`SELECT industry, industry_code, revenue_band, growth_stage FROM organizations WHERE id = ${orgId}` as { industry: string; industry_code: string; revenue_band: string; growth_stage: string }[];
        const org = orgs[0] || {};
        const calibration: CalibrationProfile = {
            industryCode: org.industry_code || org.industry,
            revenueBand: org.revenue_band,
            growthStage: org.growth_stage,
        };

        // 2. Upsert daily metrics (SQLite ON CONFLICT)
        // Delete + re-insert for upsert since SQLite tagged template doesn't support ON CONFLICT well
        sql`DELETE FROM metrics_daily WHERE org_id = ${orgId} AND date = ${date}`;
        sql`INSERT INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables) VALUES (${orgId}, ${date}, ${cash}, ${revenue}, ${expenses}, ${receivables}, ${payables})`;

        // 3. Fetch historical scores for EMA trajectory
        const history = sql`
      SELECT stability_score FROM normalized_metrics
      WHERE org_id = ${orgId} AND date < ${date} AND stability_score IS NOT NULL
      ORDER BY date DESC LIMIT 30
    ` as { stability_score: number }[];

        const historicalScores = history.map((r) => Number(r.stability_score));

        // 4. Calculate calibrated stability score
        const rawMetrics: RawMetrics = { cash, revenue, expenses, receivables, payables };
        const scoreResult = calculateStabilityScore(rawMetrics, historicalScores, calibration);
        const normalized = computeNormalizedMetrics(rawMetrics);

        // 5. Upsert normalized metrics
        sql`DELETE FROM normalized_metrics WHERE org_id = ${orgId} AND date = ${date}`;
        sql`INSERT INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend) VALUES (${orgId}, ${date}, ${normalized.runway_months}, ${normalized.burn_rate}, ${normalized.margin_pct}, ${normalized.liquidity_ratio}, ${normalized.collection_days}, ${scoreResult.overall}, ${scoreResult.trend})`;

        // 6. Upsert stability_scores
        sql`DELETE FROM stability_scores WHERE org_id = ${orgId} AND date = ${date}`;
        sql`INSERT INTO stability_scores (org_id, date, total_score, trajectory_direction, score_delta, liquidity_component, margin_component, receivables_component, cost_component, revenue_component, calibration_profile) VALUES (${orgId}, ${date}, ${scoreResult.overall}, ${scoreResult.trend}, ${scoreResult.delta}, ${scoreResult.liquidity}, ${scoreResult.margins}, ${scoreResult.receivables}, ${scoreResult.costs}, ${scoreResult.revenue}, ${JSON.stringify(scoreResult.calibration)})`;

        // 7. Log the action
        sql`INSERT INTO action_logs (org_id, user_id, action_type, note, metadata) VALUES (${orgId}, ${session.userId}, ${'metrics_ingestion'}, ${'Manual data entry for ' + date}, ${JSON.stringify({ date, score: scoreResult.overall })})`;

        return NextResponse.json({ score: scoreResult });
    } catch (error) {
        console.error('Metrics ingestion error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/metrics — Get latest metrics, score, and history
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orgId = session.orgId;

        const metrics = sql`
      SELECT * FROM metrics_daily WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
    `;

        const score = sql`
      SELECT * FROM stability_scores WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 1
    `;

        const history = sql`
      SELECT date, total_score as stability_score, trajectory_direction as trend, score_delta
      FROM stability_scores WHERE org_id = ${orgId} ORDER BY date DESC LIMIT 30
    `;

        return NextResponse.json({
            latestMetrics: metrics[0] || null,
            latestScore: score[0] || null,
            history,
        });
    } catch (error) {
        console.error('Metrics fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
