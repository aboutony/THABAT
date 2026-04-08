/**
 * Unit tests — Scenario Impact Projector (src/lib/projectScenarioImpact.ts)
 *
 * The function depends on entityDemoContent and entityDatasets for baseline data.
 * We mock those modules so tests are isolated from demo-data details.
 * The logic under test: margin calculation, Nitaqat simulation, stock risk ripple.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock entity modules before importing the module under test ───────────────

vi.mock('@/lib/entityDemoContent', () => ({
    getEntityScenarioBaseline: vi.fn(),
    warnProd: vi.fn(),
}));

vi.mock('@/lib/entityDatasets', () => ({
    getEntityStockGapData: vi.fn(),
}));

import { getEntityScenarioBaseline } from '@/lib/entityDemoContent';
import { getEntityStockGapData } from '@/lib/entityDatasets';
import { projectScenarioImpact } from '@/lib/projectScenarioImpact';
import type { ScenarioLevers } from '@/lib/projectScenarioImpact';

// ─── Baseline fixtures ────────────────────────────────────────────────────────

const BASELINE_WORKFORCE = {
    totalEmployees: 100,
    // 30 Saudis → 30% Saudization, which is above medGreen threshold at n=100 (~27.95%)
    saudiRegular: 30,
    saudiLowSalary: 0,
    saudiStudents: 0,
    saudiSpecialNeeds: 0,
};

function mockBaseline(overrides = {}) {
    (getEntityScenarioBaseline as ReturnType<typeof vi.fn>).mockReturnValue({
        revenue: 1_000_000,
        expenses: 800_000,
        materialFraction: 0.4,       // 40% of expenses are material costs
        workforce: BASELINE_WORKFORCE,
        tier: 'medGreen',
        ...overrides,
    });
}

function mockStockGap(overrides = {}) {
    (getEntityStockGapData as ReturnType<typeof vi.fn>).mockReturnValue({
        input: {
            stockDays: 4,
            avgLeadTimeDays: 14.8,
            dailySalesVelocity: 12,
            onHandUnits: 48,
        },
        nextShipmentDays: 9,
        ...overrides,
    });
}

beforeEach(() => {
    mockBaseline();
    mockStockGap();
});

// ─── Output shape ─────────────────────────────────────────────────────────────

describe('projectScenarioImpact output shape', () => {
    it('returns all required fields', () => {
        const levers: ScenarioLevers = { salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 };
        const result = projectScenarioImpact(levers);
        expect(result).toHaveProperty('currentMarginPct');
        expect(result).toHaveProperty('projectedMarginPct');
        expect(result).toHaveProperty('marginDelta');
        expect(result).toHaveProperty('projectedRevenue');
        expect(result).toHaveProperty('currentTier');
        expect(result).toHaveProperty('projectedTier');
        expect(result).toHaveProperty('tierDropped');
        expect(result).toHaveProperty('currentStockDays');
        expect(result).toHaveProperty('currentStockRisk');
        expect(result).toHaveProperty('projectedStockDays');
        expect(result).toHaveProperty('projectedStockRisk');
        expect(result).toHaveProperty('estimatedAnnualImpact');
    });

    it('zero levers: projected values equal current values', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.marginDelta).toBe(0);
        expect(result.tierDropped).toBe(false);
        expect(result.projectedRevenue).toBe(1_000_000);
    });
});

// ─── Margin lever ─────────────────────────────────────────────────────────────

describe('salesGrowthPct lever', () => {
    it('positive sales growth increases projected revenue', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 20, expatsHired: 0, materialCostDelta: 0 });
        expect(result.projectedRevenue).toBe(1_200_000);
    });

    it('positive sales growth improves margin (same material cost)', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 20, expatsHired: 0, materialCostDelta: 0 });
        expect(result.projectedMarginPct).toBeGreaterThan(result.currentMarginPct);
        expect(result.marginDelta).toBeGreaterThan(0);
    });

    it('negative sales growth (decline) reduces margin', () => {
        const result = projectScenarioImpact({ salesGrowthPct: -20, expatsHired: 0, materialCostDelta: 0 });
        expect(result.projectedMarginPct).toBeLessThan(result.currentMarginPct);
        expect(result.marginDelta).toBeLessThan(0);
    });

    it('currentMarginPct = (revenue - expenses) / revenue * 100', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.currentMarginPct).toBeCloseTo(((1_000_000 - 800_000) / 1_000_000) * 100, 1);
    });
});

// ─── Material cost lever ──────────────────────────────────────────────────────

describe('materialCostDelta lever', () => {
    it('higher material cost reduces projected margin', () => {
        const base = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        const higher = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 20 });
        expect(higher.projectedMarginPct).toBeLessThan(base.projectedMarginPct);
    });

    it('lower material cost improves projected margin', () => {
        const base = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        const lower = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: -10 });
        expect(lower.projectedMarginPct).toBeGreaterThan(base.projectedMarginPct);
    });
});

// ─── Expat lever (Nitaqat simulation) ────────────────────────────────────────

describe('expatsHired lever', () => {
    it('adding many expats causes tier to drop', () => {
        // 100 employees → 25 Saudi regular = 25% Saudization (medGreen boundary depends on n)
        // Adding 400 expats → 25/500 = 5% → definitely red
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 400, materialCostDelta: 0 });
        expect(result.tierDropped).toBe(true);
        expect(result.projectedTier).toBe('red');
    });

    it('adding 0 expats does not drop tier', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.tierDropped).toBe(false);
        expect(result.currentTier).toBe(result.projectedTier);
    });

    it('currentTier matches baseline tier', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.currentTier).toBe('medGreen');
    });
});

// ─── Stock risk lever ─────────────────────────────────────────────────────────

describe('stock risk (sales velocity ripple)', () => {
    it('current stock is at risk in demo scenario (stockDays 4 < leadTime 14.8)', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.currentStockRisk).toBe(true);
    });

    it('sales growth increases velocity, which worsens stock risk', () => {
        const base = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        const grown = projectScenarioImpact({ salesGrowthPct: 50, expatsHired: 0, materialCostDelta: 0 });
        // Higher velocity → fewer stock days for same on-hand units
        expect(grown.projectedStockDays).toBeLessThan(base.projectedStockDays);
    });

    it('sales decline reduces velocity, which improves stock days', () => {
        const base = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        const declined = projectScenarioImpact({ salesGrowthPct: -80, expatsHired: 0, materialCostDelta: 0 });
        expect(declined.projectedStockDays).toBeGreaterThan(base.projectedStockDays);
    });
});

// ─── Annual impact calculation ────────────────────────────────────────────────

describe('estimatedAnnualImpact', () => {
    it('is 0 when marginDelta is 0', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 0, expatsHired: 0, materialCostDelta: 0 });
        expect(result.estimatedAnnualImpact).toBe(0);
    });

    it('is positive when margin improves', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 30, expatsHired: 0, materialCostDelta: -10 });
        expect(result.estimatedAnnualImpact).toBeGreaterThan(0);
    });

    it('is negative when margin worsens', () => {
        const result = projectScenarioImpact({ salesGrowthPct: -20, expatsHired: 0, materialCostDelta: 30 });
        expect(result.estimatedAnnualImpact).toBeLessThan(0);
    });

    it('is rounded to an integer (no decimals)', () => {
        const result = projectScenarioImpact({ salesGrowthPct: 10, expatsHired: 0, materialCostDelta: 0 });
        expect(Number.isInteger(result.estimatedAnnualImpact)).toBe(true);
    });
});
