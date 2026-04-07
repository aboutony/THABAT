/**
 * API Route Tests — Metrics ingestion and retrieval (/api/metrics)
 *
 * Tests verify:
 *   - Authentication enforcement (401 without session)
 *   - Zod schema validation (invalid body → 422)
 *   - Rate limiting enforcement (429 when limit exceeded)
 *   - Successful POST ingestion response shape
 *   - Successful GET retrieval response shape
 *
 * Note: Zod validation failures return 422 (parseBody uses status: 422).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
    default: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({
    rateLimitMetrics: vi.fn().mockReturnValue({ success: true, remaining: 59, resetAt: Date.now() + 3600000 }),
    rateLimitResponse: vi.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '900' },
        })
    ),
}));

import sql from '@/db';
import { getSession } from '@/lib/auth';
import { rateLimitMetrics, rateLimitResponse } from '@/lib/rateLimit';

// Import route once — avoid resetModules which breaks mock references
import { POST, GET } from '@/app/api/metrics/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const VALID_SESSION = { userId: 'user-1', orgId: 'org-1', role: 'client' };

const VALID_METRICS_BODY = {
    date: '2025-06-15',
    cash: 500_000,
    revenue: 200_000,
    expenses: 120_000,
    receivables: 40_000,
    payables: 15_000,
};

function mockSqlChain(results: unknown[][]) {
    let call = 0;
    (sql as unknown as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve(results[Math.min(call++, results.length - 1)])
    );
}

// ─── POST /api/metrics ────────────────────────────────────────────────────────

describe('POST /api/metrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_SESSION);
        (rateLimitMetrics as ReturnType<typeof vi.fn>).mockReturnValue({ success: true, remaining: 59, resetAt: Date.now() });
    });

    it('returns 401 when no session', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const req = makeRequest(VALID_METRICS_BODY);
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 422 when date is missing', async () => {
        const { date: _date, ...noDate } = VALID_METRICS_BODY;
        const req = makeRequest(noDate);
        const res = await POST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 when date format is invalid', async () => {
        const req = makeRequest({ ...VALID_METRICS_BODY, date: '15-06-2025' }); // wrong format
        const res = await POST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 when a numeric field is negative', async () => {
        const req = makeRequest({ ...VALID_METRICS_BODY, cash: -1 });
        const res = await POST(req);
        expect(res.status).toBe(422);
    });

    it('returns 422 when a required numeric field is missing', async () => {
        const { cash: _cash, ...noCash } = VALID_METRICS_BODY;
        const req = makeRequest(noCash);
        const res = await POST(req);
        expect(res.status).toBe(422);
    });

    it('returns 429 when rate limit is exceeded', async () => {
        (rateLimitMetrics as ReturnType<typeof vi.fn>).mockReturnValue({
            success: false, remaining: 0, resetAt: Date.now() + 3600000,
        });
        const req = makeRequest(VALID_METRICS_BODY);
        const res = await POST(req);
        expect(res.status).toBe(429);
        expect(rateLimitResponse).toHaveBeenCalled();
    });

    it('returns 200 with score breakdown on valid input', async () => {
        mockSqlChain([
            // org profile
            [{ industry: 'medical', industry_code: 'medical', revenue_band: 'smb', growth_stage: 'growth', receivables_warning_days: 45, corp_tax_rate: 0, vat_rate: 0.15 }],
            // DELETE metrics_daily
            [],
            // INSERT metrics_daily
            [],
            // SELECT historical scores
            [],
            // DELETE normalized_metrics
            [],
            // INSERT normalized_metrics
            [],
            // DELETE stability_scores
            [],
            // INSERT stability_scores
            [],
            // INSERT action_logs
            [],
        ]);

        const req = makeRequest(VALID_METRICS_BODY);
        const res = await POST(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('score');
        expect(body.score).toHaveProperty('overall');
        expect(body.score).toHaveProperty('trend');
        expect(typeof body.score.overall).toBe('number');
    });
});

// ─── GET /api/metrics ────────────────────────────────────────────────────────

describe('GET /api/metrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no session', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it('returns 200 with latestMetrics, latestScore, history', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_SESSION);

        const latestMetric = [{
            org_id: 'org-1', date: '2025-06-15', cash_balance: 500000,
            revenue: 200000, expenses: 120000, receivables: 40000, payables: 15000,
        }];
        const latestScore = [{
            org_id: 'org-1', date: '2025-06-15', total_score: 72,
            trajectory_direction: 'stable', score_delta: 0,
        }];
        const history = [
            { date: '2025-06-15', stability_score: 72, trend: 'stable', score_delta: 0 },
            { date: '2025-06-14', stability_score: 70, trend: 'stable', score_delta: -2 },
        ];

        mockSqlChain([latestMetric, latestScore, history]);

        const res = await GET();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('latestMetrics');
        expect(body).toHaveProperty('latestScore');
        expect(body).toHaveProperty('history');
        expect(Array.isArray(body.history)).toBe(true);
        expect(body.latestScore.total_score).toBe(72);
    });

    it('returns null for latestMetrics and latestScore when no data exists', async () => {
        (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_SESSION);
        mockSqlChain([[], [], []]);

        const res = await GET();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.latestMetrics).toBeNull();
        expect(body.latestScore).toBeNull();
        expect(body.history).toHaveLength(0);
    });
});
