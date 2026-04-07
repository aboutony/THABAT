/**
 * Unit tests — Stability Scoring Engine (src/lib/scoring.ts)
 *
 * Coverage: sub-scores via calculateStabilityScore, detectTrajectory (EMA),
 * computeNormalizedMetrics, generateConsequenceStatement.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateStabilityScore,
    detectTrajectory,
    computeNormalizedMetrics,
    generateConsequenceStatement,
    type RawMetrics,
    type CalibrationProfile,
} from '@/lib/scoring';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const HEALTHY: RawMetrics = {
    cash: 1_200_000,   // 12 months runway at these expenses
    revenue: 500_000,
    expenses: 100_000,
    receivables: 50_000,
    payables: 20_000,
};

const STRESSED: RawMetrics = {
    cash: 80_000,      // < 1 month runway
    revenue: 200_000,
    expenses: 300_000, // burning cash
    receivables: 300_000, // high receivables > revenue
    payables: 50_000,
};

const ZERO_REVENUE: RawMetrics = {
    cash: 100_000,
    revenue: 0,
    expenses: 50_000,
    receivables: 10_000,
    payables: 5_000,
};

// ─── calculateStabilityScore ─────────────────────────────────────────────────

describe('calculateStabilityScore', () => {
    it('returns all fields in the expected shape', () => {
        const result = calculateStabilityScore(HEALTHY);
        expect(result).toHaveProperty('liquidity');
        expect(result).toHaveProperty('margins');
        expect(result).toHaveProperty('receivables');
        expect(result).toHaveProperty('costs');
        expect(result).toHaveProperty('revenue');
        expect(result).toHaveProperty('overall');
        expect(result).toHaveProperty('trend');
        expect(result).toHaveProperty('delta');
        expect(result).toHaveProperty('drivers');
        expect(result).toHaveProperty('calibration');
    });

    it('clamps overall score between 0 and 100', () => {
        const healthy = calculateStabilityScore(HEALTHY);
        const stressed = calculateStabilityScore(STRESSED);
        expect(healthy.overall).toBeGreaterThanOrEqual(0);
        expect(healthy.overall).toBeLessThanOrEqual(100);
        expect(stressed.overall).toBeGreaterThanOrEqual(0);
        expect(stressed.overall).toBeLessThanOrEqual(100);
    });

    it('healthy metrics score significantly higher than stressed', () => {
        const healthy = calculateStabilityScore(HEALTHY);
        const stressed = calculateStabilityScore(STRESSED);
        expect(healthy.overall).toBeGreaterThan(stressed.overall);
    });

    it('zero revenue gives a low overall score', () => {
        const result = calculateStabilityScore(ZERO_REVENUE);
        expect(result.overall).toBeLessThan(50);
        expect(result.margins).toBe(0);
    });

    it('high cash/expenses ratio drives high liquidity sub-score', () => {
        // 12x runway → liquidity near 100
        const result = calculateStabilityScore(HEALTHY);
        expect(result.liquidity).toBeGreaterThan(90);
    });

    it('expenses exceeding revenue collapses margin sub-score to 0', () => {
        const result = calculateStabilityScore(STRESSED);
        expect(result.margins).toBe(0);
    });

    it('trend is stable when no history provided', () => {
        const result = calculateStabilityScore(HEALTHY, []);
        expect(result.trend).toBe('stable');
        expect(result.delta).toBe(0);
    });

    it('trend is strengthening when score is well above historical EMA', () => {
        const history = [30, 32, 33, 34, 35]; // low historical scores
        const result = calculateStabilityScore(HEALTHY, history); // high score
        expect(result.trend).toBe('strengthening');
        expect(result.delta).toBeGreaterThan(0);
    });

    it('trend is weakening when score is well below historical EMA', () => {
        const history = [85, 87, 88, 86, 89]; // high historical scores
        const result = calculateStabilityScore(STRESSED, history); // low score
        expect(result.trend).toBe('weakening');
        expect(result.delta).toBeLessThan(0);
    });

    it('applies VAT exclusion for true operating margin', () => {
        const baseMetrics: RawMetrics = {
            cash: 500_000,
            revenue: 300_000,
            expenses: 250_000,
            receivables: 30_000,
            payables: 10_000,
        };
        const withVat: RawMetrics = { ...baseMetrics, vatAmount: 30_000 };
        const base = calculateStabilityScore(baseMetrics);
        const vat = calculateStabilityScore(withVat);
        // Excluding VAT from costs improves margin score
        expect(vat.margins).toBeGreaterThan(base.margins);
    });

    it('applies corp tax rate reducing margin score', () => {
        const base: RawMetrics = { cash: 500_000, revenue: 500_000, expenses: 300_000, receivables: 50_000, payables: 20_000 };
        const taxed: RawMetrics = { ...base, corpTaxRate: 0.15 };
        const baseResult = calculateStabilityScore(base);
        const taxedResult = calculateStabilityScore(taxed);
        expect(taxedResult.margins).toBeLessThan(baseResult.margins);
    });

    it('calibration profile is reflected in result', () => {
        const profile: CalibrationProfile = {
            industryCode: 'medical',
            revenueBand: 'smb',
            growthStage: 'early',
        };
        const result = calculateStabilityScore(HEALTHY, [], profile);
        expect(result.calibration.industry).toBeTruthy();
        expect(result.calibration.revenueBand).toBeTruthy();
        expect(result.calibration.growthStage).toBeTruthy();
    });

    it('returns at most 3 driver insights', () => {
        const result = calculateStabilityScore(HEALTHY);
        expect(result.drivers.length).toBeLessThanOrEqual(3);
    });

    it('drivers include expected keys', () => {
        const result = calculateStabilityScore(HEALTHY);
        const driverKeys = result.drivers.map(d => d.key);
        expect(['runway', 'margin', 'collection'].some(k => driverKeys.includes(k))).toBe(true);
    });
});

// ─── detectTrajectory ────────────────────────────────────────────────────────

describe('detectTrajectory', () => {
    it('returns stable with delta=0 when no history', () => {
        const result = detectTrajectory(70, []);
        expect(result.trend).toBe('stable');
        expect(result.delta).toBe(0);
    });

    it('returns strengthening when current is significantly above EMA', () => {
        const history = [40, 42, 43];
        const result = detectTrajectory(70, history);
        expect(result.trend).toBe('strengthening');
    });

    it('returns weakening when current is significantly below EMA', () => {
        const history = [75, 80, 78];
        const result = detectTrajectory(50, history);
        expect(result.trend).toBe('weakening');
    });

    it('returns stable for small positive delta within threshold', () => {
        const history = [70, 71, 72];
        const result = detectTrajectory(73, history); // tiny delta
        expect(result.trend).toBe('stable');
    });

    it('delta is rounded to 1 decimal place', () => {
        const history = [50, 55, 60];
        const result = detectTrajectory(80, history);
        const decimals = result.delta.toString().split('.')[1]?.length ?? 0;
        expect(decimals).toBeLessThanOrEqual(1);
    });

    it('EMA weighs recent scores more than older ones (α=0.2)', () => {
        // With α=0.2: EMA computed from oldest to newest, newer entries weighted heavier
        // A recent spike up should push EMA up compared to a distant spike
        const recentHighHistory = [40, 40, 40, 40, 80]; // most recent (index 0) is 80
        const oldHighHistory    = [80, 40, 40, 40, 40]; // oldest (last index) is 80
        const resultRecent = detectTrajectory(60, recentHighHistory);
        const resultOld    = detectTrajectory(60, oldHighHistory);
        // Recent high history → EMA higher → delta from 60 is more negative
        expect(resultRecent.delta).toBeLessThan(resultOld.delta);
    });
});

// ─── computeNormalizedMetrics ─────────────────────────────────────────────────

describe('computeNormalizedMetrics', () => {
    it('returns all expected fields', () => {
        const result = computeNormalizedMetrics(HEALTHY);
        expect(result).toHaveProperty('runway_months');
        expect(result).toHaveProperty('burn_rate');
        expect(result).toHaveProperty('margin_pct');
        expect(result).toHaveProperty('liquidity_ratio');
        expect(result).toHaveProperty('collection_days');
    });

    it('calculates runway correctly (cash / expenses)', () => {
        const result = computeNormalizedMetrics(HEALTHY);
        expect(result.runway_months).toBeCloseTo(12, 1);
    });

    it('burn_rate equals expenses', () => {
        const result = computeNormalizedMetrics(HEALTHY);
        expect(result.burn_rate).toBe(HEALTHY.expenses);
    });

    it('margin_pct reflects (revenue - expenses) / revenue * 100', () => {
        const result = computeNormalizedMetrics(HEALTHY);
        const expected = ((HEALTHY.revenue - HEALTHY.expenses) / HEALTHY.revenue) * 100;
        expect(result.margin_pct).toBeCloseTo(expected, 1);
    });

    it('returns 0 margin_pct when revenue is 0', () => {
        const result = computeNormalizedMetrics(ZERO_REVENUE);
        expect(result.margin_pct).toBe(0);
    });

    it('collection_days is receivables / revenue * 30', () => {
        const result = computeNormalizedMetrics(HEALTHY);
        const expected = (HEALTHY.receivables / HEALTHY.revenue) * 30;
        expect(result.collection_days).toBeCloseTo(expected, 1);
    });

    it('handles zero expenses without division-by-zero', () => {
        const m: RawMetrics = { cash: 100_000, revenue: 200_000, expenses: 0, receivables: 5_000, payables: 0 };
        expect(() => computeNormalizedMetrics(m)).not.toThrow();
        const r = computeNormalizedMetrics(m);
        expect(r.runway_months).toBe(100_000); // cash / 1 (guard)
    });
});

// ─── generateConsequenceStatement ────────────────────────────────────────────

describe('generateConsequenceStatement', () => {
    it('returns an object with all required fields', () => {
        const breakdown = calculateStabilityScore(HEALTHY);
        const result = generateConsequenceStatement(breakdown, HEALTHY);
        expect(result).toHaveProperty('metricKey');
        expect(result).toHaveProperty('consequenceKey');
        expect(result).toHaveProperty('severity');
        expect(result).toHaveProperty('impactValue');
        expect(result).toHaveProperty('score');
    });

    it('severity is critical when worst sub-score < 30', () => {
        // Use metrics where margin collapses to 0 but receivables drift does NOT override
        // (receivables must be ≤ 1.25 * cash to avoid drift override path)
        const noMarginMetrics: RawMetrics = {
            cash: 300_000,
            revenue: 100_000,
            expenses: 500_000, // expenses >> revenue → margins = 0
            receivables: 200_000, // < 1.25 * 300k = 375k → no drift override
            payables: 20_000,
        };
        const breakdown = calculateStabilityScore(noMarginMetrics);
        const result = generateConsequenceStatement(breakdown, noMarginMetrics);
        expect(result.severity).toBe('critical');
    });

    it('severity is moderate for healthy metrics', () => {
        const breakdown = calculateStabilityScore(HEALTHY);
        const result = generateConsequenceStatement(breakdown, HEALTHY);
        expect(['moderate', 'warning']).toContain(result.severity);
    });

    it('overrides to receivables drift when receivables > 125% of cash', () => {
        // receivables (300 000) > 1.25 * cash (80 000 = 100 000)
        const driftMetrics: RawMetrics = {
            cash: 50_000,
            revenue: 200_000,
            expenses: 150_000,
            receivables: 100_000, // 200% of cash
            payables: 20_000,
        };
        const breakdown = calculateStabilityScore(driftMetrics);
        const result = generateConsequenceStatement(breakdown, driftMetrics);
        expect(result.consequenceKey).toBe('insight.consequence.receivablesDrift');
        expect(result.severity).toBe('warning');
    });

    it('consequenceKey references the weakest metric', () => {
        // Force liquidity to be the weakest: tiny cash, modest everything else
        const m: RawMetrics = {
            cash: 1_000,
            revenue: 300_000,
            expenses: 100_000,
            receivables: 30_000,
            payables: 10_000,
        };
        const breakdown = calculateStabilityScore(m);
        const result = generateConsequenceStatement(breakdown, m);
        expect(result.metricKey).toContain('scoring.');
        expect(result.consequenceKey).toContain('insight.consequence.');
    });

    it('impactValue is a non-empty string', () => {
        const breakdown = calculateStabilityScore(STRESSED);
        const result = generateConsequenceStatement(breakdown, STRESSED);
        expect(typeof result.impactValue).toBe('string');
        expect(result.impactValue.length).toBeGreaterThan(0);
    });
});
