/**
 * THABAT Database Layer — Turso (libSQL)
 *
 * Uses @libsql/client for Vercel-compatible serverless SQLite.
 * Exports an async `sql` tagged template and schema initialization.
 */

import { createClient, type Client, type InArgs } from '@libsql/client';

// Singleton
let _client: Client | null = null;
let _schemaInitialized = false;

function getClient(): Client {
    if (!_client) {
        const url = process.env.TURSO_DATABASE_URL;
        const authToken = process.env.TURSO_AUTH_TOKEN;

        if (!url) {
            throw new Error('TURSO_DATABASE_URL environment variable is required');
        }

        _client = createClient({
            url,
            authToken: authToken || undefined,
        });
    }
    return _client;
}

async function initSchema(): Promise<void> {
    if (_schemaInitialized) return;
    const client = getClient();

    const statements = [
        `CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            industry TEXT,
            industry_code TEXT,
            revenue_band TEXT,
            growth_stage TEXT,
            country TEXT DEFAULT 'SAU',
            company_size TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            org_id TEXT NOT NULL REFERENCES organizations(id),
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            language_preference TEXT DEFAULT 'en',
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS metrics_daily (
            org_id TEXT NOT NULL REFERENCES organizations(id),
            date TEXT NOT NULL,
            cash_balance REAL,
            revenue REAL,
            expenses REAL,
            receivables REAL,
            payables REAL,
            gross_margin REAL,
            net_income REAL,
            headcount INTEGER,
            burn_rate REAL,
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (org_id, date)
        )`,
        `CREATE TABLE IF NOT EXISTS normalized_metrics (
            org_id TEXT NOT NULL REFERENCES organizations(id),
            date TEXT NOT NULL,
            runway_months REAL,
            burn_rate REAL,
            margin_pct REAL,
            liquidity_ratio REAL,
            collection_days REAL,
            stability_score REAL,
            trend TEXT DEFAULT 'stable',
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (org_id, date)
        )`,
        `CREATE TABLE IF NOT EXISTS stability_scores (
            org_id TEXT NOT NULL REFERENCES organizations(id),
            date TEXT NOT NULL,
            total_score REAL NOT NULL,
            trajectory_direction TEXT DEFAULT 'stable',
            score_delta REAL DEFAULT 0,
            liquidity_component REAL,
            margin_component REAL,
            receivables_component REAL,
            cost_component REAL,
            revenue_component REAL,
            calibration_profile TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (org_id, date)
        )`,
        `CREATE TABLE IF NOT EXISTS action_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id TEXT NOT NULL REFERENCES organizations(id),
            user_id TEXT REFERENCES users(id),
            action_type TEXT NOT NULL,
            note TEXT,
            metadata TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS integrations (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            org_id TEXT NOT NULL REFERENCES organizations(id),
            provider TEXT NOT NULL,
            config TEXT,
            status TEXT DEFAULT 'disconnected',
            last_synced_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
    ];

    for (const stmt of statements) {
        await client.execute(stmt);
    }
    _schemaInitialized = true;
}

// ---- Async tagged-template SQL interface ----

interface Row {
    [key: string]: unknown;
}

/**
 * Creates an async tagged-template SQL interface compatible with the existing API.
 * Usage: const rows = await sql`SELECT * FROM t WHERE x = ${val}`;
 */
function createSql() {
    async function handler(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
        await initSchema();
        const client = getClient();

        // Build parameterized query
        let query = '';
        for (let i = 0; i < strings.length; i++) {
            query += strings[i];
            if (i < values.length) {
                query += '?';
            }
        }

        const args = values.map((v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (typeof v === 'number' || typeof v === 'string') return v;
            return String(v);
        }) as InArgs;

        try {
            const result = await client.execute({ sql: query.trim(), args });
            // Convert libsql rows to plain objects
            return result.rows.map((row) => {
                const obj: Row = {};
                for (const col of result.columns) {
                    obj[col] = row[col as keyof typeof row] ?? null;
                }
                return obj;
            });
        } catch (error) {
            console.error('[SQL Error]', query.trim().substring(0, 200), error);
            throw error;
        }
    }

    // Add .unsafe() for raw SQL strings
    handler.unsafe = async function (query: string): Promise<Row[]> {
        await initSchema();
        const client = getClient();
        try {
            const result = await client.execute(query);
            return result.rows.map((row) => {
                const obj: Row = {};
                for (const col of result.columns) {
                    obj[col] = row[col as keyof typeof row] ?? null;
                }
                return obj;
            });
        } catch (error) {
            console.error('[SQL unsafe Error]', query.substring(0, 200), error);
            throw error;
        }
    };

    // Add .begin() for transactions
    handler.begin = async function <T>(callback: (tx: typeof handler) => Promise<T>): Promise<T> {
        // Turso doesn't support traditional transactions in HTTP mode,
        // but we can use the batch API. For now, just run sequentially.
        return callback(handler);
    };

    return handler;
}

const sql = createSql();

export default sql;

/**
 * Execute within tenant context.
 * In Turso mode, the API routes already filter by org_id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withTenant<T>(
    orgId: string,
    callback: (tx: any) => Promise<T>
): Promise<T> {
    void orgId; // org_id filtering is done in queries
    return callback(sql);
}

/**
 * Execute without RLS (same behavior in Turso mode).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withoutRLS<T>(
    callback: (tx: any) => Promise<T>
): Promise<T> {
    return callback(sql);
}

export { getClient, initSchema };
