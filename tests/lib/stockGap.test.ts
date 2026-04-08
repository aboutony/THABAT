/**
 * Unit tests — Stock Gap Detector (src/lib/stockGap.ts)
 *
 * Coverage: calculateStockGap — isAtRisk, urgencyLevel, gapDays, shortfallUnits.
 * All inputs are passed explicitly; no module-level demo data is exercised.
 */

import { describe, it, expect } from 'vitest';
import { calculateStockGap, type StockGapInput } from '@/lib/stockGap';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SAFE_INPUT: StockGapInput = {
    stockDays:          30,
    avgLeadTimeDays:    14,
    dailySalesVelocity: 10,
    onHandUnits:        300,
};

const WARNING_INPUT: StockGapInput = {
    stockDays:          10,
    avgLeadTimeDays:    13,   // gapDays = 3 → warning (>0, <7)
    dailySalesVelocity: 8,
    onHandUnits:        80,
};

const CRITICAL_INPUT: StockGapInput = {
    stockDays:          5,
    avgLeadTimeDays:    15,   // gapDays = 10 → critical (≥7)
    dailySalesVelocity: 12,
    onHandUnits:        60,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('calculateStockGap', () => {
    it('returns all expected fields', () => {
        const result = calculateStockGap(SAFE_INPUT);
        expect(result).toHaveProperty('isAtRisk');
        expect(result).toHaveProperty('urgencyLevel');
        expect(result).toHaveProperty('gapDays');
        expect(result).toHaveProperty('stockDays');
        expect(result).toHaveProperty('leadTimeDays');
        expect(result).toHaveProperty('shortfallUnits');
    });

    // ── Safe state ──────────────────────────────────────────────────────────

    it('is safe when stock days exceed lead time', () => {
        const result = calculateStockGap(SAFE_INPUT);
        expect(result.isAtRisk).toBe(false);
        expect(result.urgencyLevel).toBe('safe');
        expect(result.shortfallUnits).toBe(0);
    });

    it('gapDays is negative when safe (lead < stock)', () => {
        const result = calculateStockGap(SAFE_INPUT);
        expect(result.gapDays).toBeLessThan(0);
    });

    // ── Warning state ───────────────────────────────────────────────────────

    it('is at risk with warning when gap is between 1 and 6 days', () => {
        const result = calculateStockGap(WARNING_INPUT);
        expect(result.isAtRisk).toBe(true);
        expect(result.urgencyLevel).toBe('warning');
    });

    it('shortfallUnits > 0 when at risk', () => {
        const result = calculateStockGap(WARNING_INPUT);
        expect(result.shortfallUnits).toBeGreaterThan(0);
    });

    it('shortfallUnits = ceil(gapDays * dailySalesVelocity)', () => {
        const result = calculateStockGap(WARNING_INPUT);
        const expected = Math.ceil(result.gapDays * WARNING_INPUT.dailySalesVelocity);
        expect(result.shortfallUnits).toBe(expected);
    });

    // ── Critical state ──────────────────────────────────────────────────────

    it('is critical when gap >= 7 days', () => {
        const result = calculateStockGap(CRITICAL_INPUT);
        expect(result.isAtRisk).toBe(true);
        expect(result.urgencyLevel).toBe('critical');
    });

    it('gapDays equals leadTimeDays - stockDays', () => {
        const result = calculateStockGap(CRITICAL_INPUT);
        expect(result.gapDays).toBe(CRITICAL_INPUT.avgLeadTimeDays - CRITICAL_INPUT.stockDays);
    });

    // ── Boundary conditions ──────────────────────────────────────────────────

    it('exactly 0 gapDays (lead == stock) is safe', () => {
        const input: StockGapInput = { ...SAFE_INPUT, stockDays: 14, avgLeadTimeDays: 14 };
        const result = calculateStockGap(input);
        expect(result.isAtRisk).toBe(false);
        expect(result.urgencyLevel).toBe('safe');
    });

    it('gapDays = 7 is critical (not warning)', () => {
        const input: StockGapInput = { ...SAFE_INPUT, stockDays: 3, avgLeadTimeDays: 10 };
        const result = calculateStockGap(input);
        expect(result.gapDays).toBe(7);
        expect(result.urgencyLevel).toBe('critical');
    });

    it('gapDays = 1 is warning (not critical)', () => {
        const input: StockGapInput = { ...SAFE_INPUT, stockDays: 13, avgLeadTimeDays: 14 };
        const result = calculateStockGap(input);
        expect(result.gapDays).toBe(1);
        expect(result.urgencyLevel).toBe('warning');
    });

    it('leadTimeDays in result matches avgLeadTimeDays from input', () => {
        const result = calculateStockGap(CRITICAL_INPUT);
        expect(result.leadTimeDays).toBe(CRITICAL_INPUT.avgLeadTimeDays);
    });

    it('stockDays in result matches stockDays from input', () => {
        const result = calculateStockGap(CRITICAL_INPUT);
        expect(result.stockDays).toBe(CRITICAL_INPUT.stockDays);
    });

    // ── Demo constants verify real-world scenario ────────────────────────────

    it('UNIMED demo scenario (stockDays=4, leadTime=14.8) is critical', () => {
        const input: StockGapInput = {
            stockDays: 4,
            avgLeadTimeDays: 14.8,
            dailySalesVelocity: 12,
            onHandUnits: 48,
        };
        const result = calculateStockGap(input);
        expect(result.isAtRisk).toBe(true);
        expect(result.urgencyLevel).toBe('critical');
        expect(result.gapDays).toBeCloseTo(10.8, 1);
        expect(result.shortfallUnits).toBe(Math.ceil(10.8 * 12)); // 130
    });
});
