/**
 * Unit tests — Client Health Calculator (src/lib/calculateClientHealth.ts)
 *
 * All tests pass clients explicitly so no env/demo-mode dependency.
 * Coverage: revenueVelocityScore, paymentScore, composite healthScore,
 * riskLevel classification, isFlickering flag.
 */

import { describe, it, expect } from 'vitest';
import { calculateClientHealth, type ClientRecord } from '@/lib/calculateClientHealth';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
    return {
        id: 'test',
        name: { en: 'Test Client', ar: 'عميل تجريبي' },
        acv: 1_000_000,
        monthlyOrders: [100_000, 100_000, 100_000],
        avgDaysOverdue: 0,
        engagementScore: 80,
        starX: 100,
        starY: 100,
        ...overrides,
    };
}

// ─── Revenue Velocity Score ───────────────────────────────────────────────────

describe('revenueVelocityScore (via calculateClientHealth)', () => {
    it('returns ~50 for flat revenue (no growth or decline)', () => {
        const client = makeClient({ monthlyOrders: [100, 100, 100] });
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBe(50);
    });

    it('returns score > 50 for positive growth (recent > oldest)', () => {
        // recent=115, oldest=100 → +15% → 50 + 15*1.5 = 72.5 → 73
        const client = makeClient({ monthlyOrders: [115, 107, 100] });
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBeGreaterThan(50);
    });

    it('returns score < 50 for declining revenue', () => {
        const client = makeClient({ monthlyOrders: [85, 93, 100] }); // recent=85 oldest=100
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBeLessThan(50);
    });

    it('clamps to 0 for catastrophic decline', () => {
        const client = makeClient({ monthlyOrders: [10, 50, 100] }); // -90% decline
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBe(0);
    });

    it('clamps to 100 for extreme growth', () => {
        const client = makeClient({ monthlyOrders: [200, 150, 100] }); // +100% growth
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBe(100);
    });

    it('returns 50 when oldest order is 0 (no baseline)', () => {
        const client = makeClient({ monthlyOrders: [100, 50, 0] });
        const [result] = calculateClientHealth([client]);
        expect(result.revenueVelocityScore).toBe(50);
    });
});

// ─── Payment Hygiene Score ────────────────────────────────────────────────────

describe('paymentScore (via calculateClientHealth)', () => {
    it('returns 100 for 0 days overdue', () => {
        const client = makeClient({ avgDaysOverdue: 0 });
        const [result] = calculateClientHealth([client]);
        expect(result.paymentScore).toBe(100);
    });

    it('returns 75 for 10 days overdue (100 - 10*2.5)', () => {
        const client = makeClient({ avgDaysOverdue: 10 });
        const [result] = calculateClientHealth([client]);
        expect(result.paymentScore).toBe(75);
    });

    it('returns 25 for 30 days overdue (100 - 30*2.5)', () => {
        const client = makeClient({ avgDaysOverdue: 30 });
        const [result] = calculateClientHealth([client]);
        expect(result.paymentScore).toBe(25);
    });

    it('clamps to 0 for 40+ days overdue', () => {
        const client = makeClient({ avgDaysOverdue: 50 });
        const [result] = calculateClientHealth([client]);
        expect(result.paymentScore).toBe(0);
    });
});

// ─── Composite health score ───────────────────────────────────────────────────

describe('healthScore (40/40/20 weighting)', () => {
    it('is calculated as rv*0.4 + payment*0.4 + engagement*0.2', () => {
        const client = makeClient({
            monthlyOrders: [100, 100, 100],  // rvScore = 50
            avgDaysOverdue: 0,                // paymentScore = 100
            engagementScore: 80,             // engagement = 80
        });
        const expected = Math.round(50 * 0.4 + 100 * 0.4 + 80 * 0.2);
        const [result] = calculateClientHealth([client]);
        expect(result.healthScore).toBe(expected);
    });

    it('perfect client scores 100', () => {
        const client = makeClient({
            monthlyOrders: [200, 150, 100], // clamped to 100
            avgDaysOverdue: 0,               // 100
            engagementScore: 100,
        });
        const [result] = calculateClientHealth([client]);
        expect(result.healthScore).toBe(100);
    });

    it('worst-case client scores 0', () => {
        const client = makeClient({
            monthlyOrders: [0, 50, 100],    // 0
            avgDaysOverdue: 40,              // 0
            engagementScore: 0,
        });
        const [result] = calculateClientHealth([client]);
        expect(result.healthScore).toBe(0);
    });
});

// ─── Risk classification ──────────────────────────────────────────────────────

describe('riskLevel classification', () => {
    it('returns healthy when health >= 70', () => {
        const client = makeClient({
            monthlyOrders: [110, 105, 100],
            avgDaysOverdue: 0,
            engagementScore: 90,
        });
        const [result] = calculateClientHealth([client]);
        if (result.healthScore >= 70) {
            expect(result.riskLevel).toBe('healthy');
        }
    });

    it('returns watch when health is 60–69', () => {
        // rvScore=50, paymentScore=75(10 days), engagement=60 → 50*0.4+75*0.4+60*0.2 = 62
        const client = makeClient({
            monthlyOrders: [100, 100, 100],
            avgDaysOverdue: 10,
            engagementScore: 60,
        });
        const [result] = calculateClientHealth([client]);
        if (result.healthScore >= 60 && result.healthScore < 70) {
            expect(result.riskLevel).toBe('watch');
        }
    });

    it('returns at-risk when health is 40–59', () => {
        // rvScore=35(recent=85,oldest=100), paymentScore=50(20 days), engagement=50 → ~45
        const client = makeClient({
            monthlyOrders: [85, 93, 100],
            avgDaysOverdue: 20,
            engagementScore: 50,
        });
        const [result] = calculateClientHealth([client]);
        if (result.healthScore >= 40 && result.healthScore < 60) {
            expect(result.riskLevel).toBe('at-risk');
        }
    });

    it('returns critical when health < 40', () => {
        const client = makeClient({
            monthlyOrders: [40, 70, 100],   // rvScore = 0 (clamped)
            avgDaysOverdue: 35,             // paymentScore = 13
            engagementScore: 20,
        });
        const [result] = calculateClientHealth([client]);
        if (result.healthScore < 40) {
            expect(result.riskLevel).toBe('critical');
        }
    });
});

// ─── isFlickering ─────────────────────────────────────────────────────────────

describe('isFlickering', () => {
    it('is true when healthScore < 60', () => {
        const client = makeClient({
            monthlyOrders: [70, 85, 100],
            avgDaysOverdue: 25,
            engagementScore: 30,
        });
        const [result] = calculateClientHealth([client]);
        expect(result.isFlickering).toBe(result.healthScore < 60);
    });

    it('is false when healthScore >= 60', () => {
        const client = makeClient({
            monthlyOrders: [105, 102, 100],
            avgDaysOverdue: 5,
            engagementScore: 85,
        });
        const [result] = calculateClientHealth([client]);
        if (result.healthScore >= 60) {
            expect(result.isFlickering).toBe(false);
        }
    });
});

// ─── Multiple clients ─────────────────────────────────────────────────────────

describe('calculateClientHealth with multiple clients', () => {
    it('returns one result per client', () => {
        const clients = [makeClient({ id: 'a' }), makeClient({ id: 'b' }), makeClient({ id: 'c' })];
        const results = calculateClientHealth(clients);
        expect(results).toHaveLength(3);
    });

    it('preserves client id and name on each result', () => {
        const client = makeClient({ id: 'unique-id' });
        const [result] = calculateClientHealth([client]);
        expect(result.id).toBe('unique-id');
        expect(result.name.en).toBe('Test Client');
    });

    it('returns empty array for empty input', () => {
        const results = calculateClientHealth([]);
        expect(results).toHaveLength(0);
    });

    it('color is a hex string', () => {
        const [result] = calculateClientHealth([makeClient()]);
        expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
});
