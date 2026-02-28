/**
 * THABAT Demo Seed Script — Calibrated
 *
 * Generates 4 industry demo orgs with 180 days of synthetic metrics.
 * Financial parameters are calibrated to produce specific target scores.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'thabat.db');
const DEMO_PASSWORD = 'Demo2026!';
const DAYS = 180;

interface DailyMetrics {
    cash: number;
    revenue: number;
    expenses: number;
    receivables: number;
    payables: number;
}

interface OrgProfile {
    name: string;
    email: string;
    industry: string;
    industryCode: string;
    revenueBand: string;
    growthStage: string;
    targetScore: number;
    targetTrend: string;
    gen: (day: number, total: number) => DailyMetrics;
}

function jitter(base: number, pct: number): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// Calibrated financial profiles — each tuned to produce target scores
const ORG_PROFILES: OrgProfile[] = [
    {
        // APEX TECH — 62 (Weakening): cash-tight, high revenue but receivables drift
        name: 'Apex Tech Solutions',
        email: 'apex@demo.thabat.app',
        industry: 'Technology',
        industryCode: 'TECH',
        revenueBand: '10M-50M',
        growthStage: 'high-growth',
        targetScore: 62,
        targetTrend: 'weakening',
        gen: (day, total) => {
            const t = day / total;
            const revenue = jitter(lerp(3400000, 3200000, t), 0.03);
            const expenses = jitter(lerp(2100000, 2200000, t), 0.03);
            const cash = jitter(lerp(12500000, 11000000, t), 0.04);
            const receivables = jitter(revenue * lerp(0.22, 0.32, t), 0.04);
            const payables = jitter(650000, 0.05);
            return { cash, revenue, expenses, receivables, payables };
        },
    },
    {
        // ELITE RETAIL — 48 (Critical): margin compression, rising costs
        name: 'Elite Retail Group',
        email: 'elite@demo.thabat.app',
        industry: 'Retail',
        industryCode: 'RETAIL',
        revenueBand: '50M-200M',
        growthStage: 'mature',
        targetScore: 48,
        targetTrend: 'weakening',
        gen: (day, total) => {
            const t = day / total;
            const revenue = jitter(lerp(8200000, 7800000, t), 0.05);
            const expenses = jitter(lerp(6600000, 7000000, t), 0.08);
            const cash = jitter(lerp(42000000, 38000000, t), 0.04);
            const receivables = jitter(revenue * 0.10, 0.04);
            const payables = jitter(2800000, 0.06);
            return { cash, revenue, expenses, receivables, payables };
        },
    },
    {
        // DAMMAM INDUSTRIAL — 78 (Stable): strong liquidity, good margins
        name: 'Dammam Industrial',
        email: 'dammam@demo.thabat.app',
        industry: 'Manufacturing',
        industryCode: 'MFG',
        revenueBand: '10M-50M',
        growthStage: 'stable',
        targetScore: 78,
        targetTrend: 'stable',
        gen: () => {
            const revenue = jitter(2200000, 0.02);
            const expenses = jitter(1400000, 0.02);
            const cash = jitter(10000000, 0.03);
            const receivables = jitter(revenue * 0.06, 0.03);
            const payables = jitter(350000, 0.03);
            return { cash, revenue, expenses, receivables, payables };
        },
    },
    {
        // VISIONARY CONSULTING — 71 (Strengthening): turnaround, expenses dropping
        name: 'Visionary Consulting',
        email: 'visionary@demo.thabat.app',
        industry: 'Professional Services',
        industryCode: 'PROF_SERVICES',
        revenueBand: '1M-10M',
        growthStage: 'turnaround',
        targetScore: 71,
        targetTrend: 'strengthening',
        gen: (day, total) => {
            const t = day / total;
            const revenue = jitter(lerp(800000, 1100000, t), 0.04);
            let expenses;
            if (day > total - 30) {
                const r = (day - (total - 30)) / 30;
                expenses = jitter(lerp(780000, 620000, r), 0.03);
            } else {
                expenses = jitter(lerp(850000, 780000, t), 0.04);
            }
            const cash = jitter(lerp(1200000, 2000000, t), 0.04);
            const receivables = jitter(revenue * lerp(0.15, 0.08, t), 0.04);
            const payables = jitter(180000, 0.04);
            return { cash, revenue, expenses, receivables, payables };
        },
    },
];

// ---- Scoring (mirroring scoring.ts) ----

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

function scoreLiquidity(cash: number, expenses: number) {
    return clamp((cash / Math.max(expenses, 1) / 12) * 100, 0, 100);
}
function scoreMargins(revenue: number, expenses: number) {
    if (revenue <= 0) return 0;
    return clamp((((revenue - expenses) / revenue) * 100 / 40) * 100, 0, 100);
}
function scoreReceivables(receivables: number, revenue: number) {
    if (revenue <= 0) return 50;
    return clamp((1 - receivables / revenue) * 100, 0, 100);
}
function scoreCosts(expenses: number, revenue: number) {
    if (revenue <= 0) return 50;
    return clamp(((1 - expenses / revenue) / 0.5) * 100, 0, 100);
}
function scoreRevenue(revenue: number, expenses: number) {
    if (revenue <= 0) return 0;
    return clamp((revenue / Math.max(expenses, 1)) * 50, 0, 100);
}

function computeTotal(m: DailyMetrics) {
    const liq = scoreLiquidity(m.cash, m.expenses);
    const mar = scoreMargins(m.revenue, m.expenses);
    const rec = scoreReceivables(m.receivables, m.revenue);
    const cos = scoreCosts(m.expenses, m.revenue);
    const rev = scoreRevenue(m.revenue, m.expenses);
    const total = liq * 0.30 + mar * 0.25 + rec * 0.15 + cos * 0.15 + rev * 0.15;
    return {
        total: Math.round(total * 10) / 10,
        liq: Math.round(liq * 10) / 10,
        mar: Math.round(mar * 10) / 10,
        rec: Math.round(rec * 10) / 10,
        cos: Math.round(cos * 10) / 10,
        rev: Math.round(rev * 10) / 10,
    };
}

// ---- Main ----

async function seed() {
    console.log('🌱 THABAT Demo Seed — Starting...\n');

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const today = new Date();
    const dates: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    // Clean existing demo data
    for (const p of ORG_PROFILES) {
        const existing = db.prepare('SELECT u.id, u.org_id FROM users u WHERE u.email = ?').get(p.email) as
            { id: string; org_id: string } | undefined;
        if (existing) {
            for (const tbl of ['stability_scores', 'normalized_metrics', 'metrics_daily', 'action_logs']) {
                db.prepare(`DELETE FROM ${tbl} WHERE org_id = ?`).run(existing.org_id);
            }
            db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
            db.prepare('DELETE FROM organizations WHERE id = ?').run(existing.org_id);
        }
    }

    const stmts = {
        org: db.prepare('INSERT INTO organizations (id, name, industry, industry_code, revenue_band, growth_stage) VALUES (?, ?, ?, ?, ?, ?)'),
        user: db.prepare("INSERT INTO users (id, org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'owner')"),
        metric: db.prepare('INSERT OR REPLACE INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables) VALUES (?, ?, ?, ?, ?, ?, ?)'),
        norm: db.prepare('INSERT OR REPLACE INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        score: db.prepare('INSERT OR REPLACE INTO stability_scores (org_id, date, total_score, trajectory_direction, score_delta, liquidity_component, margin_component, receivables_component, cost_component, revenue_component, calibration_profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    };

    const seedOrg = db.transaction((p: OrgProfile) => {
        const orgId = crypto.randomUUID().replace(/-/g, '');
        const userId = crypto.randomUUID().replace(/-/g, '');

        stmts.org.run(orgId, p.name, p.industry, p.industryCode, p.revenueBand, p.growthStage);
        stmts.user.run(userId, orgId, p.email, passwordHash, `Demo (${p.name})`);

        const history: number[] = [];
        let lastScore = 0;

        for (let day = 0; day < DAYS; day++) {
            const m = p.gen(day, DAYS);
            const date = dates[day];
            const s = computeTotal(m);

            // Trajectory (EMA)
            let trend = 'stable';
            if (history.length > 0) {
                const alpha = 0.2;
                let ema = history[history.length - 1];
                for (let i = history.length - 2; i >= Math.max(0, history.length - 30); i--) {
                    ema = alpha * history[i] + (1 - alpha) * ema;
                }
                const delta = s.total - ema;
                if (delta >= 3) trend = 'strengthening';
                else if (delta <= -3) trend = 'weakening';
            }

            const delta = history.length > 0
                ? Math.round((s.total - history[history.length - 1]) * 10) / 10
                : 0;

            const mExp = Math.max(m.expenses, 1);
            stmts.metric.run(orgId, date, m.cash, m.revenue, m.expenses, m.receivables, m.payables);
            stmts.norm.run(orgId, date,
                Math.round((m.cash / mExp) * 10) / 10,
                Math.round((m.expenses - m.revenue) * 100) / 100,
                m.revenue > 0 ? Math.round(((m.revenue - m.expenses) / m.revenue) * 1000) / 10 : 0,
                Math.round((m.cash / mExp) * 100) / 100,
                m.revenue > 0 ? Math.round((m.receivables / m.revenue) * 30 * 10) / 10 : 0,
                s.total, trend
            );
            stmts.score.run(orgId, date, s.total, trend, delta,
                s.liq, s.mar, s.rec, s.cos, s.rev,
                JSON.stringify({ industry: p.industryCode, revenueBand: p.revenueBand, growthStage: p.growthStage })
            );

            history.push(s.total);
            lastScore = s.total;
        }

        console.log(`  ✅ ${p.name}`);
        console.log(`     📧 ${p.email} | 📊 Score: ${lastScore} (target: ${p.targetScore}, ${p.targetTrend})`);
        console.log(`     📅 ${dates[0]} → ${dates[dates.length - 1]}\n`);
    });

    for (const p of ORG_PROFILES) {
        seedOrg(p);
    }

    console.log('🎉 Demo seed complete!');
    console.log(`🔑 Password for all: ${DEMO_PASSWORD}\n`);
    db.close();
}

seed().catch(console.error);
