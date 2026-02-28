/**
 * THABAT Demo Seed — Turso (libSQL)
 * 
 * Seeds 4 demo orgs with 180 days of synthetic metrics.
 * Run: npx tsx scripts/seed-demo.ts
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const DEMO_PASSWORD = 'Demo2026!';
const DAYS = 180;

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// ---- Helpers ----
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function scoreLiq(cash: number, exp: number) { return clamp((cash / Math.max(exp, 1) / 12) * 100, 0, 100); }
function scoreMar(rev: number, exp: number) { if (rev <= 0) return 0; return clamp((((rev - exp) / rev) * 100 / 40) * 100, 0, 100); }
function scoreRec(rec: number, rev: number) { if (rev <= 0) return 50; return clamp((1 - rec / rev) * 100, 0, 100); }
function scoreCos(exp: number, rev: number) { if (rev <= 0) return 50; return clamp(((1 - exp / rev) / 0.5) * 100, 0, 100); }
function scoreRev(rev: number, exp: number) { if (rev <= 0) return 0; return clamp((rev / Math.max(exp, 1)) * 50, 0, 100); }

interface M { cash: number; revenue: number; expenses: number; receivables: number; payables: number; }
function jitter(b: number, p: number) { return b * (1 + (Math.random() * 2 - 1) * p); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

const PROFILES = [
    {
        name: 'Apex Tech Solutions', email: 'apex@demo.thabat.app', industry: 'Technology', code: 'TECH', band: '10M-50M', stage: 'high-growth',
        gen: (d: number, t: number): M => { const p = d / t; return { cash: jitter(lerp(11e6, 9.8e6, p), 0.04), revenue: jitter(lerp(3.4e6, 3.2e6, p), 0.03), expenses: jitter(lerp(2.1e6, 2.2e6, p), 0.03), receivables: jitter(lerp(3.4e6, 3.2e6, p) * lerp(0.22, 0.32, p), 0.04), payables: jitter(650000, 0.05) } }
    },
    {
        name: 'Elite Retail Group', email: 'elite@demo.thabat.app', industry: 'Retail', code: 'RETAIL', band: '50M-200M', stage: 'mature',
        gen: (d: number, t: number): M => { const p = d / t; return { cash: jitter(lerp(38e6, 34e6, p), 0.04), revenue: jitter(lerp(8.2e6, 7.8e6, p), 0.05), expenses: jitter(lerp(6.6e6, 7e6, p), 0.08), receivables: jitter(lerp(8.2e6, 7.8e6, p) * 0.10, 0.04), payables: jitter(2.8e6, 0.06) } }
    },
    {
        name: 'Dammam Industrial', email: 'dammam@demo.thabat.app', industry: 'Manufacturing', code: 'MFG', band: '10M-50M', stage: 'stable',
        gen: (): M => ({ cash: jitter(10e6, 0.03), revenue: jitter(2.2e6, 0.02), expenses: jitter(1.4e6, 0.02), receivables: jitter(2.2e6 * 0.06, 0.03), payables: jitter(350000, 0.03) })
    },
    {
        name: 'Visionary Consulting', email: 'visionary@demo.thabat.app', industry: 'Professional Services', code: 'PROF_SERVICES', band: '1M-10M', stage: 'turnaround',
        gen: (d: number, t: number): M => { const p = d / t; const rev = jitter(lerp(8e5, 1.1e6, p), 0.04); let exp; if (d > t - 30) { exp = jitter(lerp(780000, 620000, (d - (t - 30)) / 30), 0.03) } else { exp = jitter(lerp(850000, 780000, p), 0.04) } return { cash: jitter(lerp(2.2e6, 3.5e6, p), 0.04), revenue: rev, expenses: exp, receivables: jitter(rev * lerp(0.15, 0.08, p), 0.04), payables: jitter(180000, 0.04) } }
    },
];

// Schema
const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), name TEXT NOT NULL, industry TEXT, industry_code TEXT, revenue_band TEXT, growth_stage TEXT, country TEXT DEFAULT 'SAU', company_size TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT DEFAULT 'member', language_preference TEXT DEFAULT 'en', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS metrics_daily (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, cash_balance REAL, revenue REAL, expenses REAL, receivables REAL, payables REAL, gross_margin REAL, net_income REAL, headcount INTEGER, burn_rate REAL, created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS normalized_metrics (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, runway_months REAL, burn_rate REAL, margin_pct REAL, liquidity_ratio REAL, collection_days REAL, stability_score REAL, trend TEXT DEFAULT 'stable', created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS stability_scores (org_id TEXT NOT NULL REFERENCES organizations(id), date TEXT NOT NULL, total_score REAL NOT NULL, trajectory_direction TEXT DEFAULT 'stable', score_delta REAL DEFAULT 0, liquidity_component REAL, margin_component REAL, receivables_component REAL, cost_component REAL, revenue_component REAL, calibration_profile TEXT, created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (org_id, date))`,
    `CREATE TABLE IF NOT EXISTS action_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id TEXT NOT NULL REFERENCES organizations(id), user_id TEXT REFERENCES users(id), action_type TEXT NOT NULL, note TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), org_id TEXT NOT NULL REFERENCES organizations(id), provider TEXT NOT NULL, config TEXT, status TEXT DEFAULT 'disconnected', last_synced_at TEXT, created_at TEXT DEFAULT (datetime('now')))`,
];

async function main() {
    console.log('🔄 Creating schema...');
    for (const stmt of SCHEMA) {
        await client.execute(stmt);
    }

    const pwHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const today = new Date();
    const dates: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); dates.push(d.toISOString().split('T')[0]); }

    // Clean
    console.log('🧹 Cleaning existing demo data...');
    for (const p of PROFILES) {
        const res = await client.execute({ sql: 'SELECT u.id, u.org_id FROM users u WHERE u.email = ?', args: [p.email] });
        if (res.rows.length > 0) {
            const orgId = res.rows[0].org_id as string;
            const userId = res.rows[0].id as string;
            for (const tbl of ['stability_scores', 'normalized_metrics', 'metrics_daily', 'action_logs']) {
                await client.execute({ sql: `DELETE FROM ${tbl} WHERE org_id = ?`, args: [orgId] });
            }
            await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });
            await client.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [orgId] });
        }
    }

    // Seed each profile
    for (const p of PROFILES) {
        console.log(`📊 Seeding ${p.name}...`);
        const orgId = crypto.randomUUID().replace(/-/g, '');
        const userId = crypto.randomUUID().replace(/-/g, '');

        await client.execute({ sql: 'INSERT INTO organizations (id, name, industry, industry_code, revenue_band, growth_stage) VALUES (?, ?, ?, ?, ?, ?)', args: [orgId, p.name, p.industry, p.code, p.band, p.stage] });
        await client.execute({ sql: "INSERT INTO users (id, org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'owner')", args: [userId, orgId, p.email, pwHash, `Demo (${p.name})`] });

        const hist: number[] = [];
        for (let day = 0; day < DAYS; day++) {
            const m = p.gen(day, DAYS);
            const date = dates[day];
            const liq = scoreLiq(m.cash, m.expenses);
            const mar = scoreMar(m.revenue, m.expenses);
            const rec = scoreRec(m.receivables, m.revenue);
            const cos = scoreCos(m.expenses, m.revenue);
            const rev = scoreRev(m.revenue, m.expenses);
            const total = Math.round((liq * 0.3 + mar * 0.25 + rec * 0.15 + cos * 0.15 + rev * 0.15) * 10) / 10;

            let trend = 'stable';
            if (hist.length > 0) {
                const alpha = 0.2; let ema = hist[hist.length - 1];
                for (let i = hist.length - 2; i >= Math.max(0, hist.length - 30); i--) ema = alpha * hist[i] + (1 - alpha) * ema;
                const d = total - ema; if (d >= 3) trend = 'strengthening'; else if (d <= -3) trend = 'weakening';
            }
            const delta = hist.length > 0 ? Math.round((total - hist[hist.length - 1]) * 10) / 10 : 0;
            const mE = Math.max(m.expenses, 1);

            await client.execute({ sql: 'INSERT OR REPLACE INTO metrics_daily (org_id, date, cash_balance, revenue, expenses, receivables, payables) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [orgId, date, m.cash, m.revenue, m.expenses, m.receivables, m.payables] });
            await client.execute({
                sql: 'INSERT OR REPLACE INTO normalized_metrics (org_id, date, runway_months, burn_rate, margin_pct, liquidity_ratio, collection_days, stability_score, trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                args: [orgId, date, Math.round((m.cash / mE) * 10) / 10, Math.round((m.expenses - m.revenue) * 100) / 100, m.revenue > 0 ? Math.round(((m.revenue - m.expenses) / m.revenue) * 1000) / 10 : 0, Math.round((m.cash / mE) * 100) / 100, m.revenue > 0 ? Math.round((m.receivables / m.revenue) * 30 * 10) / 10 : 0, total, trend]
            });
            await client.execute({
                sql: 'INSERT OR REPLACE INTO stability_scores (org_id, date, total_score, trajectory_direction, score_delta, liquidity_component, margin_component, receivables_component, cost_component, revenue_component, calibration_profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                args: [orgId, date, total, trend, delta, Math.round(liq * 10) / 10, Math.round(mar * 10) / 10, Math.round(rec * 10) / 10, Math.round(cos * 10) / 10, Math.round(rev * 10) / 10, JSON.stringify({ industry: p.code, revenueBand: p.band, growthStage: p.stage })]
            });
            hist.push(total);
        }
        console.log(`  ✅ ${p.name} done — ${DAYS} days seeded`);
    }

    console.log('\n🎉 Demo seed complete — 4 orgs × 180 days');
    process.exit(0);
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
