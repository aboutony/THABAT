/**
 * THABAT — UNIMED Enterprise Demo Seed (Phase 11)
 *
 * Seeds 2 UNIMED entities (KSA + UAE) with 180 days of scaled financial data.
 * Narrative: High growth but tightening liquidity due to slow medical receivables.
 *
 * KSA: ~SAR 12,000,000/month revenue
 * UAE: ~AED 8,000,000/month revenue (→ SAR via 0.98 FX rate)
 *
 * Run: npx tsx scripts/seed-unimed.ts
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const DEMO_PASSWORD = 'Demo2026!';
const DAYS = 180;
const AED_TO_SAR = 0.98;

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// ---- Helpers ----
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function jitter(base: number, pct: number) { return base * (1 + (Math.random() * 2 - 1) * pct); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Scoring helpers (simplified for seed — matches scoring.ts logic)
function scoreLiq(cash: number, exp: number) { return clamp((cash / Math.max(exp, 1) / 12) * 100, 0, 100); }
function scoreMar(rev: number, exp: number, vat: number, corpTax: number) {
    if (rev <= 0) return 0;
    const trueExp = exp - vat;
    let margin = ((rev - trueExp) / rev) * 100;
    if (corpTax > 0 && rev > trueExp) {
        const taxProv = (rev - trueExp) * corpTax;
        margin = ((rev - trueExp - taxProv) / rev) * 100;
    }
    return clamp((margin / 40) * 100, 0, 100);
}
function scoreRec(rec: number, rev: number, warnDays: number) {
    if (rev <= 0) return 50;
    const thresholdRatio = warnDays / 30;
    return clamp((1 - (rec / rev) / thresholdRatio) * 100, 0, 100);
}
function scoreCos(exp: number, rev: number) { if (rev <= 0) return 50; return clamp(((1 - exp / rev) / 0.5) * 100, 0, 100); }
function scoreRev(rev: number, exp: number) { if (rev <= 0) return 0; return clamp((rev / Math.max(exp, 1)) * 50, 0, 100); }

interface M { cash: number; revenue: number; expenses: number; receivables: number; payables: number; vatAmount: number; }

/**
 * UNIMED KSA (Riyadh) — ~SAR 12M/month
 * Narrative: Stable manufacturer, strong revenue, but receivables aging (85→95 day DSO)
 * and cash tightening as growth investments eat into liquidity
 */
function genKSA(day: number, total: number): M {
    const p = day / total; // 0 → 1 over 180 days

    // Revenue: starts strong, maintains with slight growth
    const revenue = jitter(lerp(11_800_000, 12_500_000, p), 0.04);

    // Expenses: growing faster than revenue (expansion costs)
    const expenses = jitter(lerp(8_200_000, 9_600_000, p), 0.03);

    // Cash: starts healthy but tightens due to receivables + capex
    const cash = jitter(lerp(42_000_000, 28_000_000, p), 0.04);

    // Receivables: aging from 85 → 95 day DSO (medical procurement delays)
    const dso = lerp(85, 95, p);
    const receivables = jitter(revenue * (dso / 30), 0.05);

    // Payables
    const payables = jitter(lerp(3_200_000, 3_800_000, p), 0.04);

    // VAT: 15% of expenses (KSA)
    const vatAmount = expenses * 0.15;

    return { cash: Math.max(0, cash), revenue: Math.max(0, revenue), expenses: Math.max(0, expenses), receivables: Math.max(0, receivables), payables: Math.max(0, payables), vatAmount: Math.max(0, vatAmount) };
}

/**
 * UNIMED UAE (Dubai) — ~AED 8M/month (stored as-is, normalized in UI)
 * Narrative: Growth entity, higher margins, but also tightening liquidity.
 * 9% corporate tax is visible in margin calculation.
 */
function genUAE(day: number, total: number): M {
    const p = day / total;

    // Revenue in AED: growing
    const revenueAED = jitter(lerp(7_600_000, 8_500_000, p), 0.04);

    // Expenses in AED: growing with expansion
    const expensesAED = jitter(lerp(5_100_000, 6_200_000, p), 0.03);

    // Cash in AED
    const cashAED = jitter(lerp(28_000_000, 19_000_000, p), 0.04);

    // Receivables: 75 → 88 day DSO
    const dso = lerp(75, 88, p);
    const receivablesAED = jitter(revenueAED * (dso / 30), 0.05);

    // Payables
    const payablesAED = jitter(lerp(2_100_000, 2_600_000, p), 0.04);

    // VAT: 5% (UAE)
    const vatAmountAED = expensesAED * 0.05;

    // Store in AED (we normalize to SAR in consolidated view)
    return {
        cash: Math.max(0, cashAED),
        revenue: Math.max(0, revenueAED),
        expenses: Math.max(0, expensesAED),
        receivables: Math.max(0, receivablesAED),
        payables: Math.max(0, payablesAED),
        vatAmount: Math.max(0, vatAmountAED),
    };
}

const PROFILES = [
    {
        name: 'UNIMED KSA',
        email: 'ksa@demo.unimed.thabat.app',
        industry: 'Medical Manufacturing',
        code: 'MEDICAL_MFG',
        band: '50-200m',
        stage: 'growth',
        country: 'SAU',
        currency: 'SAR',
        vatRate: 0.15,
        corpTaxRate: 0,
        warningDays: 90,
        entityGroup: 'unimed',
        gen: genKSA,
    },
    {
        name: 'UNIMED UAE',
        email: 'uae@demo.unimed.thabat.app',
        industry: 'Medical Manufacturing',
        code: 'MEDICAL_MFG',
        band: '50-200m',
        stage: 'growth',
        country: 'UAE',
        currency: 'AED',
        vatRate: 0.05,
        corpTaxRate: 0.09,
        warningDays: 90,
        entityGroup: 'unimed',
        gen: genUAE,
    },
];

// Schema extension (safe ALTERs)
const SCHEMA_EXT = [
    `CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), name TEXT NOT NULL, industry TEXT, industry_code TEXT, revenue_band TEXT, growth_stage TEXT, country TEXT DEFAULT 'SAU', company_size TEXT, entity_group TEXT, currency TEXT DEFAULT 'SAR', vat_rate REAL DEFAULT 0.15, corp_tax_rate REAL DEFAULT 0, receivables_warning_days INTEGER DEFAULT 30, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT DEFAULT 'member', language_preference TEXT DEFAULT 'en', theme_preference TEXT DEFAULT 'dark', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS metrics_daily (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, cash_balance REAL, revenue REAL, expenses REAL, receivables REAL, payables REAL, vat_amount REAL DEFAULT 0, gross_margin REAL, net_income REAL, headcount INTEGER, burn_rate REAL, created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS normalized_metrics (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, runway_months REAL, burn_rate REAL, margin_pct REAL, liquidity_ratio REAL, collection_days REAL, stability_score REAL, trend TEXT DEFAULT 'stable', created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS stability_scores (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, total_score REAL NOT NULL, trajectory_direction TEXT DEFAULT 'stable', score_delta REAL DEFAULT 0, liquidity_component REAL, margin_component REAL, receivables_component REAL, cost_component REAL, revenue_component REAL, calibration_profile TEXT, created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS action_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id TEXT NOT NULL REFERENCES organizations(id), user_id TEXT REFERENCES users(id), action_type TEXT NOT NULL, note TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id), provider TEXT NOT NULL, config TEXT, status TEXT DEFAULT 'disconnected', last_synced_at TEXT, created_at TEXT DEFAULT (datetime('now')))`,
];

async function main() {
    console.log('🏥 UNIMED Enterprise Demo Seed — Phase 11');
    console.log('   KSA: ~SAR 12M/month | UAE: ~AED 8M/month\n');

    // Ensure schema
    console.log('🔄 Ensuring schema...');
    for (const stmt of SCHEMA_EXT) {
        await client.execute(stmt);
    }

    // Try to add new columns (safe — ignores if already exist)
    const alterStmts = [
        'ALTER TABLE organizations ADD COLUMN entity_group TEXT',
        "ALTER TABLE organizations ADD COLUMN currency TEXT DEFAULT 'SAR'",
        'ALTER TABLE organizations ADD COLUMN vat_rate REAL DEFAULT 0.15',
        'ALTER TABLE organizations ADD COLUMN corp_tax_rate REAL DEFAULT 0',
        'ALTER TABLE organizations ADD COLUMN receivables_warning_days INTEGER DEFAULT 30',
        'ALTER TABLE metrics_daily ADD COLUMN vat_amount REAL DEFAULT 0',
    ];
    for (const stmt of alterStmts) {
        try { await client.execute(stmt); } catch { /* column already exists */ }
    }

    const pwHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const today = new Date();
    const dates: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    // Clean existing UNIMED demo data
    console.log('🧹 Cleaning existing UNIMED data...');
    for (const p of PROFILES) {
        const res = await client.execute({ sql: 'SELECT u.id, u.org_id FROM users u WHERE u.email = ?', args: [p.email] });
        if (res.rows.length > 0) {
            const orgId = res.rows[0].org_id as string;
            const userId = res.rows[0].id as string;
            for (const tbl of ['stability_scores', 'normalized_metrics', 'metrics_daily', 'action_logs', 'integrations']) {
                await client.execute({ sql: `DELETE FROM ${tbl} WHERE org_id = ?`, args: [orgId] });
            }
            await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });
            await client.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [orgId] });
        }
    }

    // Seed each UNIMED entity
    for (const p of PROFILES) {
        console.log(`\n📊 Seeding ${p.name} (${p.currency})...`);
        const orgId = crypto.randomUUID().replace(/-/g, '');
        const userId = crypto.randomUUID().replace(/-/g, '');

        await client.execute({
            sql: 'INSERT INTO organizations (id, name, industry, industry_code, revenue_band, growth_stage, country, currency, vat_rate, corp_tax_rate, receivables_warning_days, entity_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [orgId, p.name, p.industry, p.code, p.band, p.stage, p.country, p.currency, p.vatRate, p.corpTaxRate, p.warningDays, p.entityGroup],
        });
        await client.execute({
            sql: "INSERT INTO users (id, org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'owner')",
            args: [userId, orgId, p.email, pwHash, `CFO (${p.name})`],
        });

        const hist: number[] = [];
        for (let day = 0; day < DAYS; day++) {
            const m = p.gen(day, DAYS);
            const date = dates[day];

            // Scoring
            const liq = scoreLiq(m.cash, m.expenses);
            const mar = scoreMar(m.revenue, m.expenses, m.vatAmount, p.corpTaxRate);
            const rec = scoreRec(m.receivables, m.revenue, p.warningDays);
            const cos = scoreCos(m.expenses, m.revenue);
            const rev = scoreRev(m.revenue, m.expenses);
            const total = Math.round((liq * 0.3 + mar * 0.25 + rec * 0.15 + cos * 0.15 + rev * 0.15) * 10) / 10;

            // EMA trajectory
            let trend = 'stable';
            if (hist.length > 0) {
                const alpha = 0.2;
                let ema = hist[hist.length - 1];
                for (let i = hist.length - 2; i >= Math.max(0, hist.length - 30); i--) {
                    ema = alpha * hist[i] + (1 - alpha) * ema;
                }
                const d = total - ema;
                if (d >= 3) trend = 'strengthening';
                else if (d <= -3) trend = 'weakening';
            }
            const delta = hist.length > 0 ? Math.round((total - hist[hist.length - 1]) * 10) / 10 : 0;
            const mE = Math.max(m.expenses, 1);

            // Insert metrics
            await client.execute({
                sql: 'INSERT OR REPLACE INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables, vat_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                args: [orgId, date, m.cash, m.revenue, m.expenses, m.receivables, m.payables, m.vatAmount],
            });

            // Normalized metrics
            const trueExp = m.expenses - m.vatAmount;
            let marginPct = m.revenue > 0 ? ((m.revenue - trueExp) / m.revenue) * 100 : 0;
            if (p.corpTaxRate > 0 && m.revenue > trueExp) {
                const taxProv = (m.revenue - trueExp) * p.corpTaxRate;
                marginPct = ((m.revenue - trueExp - taxProv) / m.revenue) * 100;
            }

            await client.execute({
                sql: 'INSERT OR REPLACE INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                args: [
                    orgId, date,
                    Math.round((m.cash / mE) * 10) / 10,
                    Math.round((m.expenses - m.revenue) * 100) / 100,
                    Math.round(marginPct * 10) / 10,
                    Math.round((m.cash / mE) * 100) / 100,
                    m.revenue > 0 ? Math.round((m.receivables / m.revenue) * 30 * 10) / 10 : 0,
                    total,
                    trend,
                ],
            });

            // Stability scores
            await client.execute({
                sql: 'INSERT OR REPLACE INTO stability_scores (org_id, date, total_score, trajectory_direction, score_delta, liquidity_component, margin_component, receivables_component, cost_component, revenue_component, calibration_profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                args: [
                    orgId, date, total, trend, delta,
                    Math.round(liq * 10) / 10,
                    Math.round(mar * 10) / 10,
                    Math.round(rec * 10) / 10,
                    Math.round(cos * 10) / 10,
                    Math.round(rev * 10) / 10,
                    JSON.stringify({ industry: p.code, revenueBand: p.band, growthStage: p.stage, currency: p.currency, vatRate: p.vatRate, corpTaxRate: p.corpTaxRate }),
                ],
            });

            hist.push(total);
        }

        const lastScore = hist[hist.length - 1];
        const lastTrend = hist.length > 1 && lastScore < hist[hist.length - 2] ? 'weakening' : 'stable';
        console.log(`  ✅ ${p.name} done — ${DAYS} days | Final score: ${lastScore} (${lastTrend})`);
    }

    console.log('\n🎉 UNIMED Enterprise seed complete!');
    console.log('   🏭 UNIMED KSA: ksa@demo.unimed.thabat.app / Demo2026!');
    console.log('   🏭 UNIMED UAE: uae@demo.unimed.thabat.app / Demo2026!');
    console.log('   📈 Narrative: High growth + tightening liquidity (medical receivables)');
    process.exit(0);
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
