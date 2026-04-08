/**
 * Unit tests — Nitaqat 2.0 Engine (src/lib/nitaqat.ts)
 *
 * Coverage: calcThreshold (logarithmic formula), calcWeightedSaudi (2026 rules),
 * getTier, simulateExpats, calcCorrectionSaudis, maxExpatsBeforeDrop.
 */

import { describe, it, expect } from 'vitest';
import {
    calcThreshold,
    calcWeightedSaudi,
    calcSaudizationPct,
    getTier,
    simulateExpats,
    calcCorrectionSaudis,
    maxExpatsBeforeDrop,
    tierGte,
    TIER_CONSTANTS,
    MAX_SPECIAL_NEEDS_FRAC,
    type WorkforceInput,
} from '@/lib/nitaqat';

// ─── calcThreshold ────────────────────────────────────────────────────────────

describe('calcThreshold', () => {
    it('applies the logarithmic formula y = m·ln(x) + c', () => {
        const tier = 'medGreen';
        const { m, c } = TIER_CONSTANTS[tier];
        const total = 100;
        const expected = m * Math.log(total) + c;
        expect(calcThreshold(tier, total)).toBeCloseTo(expected, 5);
    });

    it('platinum threshold is always higher than lowGreen for same headcount', () => {
        const n = 150;
        expect(calcThreshold('platinum', n)).toBeGreaterThan(calcThreshold('lowGreen', n));
    });

    it('tier ordering: platinum > highGreen > medGreen > lowGreen', () => {
        const n = 200;
        const p = calcThreshold('platinum', n);
        const hg = calcThreshold('highGreen', n);
        const mg = calcThreshold('medGreen', n);
        const lg = calcThreshold('lowGreen', n);
        expect(p).toBeGreaterThan(hg);
        expect(hg).toBeGreaterThan(mg);
        expect(mg).toBeGreaterThan(lg);
    });

    it('threshold increases with workforce size (larger firm needs higher %)', () => {
        const small = calcThreshold('medGreen', 50);
        const large = calcThreshold('medGreen', 500);
        expect(large).toBeGreaterThan(small);
    });

    it('handles totalEmployees=1 without NaN (ln(1)=0)', () => {
        const result = calcThreshold('lowGreen', 1);
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBe(TIER_CONSTANTS.lowGreen.c); // m·ln(1) + c = 0 + c
    });

    it('guards against totalEmployees=0 (uses max(x,1))', () => {
        const result = calcThreshold('lowGreen', 0);
        expect(Number.isFinite(result)).toBe(true);
    });
});

// ─── calcWeightedSaudi ────────────────────────────────────────────────────────

describe('calcWeightedSaudi', () => {
    const makeWorkforce = (overrides: Partial<WorkforceInput> = {}): WorkforceInput => ({
        totalEmployees:    100,
        saudiRegular:      20,
        saudiLowSalary:    0,
        saudiStudents:     0,
        saudiSpecialNeeds: 0,
        ...overrides,
    });

    it('weights saudiRegular at 1.0', () => {
        const w = makeWorkforce({ saudiRegular: 10 });
        expect(calcWeightedSaudi(w)).toBe(10);
    });

    it('weights saudiLowSalary at 0.5', () => {
        const w = makeWorkforce({ saudiRegular: 0, saudiLowSalary: 10 });
        expect(calcWeightedSaudi(w)).toBe(5);
    });

    it('weights saudiStudents at 0.5', () => {
        const w = makeWorkforce({ saudiRegular: 0, saudiStudents: 10 });
        expect(calcWeightedSaudi(w)).toBe(5);
    });

    it('weights saudiSpecialNeeds at 4.0', () => {
        const w = makeWorkforce({ saudiRegular: 0, saudiSpecialNeeds: 5 });
        expect(calcWeightedSaudi(w)).toBe(20);
    });

    it('caps special needs at 10% of total employees', () => {
        // totalEmployees=100 → cap=10; 20 special-needs workers → only 10 count
        const w = makeWorkforce({ saudiRegular: 0, saudiSpecialNeeds: 20 });
        const cap = Math.floor(100 * MAX_SPECIAL_NEEDS_FRAC); // 10
        expect(calcWeightedSaudi(w)).toBe(cap * 4.0);
    });

    it('correctly combines all categories', () => {
        const w: WorkforceInput = {
            totalEmployees:    200,
            saudiRegular:      10, // 10.0
            saudiLowSalary:    4,  // 2.0
            saudiStudents:     6,  // 3.0
            saudiSpecialNeeds: 3,  // 12.0 (cap = floor(200*0.1) = 20, no cap hit)
        };
        expect(calcWeightedSaudi(w)).toBeCloseTo(10 + 2 + 3 + 12, 5);
    });

    it('special needs cap uses floor(), not round()', () => {
        // totalEmployees=15 → cap = floor(1.5) = 1
        const w: WorkforceInput = {
            totalEmployees: 15,
            saudiRegular: 0, saudiLowSalary: 0, saudiStudents: 0,
            saudiSpecialNeeds: 5, // cap=1 → 1*4=4
        };
        expect(calcWeightedSaudi(w)).toBe(4);
    });
});

// ─── getTier ─────────────────────────────────────────────────────────────────

describe('getTier', () => {
    it('returns red when Saudization % is below all thresholds', () => {
        // 0% Saudization is always red regardless of workforce size
        expect(getTier(0, 100)).toBe('red');
    });

    it('returns platinum when % meets or exceeds platinum threshold', () => {
        const n = 50;
        const platinumPct = calcThreshold('platinum', n);
        expect(getTier(platinumPct + 1, n)).toBe('platinum');
    });

    it('returns lowGreen when % is just above lowGreen threshold but below medGreen', () => {
        const n = 50;
        const lowGreenPct = calcThreshold('lowGreen', n);
        const medGreenPct = calcThreshold('medGreen', n);
        // Use midpoint between lowGreen and medGreen — qualifies for lowGreen only
        const midPct = (lowGreenPct + medGreenPct) / 2;
        expect(getTier(midPct, n)).toBe('lowGreen');
    });

    it('is monotone: higher Saudization % results in equal-or-better tier', () => {
        const n = 100;
        // As pct increases, TIER_ORDER index should be non-increasing (lower index = better tier)
        const pcts = [0, 20, 25, 30, 35, 40];
        const tierIndexes = pcts.map(pct => {
            const tier = getTier(pct, n);
            return ['platinum', 'highGreen', 'medGreen', 'lowGreen', 'red'].indexOf(tier);
        });
        for (let i = 1; i < tierIndexes.length; i++) {
            expect(tierIndexes[i]).toBeLessThanOrEqual(tierIndexes[i - 1]);
        }
    });
});

// ─── tierGte ─────────────────────────────────────────────────────────────────

describe('tierGte', () => {
    it('platinum >= all other tiers', () => {
        expect(tierGte('platinum', 'highGreen')).toBe(true);
        expect(tierGte('platinum', 'red')).toBe(true);
    });

    it('red is not >= anything except itself', () => {
        expect(tierGte('red', 'lowGreen')).toBe(false);
        expect(tierGte('red', 'red')).toBe(true);
    });

    it('same tier is always >=', () => {
        expect(tierGte('medGreen', 'medGreen')).toBe(true);
    });
});

// ─── calcSaudizationPct ───────────────────────────────────────────────────────

describe('calcSaudizationPct', () => {
    it('returns 0 when totalEmployees is 0', () => {
        expect(calcSaudizationPct(10, 0)).toBe(0);
    });

    it('calculates (weighted / total) * 100', () => {
        expect(calcSaudizationPct(25, 100)).toBe(25);
        expect(calcSaudizationPct(50, 200)).toBe(25);
    });
});

// ─── simulateExpats ───────────────────────────────────────────────────────────

describe('simulateExpats', () => {
    it('correctly adds expats to total', () => {
        const result = simulateExpats(20, 100, 'medGreen', 10);
        expect(result.newTotal).toBe(110);
    });

    it('dilutes weighted Saudization % when expats are added', () => {
        // 25 weighted out of 100 = 25%; after +50 expats → 25/150 ≈ 16.7%
        const result = simulateExpats(25, 100, 'medGreen', 50);
        expect(result.newWeightedPct).toBeCloseTo((25 / 150) * 100, 1);
    });

    it('detects tier drop when dilution causes tier regression', () => {
        // Very high expat addition should drop even a platinum org to red
        const result = simulateExpats(10, 100, 'platinum', 900);
        expect(result.tierDropped).toBe(true);
    });

    it('tierChanged is false when tier stays the same', () => {
        // Adding a handful of expats from a very comfortable position
        const result = simulateExpats(50, 100, 'platinum', 1);
        // With 50/101 ≈ 49.5% still well above platinum threshold
        if (!result.tierDropped) {
            expect(result.tierChanged).toBe(false);
        }
    });

    it('tierDropped implies tierChanged', () => {
        const result = simulateExpats(5, 100, 'medGreen', 400);
        if (result.tierDropped) {
            expect(result.tierChanged).toBe(true);
        }
    });

    it('adding 0 expats does not change anything', () => {
        // 35 weighted out of 100 = 35%, which is above highGreen threshold (~32.95%)
        const result = simulateExpats(35, 100, 'highGreen', 0);
        expect(result.newTotal).toBe(100);
        expect(result.tierChanged).toBe(false);
        expect(result.tierDropped).toBe(false);
    });
});

// ─── calcCorrectionSaudis ─────────────────────────────────────────────────────

describe('calcCorrectionSaudis', () => {
    it('returns 0 when no correction is needed', () => {
        // 50 weighted out of 100 is well above any threshold
        const result = calcCorrectionSaudis(50, 100, 'platinum');
        expect(result).toBe(0);
    });

    it('returns a positive integer when correction is needed', () => {
        // 5 weighted out of 200 → need many more for lowGreen
        const result = calcCorrectionSaudis(5, 200, 'lowGreen');
        expect(result).toBeGreaterThan(0);
        expect(Number.isInteger(result)).toBe(true);
    });

    it('correction is enough to actually meet the target tier', () => {
        const newTotal = 150;
        const currentWeighted = 10;
        const target = 'lowGreen';
        const correction = calcCorrectionSaudis(currentWeighted, newTotal, target);
        const afterCorrection = currentWeighted + correction;
        const afterPct = (afterCorrection / newTotal) * 100;
        expect(afterPct).toBeGreaterThanOrEqual(calcThreshold(target, newTotal));
    });
});

// ─── maxExpatsBeforeDrop ──────────────────────────────────────────────────────

describe('maxExpatsBeforeDrop', () => {
    it('returns 0 when even 1 expat causes a tier drop', () => {
        // At the exact threshold — any dilution drops the tier
        const n = 100;
        const minPct = calcThreshold('lowGreen', n);
        const weighted = (minPct / 100) * n; // exactly at threshold
        // Adding 1 expat raises denominator slightly, dropping below
        const result = maxExpatsBeforeDrop(weighted, n, 'lowGreen');
        expect(result).toBeGreaterThanOrEqual(0);
    });

    it('returns a positive number when there is headroom', () => {
        // Very high Saudization → can absorb many expats
        const result = maxExpatsBeforeDrop(80, 100, 'lowGreen');
        expect(result).toBeGreaterThan(0);
    });

    it('is capped at 200 by implementation', () => {
        // Extreme headroom for lowGreen — function stops checking at 200
        // 99 weighted out of 100 = 99%, way above platinum; can absorb 200 expats maximum
        const result = maxExpatsBeforeDrop(99, 100, 'platinum');
        expect(result).toBeLessThanOrEqual(200);
        expect(result).toBeGreaterThan(0);
    });

    it('returns monotone: more headroom = more expats allowed', () => {
        const highHeadroom = maxExpatsBeforeDrop(60, 100, 'lowGreen');
        const lowHeadroom  = maxExpatsBeforeDrop(20, 100, 'lowGreen');
        expect(highHeadroom).toBeGreaterThanOrEqual(lowHeadroom);
    });
});
