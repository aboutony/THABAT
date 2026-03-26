// ── Safeguard Value — financial loss prevented by a supply-chain pivot ────────
// Formula: ShortfallUnits × AvgUnitProfit
// Represents the SAR value of production/sales that would have been lost if
// the stock-out was not averted by switching to an alternative supplier.

export interface SafeguardInput {
    /** Units that would be short-sold before replenishment (from calculateStockGap) */
    shortfallUnits: number;
    /** Average profit per unit in SAR */
    avgUnitProfit:  number;
}

export function calculateSafeguardValue(input: SafeguardInput): number {
    return Math.round(input.shortfallUnits * input.avgUnitProfit);
}

// ── UNIMED demo constants (Ultrasound Probe Array) ────────────────────────────
/** Average profit per Ultrasound Probe Array unit (SAR) */
export const DEMO_AVG_UNIT_PROFIT = 850;

/**
 * Shortfall units from calculateStockGap with DEMO_STOCK_GAP_INPUT:
 *   gapDays = 14.8 − 4 = 10.8  →  ceil(10.8 × 12) = 130 units
 */
export const DEMO_SHORTFALL_UNITS = 130;

/** Pre-computed demo safeguard value: 130 × SAR 850 = SAR 110,500 */
export const DEMO_SAFEGUARD_VALUE = calculateSafeguardValue({
    shortfallUnits: DEMO_SHORTFALL_UNITS,
    avgUnitProfit:  DEMO_AVG_UNIT_PROFIT,
});
