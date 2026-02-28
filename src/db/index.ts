/**
 * THABAT Database Layer — SQLite Fallback for Local Development
 *
 * When DATABASE_URL is not reachable, uses a local SQLite file (thabat.db)
 * with a postgres-compatible query interface.
 *
 * This module exports the same `sql` tagged template and `withTenant` / `withoutRLS`
 * helpers as the postgres version, so all API routes work without changes.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'thabat.db');

// Singleton
let _db: Database.Database | null = null;

function getDb(): Database.Database {
    if (!_db) {
        _db = new Database(DB_PATH);
        _db.pragma('journal_mode = WAL');
        _db.pragma('foreign_keys = ON');
        initSchema(_db);
    }
    return _db;
}

function initSchema(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      industry TEXT,
      industry_code TEXT,
      revenue_band TEXT,
      growth_stage TEXT,
      country TEXT DEFAULT 'SAU',
      company_size TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      language_preference TEXT DEFAULT 'en',
      theme_preference TEXT DEFAULT 'dark',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metrics_daily (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      date TEXT NOT NULL,
      cash_balance REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      receivables REAL DEFAULT 0,
      payables REAL DEFAULT 0,
      inventory REAL,
      debt REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, date)
    );

    CREATE TABLE IF NOT EXISTS normalized_metrics (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      date TEXT NOT NULL,
      runway_months REAL,
      burn_rate REAL,
      margin_pct REAL,
      liquidity_ratio REAL,
      collection_days REAL,
      stability_score REAL,
      trend TEXT,
      cost_volatility_index REAL,
      revenue_volatility_index REAL,
      concentration_ratio REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, date)
    );

    CREATE TABLE IF NOT EXISTS stability_scores (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
      calibration_profile TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, date)
    );

    CREATE TABLE IF NOT EXISTS projection_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      generated_date TEXT NOT NULL,
      projection_type TEXT NOT NULL,
      horizon_days INTEGER DEFAULT 90,
      runway_projection REAL,
      risk_horizon_date TEXT,
      confidence_score REAL,
      parameters TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT REFERENCES users(id),
      action_type TEXT NOT NULL,
      note TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS encrypted_credentials (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      provider TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      last_sync TEXT,
      sync_status TEXT DEFAULT 'never',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, provider)
    );

    CREATE TABLE IF NOT EXISTS benchmark_aggregates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      industry_code TEXT NOT NULL,
      revenue_band TEXT NOT NULL,
      period TEXT NOT NULL,
      sample_size INTEGER DEFAULT 0,
      score_p10 REAL DEFAULT 0,
      score_p25 REAL DEFAULT 0,
      score_p50 REAL DEFAULT 0,
      score_p75 REAL DEFAULT 0,
      score_p90 REAL DEFAULT 0,
      avg_runway_months REAL DEFAULT 0,
      avg_margin_pct REAL DEFAULT 0,
      avg_collection_days REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(industry_code, revenue_band, period)
    );

    CREATE TABLE IF NOT EXISTS engagement_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT REFERENCES users(id),
      event_type TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ---- Postgres-compatible query interface ----

type Row = Record<string, unknown>;

/**
 * A minimal tagged-template SQL interface that mimics postgres.js.
 * Supports: sql`SELECT * FROM t WHERE x = ${val}`
 * Returns an array of row objects.
 */
function createSql() {
    const handler = (strings: TemplateStringsArray, ...values: unknown[]): Row[] => {
        const db = getDb();
        let query = '';
        const params: unknown[] = [];

        for (let i = 0; i < strings.length; i++) {
            query += strings[i];
            if (i < values.length) {
                query += '?';
                params.push(values[i] === undefined ? null : values[i]);
            }
        }

        query = query.trim();

        // Determine if it's a read or write
        const isSelect = /^\s*(SELECT|PRAGMA|WITH)/i.test(query);

        try {
            if (isSelect) {
                const stmt = db.prepare(query);
                return stmt.all(...params) as Row[];
            } else {
                // For INSERT ... RETURNING
                if (/RETURNING/i.test(query)) {
                    const stmt = db.prepare(query);
                    const result = stmt.get(...params);
                    return result ? [result as Row] : [];
                }
                const stmt = db.prepare(query);
                stmt.run(...params);
                return [];
            }
        } catch (err) {
            // Handle UNIQUE constraint = ON CONFLICT
            if ((err as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return [];
            }
            throw err;
        }
    };

    // Add .unsafe() method for raw SQL strings
    handler.unsafe = (query: string): Row[] => {
        const db = getDb();
        query = query.trim();
        const isSelect = /^\s*(SELECT|PRAGMA|WITH)/i.test(query);
        try {
            if (isSelect) {
                return db.prepare(query).all() as Row[];
            } else if (/RETURNING/i.test(query)) {
                const result = db.prepare(query).get();
                return result ? [result as Row] : [];
            } else {
                db.exec(query);
                return [];
            }
        } catch {
            return [];
        }
    };

    // Add .begin() for transactions
    handler.begin = async <T>(callback: (tx: typeof handler) => Promise<T>): Promise<T> => {
        const db = getDb();
        return db.transaction(() => {
            // The tx object is the same handler — SQLite doesn't need SET LOCAL
            return callback(handler);
        })() as T;
    };

    return handler;
}

const sql = createSql();

export default sql;

/**
 * Execute within tenant context.
 * In SQLite mode, we don't use RLS — the API routes already filter by org_id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withTenant<T>(
    orgId: string,
    callback: (tx: any) => Promise<T>
): Promise<T> {
    void orgId; // SQLite doesn't use RLS
    return callback(sql);
}

/**
 * Execute without RLS (same behavior in SQLite mode).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withoutRLS<T>(
    callback: (tx: any) => Promise<T>
): Promise<T> {
    return callback(sql);
}
