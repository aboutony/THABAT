/**
 * THABAT Demo Seed Script
 *
 * Seeds a "Demo Org" with 6 months of synthetic data reflecting a
 * Strengthening → Peak → Weakening trajectory for investor walkthroughs.
 *
 * Usage: npx tsx src/db/seed-demo.ts
 */

import postgres from 'postgres';
import { calculateStabilityScore, computeNormalizedMetrics, type RawMetrics, type CalibrationProfile } from '../lib/scoring';

const connectionString = process.env.DATABASE_URL || 'postgres://thabat:thabat_dev@localhost:5432/thabat';
const sql = postgres(connectionString);

// ---- Demo narrative arc (6 months) ----
// Months 1-2: Strengthening (cash building, margins improving)
// Months 3-4: Peak stability (strong across all metrics)
// Months 5-6: Weakening (receivables climb, cash drops, margins compress)

function generateDailyMetrics(dayIndex: number, totalDays: number): RawMetrics {
    const progress = dayIndex / totalDays; // 0 → 1 over 180 days

    // Phase detection
    const isStrengthening = progress < 0.33;
    const isPeak = progress >= 0.33 && progress < 0.6;
    // const isWeakening = progress >= 0.6;

    // Base values (realistic Saudi SME, SAR)
    let cash: number, revenue: number, expenses: number, receivables: number, payables: number;

    if (isStrengthening) {
        // Cash building, margins widening
        const p = progress / 0.33; // 0→1 within phase
        cash = 850000 + p * 650000 + noise(50000);         // 850K → 1.5M
        revenue = 320000 + p * 130000 + noise(20000);      // 320K → 450K
        expenses = 250000 - p * 30000 + noise(15000);      // 250K → 220K
        receivables = 120000 - p * 40000 + noise(10000);   // 120K → 80K
        payables = 90000 - p * 20000 + noise(8000);        // 90K → 70K
    } else if (isPeak) {
        // Plateau — strong, stable metrics
        const p = (progress - 0.33) / 0.27;
        cash = 1500000 + p * 200000 + noise(40000);        // 1.5M → 1.7M
        revenue = 450000 + p * 50000 + noise(15000);       // 450K → 500K
        expenses = 220000 + noise(12000);                  // Stable ~220K
        receivables = 80000 + noise(8000);                 // Low ~80K
        payables = 70000 + noise(6000);                    // Low ~70K
    } else {
        // Weakening — cash drain, receivables spiking
        const p = (progress - 0.6) / 0.4;
        cash = 1700000 - p * 900000 + noise(60000);         // 1.7M → 800K
        revenue = 500000 - p * 180000 + noise(25000);       // 500K → 320K
        expenses = 220000 + p * 80000 + noise(15000);       // 220K → 300K
        receivables = 80000 + p * 200000 + noise(15000);    // 80K → 280K
        payables = 70000 + p * 100000 + noise(10000);       // 70K → 170K
    }

    return {
        cash: Math.max(0, Math.round(cash)),
        revenue: Math.max(0, Math.round(revenue)),
        expenses: Math.max(0, Math.round(expenses)),
        receivables: Math.max(0, Math.round(receivables)),
        payables: Math.max(0, Math.round(payables)),
    };
}

function noise(amplitude: number): number {
    return (Math.random() - 0.5) * 2 * amplitude;
}

async function seed() {
    console.log('🏗️  THABAT Demo Seed — Creating investor walkthrough data...\n');

    // 1. Create demo organization
    const [org] = await sql`
    INSERT INTO organizations (name, industry, industry_code, revenue_band, growth_stage, country, company_size)
    VALUES ('THABAT Demo Corp', 'technology', 'TECH', '5-20m', 'growth', 'SAU', 'medium')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

    let orgId: string;
    if (org) {
        orgId = org.id;
    } else {
        const existing = await sql`SELECT id FROM organizations WHERE name = 'THABAT Demo Corp'`;
        orgId = existing[0].id;
    }

    // 2. Create demo user
    // bcrypt hash of "demo1234" — pre-computed to avoid runtime dependency
    const demoHash = '$2b$12$LJ3m4YTjPGSfeNhX6G1.5OKW7fXJ.sN3YVj5rKbXBv5z9jB6Q3Xqe';
    await sql`
    INSERT INTO users (org_id, email, password_hash, full_name, role)
    VALUES (${orgId}, 'demo@thabat.ai', ${demoHash}, 'Demo Executive', 'owner')
    ON CONFLICT DO NOTHING
  `;

    console.log(`   ✓ Demo org created: ${orgId}`);

    // 3. Seed 180 days of data (6 months back from today)
    const totalDays = 180;
    const today = new Date();
    const historicalScores: number[] = [];

    const calibration: CalibrationProfile = {
        industryCode: 'TECH',
        revenueBand: '5-20m',
        growthStage: 'growth',
    };

    for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const metrics = generateDailyMetrics(totalDays - 1 - i, totalDays);

        // Upsert daily metrics
        await sql`
      INSERT INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables)
      VALUES (${orgId}, ${dateStr}, ${metrics.cash}, ${metrics.revenue}, ${metrics.expenses}, ${metrics.receivables}, ${metrics.payables})
      ON CONFLICT (org_id, date) DO UPDATE SET
        cash_balance = EXCLUDED.cash_balance, revenue = EXCLUDED.revenue,
        expenses = EXCLUDED.expenses, receivables = EXCLUDED.receivables,
        payables = EXCLUDED.payables
    `;

        // Calculate score
        const scoreResult = calculateStabilityScore(metrics, historicalScores.slice(-30), calibration);
        const normalized = computeNormalizedMetrics(metrics);

        // Upsert normalized
        await sql`
      INSERT INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend)
      VALUES (${orgId}, ${dateStr}, ${normalized.runway_months}, ${normalized.burn_rate}, ${normalized.margin_pct}, ${normalized.liquidity_ratio}, ${normalized.collection_days}, ${scoreResult.overall}, ${scoreResult.trend})
      ON CONFLICT (org_id, date) DO UPDATE SET
        runway_months = EXCLUDED.runway_months, burn_rate = EXCLUDED.burn_rate,
        margin_pct = EXCLUDED.margin_pct, liquidity_ratio = EXCLUDED.liquidity_ratio,
        collection_days = EXCLUDED.collection_days, stability_score = EXCLUDED.stability_score,
        trend = EXCLUDED.trend
    `;

        // Upsert stability_scores
        await sql`
      INSERT INTO stability_scores (org_id, date, total_score, trajectory_direction, score_delta, liquidity_component, margin_component, receivables_component, cost_component, revenue_component, calibration_profile)
      VALUES (${orgId}, ${dateStr}, ${scoreResult.overall}, ${scoreResult.trend}, ${scoreResult.delta}, ${scoreResult.liquidity}, ${scoreResult.margins}, ${scoreResult.receivables}, ${scoreResult.costs}, ${scoreResult.revenue}, ${JSON.stringify(scoreResult.calibration)})
      ON CONFLICT (org_id, date) DO UPDATE SET
        total_score = EXCLUDED.total_score, trajectory_direction = EXCLUDED.trajectory_direction,
        score_delta = EXCLUDED.score_delta, liquidity_component = EXCLUDED.liquidity_component,
        margin_component = EXCLUDED.margin_component, receivables_component = EXCLUDED.receivables_component,
        cost_component = EXCLUDED.cost_component, revenue_component = EXCLUDED.revenue_component,
        calibration_profile = EXCLUDED.calibration_profile
    `;

        historicalScores.push(scoreResult.overall);

        // Progress indicator
        if ((totalDays - i) % 30 === 0) {
            const month = Math.ceil((totalDays - i) / 30);
            console.log(`   ✓ Month ${month} seeded — Score: ${scoreResult.overall} (${scoreResult.trend})`);
        }
    }

    // 4. Log seed action
    const users = await sql`SELECT id FROM users WHERE email = 'demo@thabat.ai'`;
    if (users.length > 0) {
        await sql`
      INSERT INTO action_logs (org_id, user_id, action_type, note)
      VALUES (${orgId}, ${users[0].id}, 'demo_seed', '6-month synthetic data seeded for investor walkthrough')
    `;
    }

    console.log('\n✅ Demo seed complete!');
    console.log(`   📊 ${totalDays} days of data seeded`);
    console.log(`   🔐 Login: demo@thabat.ai / demo1234`);
    console.log(`   📈 Narrative: Strengthening → Peak → Weakening`);

    await sql.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
