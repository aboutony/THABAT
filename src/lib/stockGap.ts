// ── Stock-at-Risk gap detector ────────────────────────────────────────────────
import { getEntityStockGapData } from './entityDatasets';
// Compares average lead time (from Nerve Center) against remaining stock days.
// If leadTimeDays > stockDays the product will stock-out before the next
// replenishment arrives — triggering the Crimson state on StockHourglass.

export interface StockGapInput {
    /** Remaining inventory expressed in days of cover at current velocity */
    stockDays:          number;
    /** Average lead time in days (from Supply Chain Nerve Center) */
    avgLeadTimeDays:    number;
    /** Units sold / consumed per day */
    dailySalesVelocity: number;
    /** Current on-hand unit count */
    onHandUnits:        number;
}

export type UrgencyLevel = 'critical' | 'warning' | 'safe';

export interface StockGapResult {
    isAtRisk:       boolean;
    urgencyLevel:   UrgencyLevel;
    /** Positive value means stock runs out {gapDays} before next shipment */
    gapDays:        number;
    stockDays:      number;
    leadTimeDays:   number;
    /** Units that will be short-sold before replenishment (0 if safe) */
    shortfallUnits: number;
}

export function calculateStockGap(input: StockGapInput): StockGapResult {
    const { stockDays, avgLeadTimeDays, dailySalesVelocity } = input;

    const gapDays   = avgLeadTimeDays - stockDays;
    const isAtRisk  = gapDays > 0;

    const urgencyLevel: UrgencyLevel =
        gapDays >= 7 ? 'critical' :
        gapDays >  0 ? 'warning'  :
        'safe';

    const shortfallUnits = isAtRisk
        ? Math.ceil(gapDays * dailySalesVelocity)
        : 0;

    return {
        isAtRisk,
        urgencyLevel,
        gapDays,
        stockDays,
        leadTimeDays: avgLeadTimeDays,
        shortfallUnits,
    };
}

export function getEntityStockGapInput(entityId: string): StockGapInput {
    return getEntityStockGapData(entityId).input;
}

export function getEntityNextShipmentDays(entityId: string): number {
    return getEntityStockGapData(entityId).nextShipmentDays;
}

// ── Demo data constants (UNIMED Ultrasound Probe Array) ───────────────────────
export const DEMO_STOCK_GAP_INPUT: StockGapInput = {
    stockDays:          4,
    avgLeadTimeDays:    14.8,   // from Nerve Center KPI_AVG_LEAD
    dailySalesVelocity: 12,
    onHandUnits:        48,
};

export const DEMO_NEXT_SHIPMENT_DAYS = 9;
