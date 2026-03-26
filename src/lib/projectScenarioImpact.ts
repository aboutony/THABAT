// ── ScenarioEngine — Impact Matrix Projector ─────────────────────────────────
// Takes the 3 lever values from ScenarioPlayground and calculates the ripple
// effect across: Net Profit Margin, Nitaqat Tier, and Stock-at-Risk.
//
// All inputs are deltas from the UNIMED demo baseline.

import { calculateStockGap, DEMO_STOCK_GAP_INPUT } from './stockGap';
import { simulateExpats }                           from './nitaqat';
import type { NitaqatTierKey }                      from './ledger';

// ── UNIMED demo baseline ──────────────────────────────────────────────────────
const BASE_REVENUE        = 200_000;   // SAR/month
const BASE_EXPENSES       = 150_000;   // SAR/month
const BASE_MATERIAL_FRAC  = 0.48;      // 48% of expenses = raw materials (waterfall)
const BASE_VELOCITY       = DEMO_STOCK_GAP_INPUT.dailySalesVelocity;  // 12 units/day

// Nitaqat demo state (mirrors DEMO_WORKFORCE in nitaqat page)
const BASE_WEIGHTED_SAUDI = 50.5;      // calcWeightedSaudi(DEMO_WORKFORCE)
const BASE_TOTAL_EMP      = 120;
const BASE_TIER: NitaqatTierKey = 'platinum';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ScenarioLevers {
    salesGrowthPct:    number;   // -50  → +100
    expatsHired:       number;   //   0  → +50
    materialCostDelta: number;   // -30  → +50
}

export interface ScenarioProjection {
    // Margin
    currentMarginPct:   number;
    projectedMarginPct: number;
    marginDelta:        number;
    projectedRevenue:   number;
    // Nitaqat
    currentTier:        NitaqatTierKey;
    projectedTier:      NitaqatTierKey;
    tierDropped:        boolean;
    // Stock
    currentStockDays:   number;
    currentStockRisk:   boolean;
    projectedStockDays: number;
    projectedStockRisk: boolean;
    // Summary
    estimatedAnnualImpact: number;   // SAR — positive = beneficial scenario
}

// ── Core calculator ───────────────────────────────────────────────────────────

export function projectScenarioImpact(levers: ScenarioLevers): ScenarioProjection {
    const { salesGrowthPct, expatsHired, materialCostDelta } = levers;

    // ── 1. Net Profit Margin ─────────────────────────────────────────────────
    const projRevenue  = BASE_REVENUE  * (1 + salesGrowthPct   / 100);
    const baseMaterial = BASE_EXPENSES * BASE_MATERIAL_FRAC;
    const projMaterial = baseMaterial  * (1 + materialCostDelta / 100);
    const projExpenses = (BASE_EXPENSES - baseMaterial) + projMaterial;

    const currentMarginPct   = ((BASE_REVENUE - BASE_EXPENSES) / BASE_REVENUE) * 100;
    const rawProjMargin      = projRevenue > 0
        ? ((projRevenue - projExpenses) / projRevenue) * 100
        : currentMarginPct;
    const projectedMarginPct = Math.round(rawProjMargin * 10) / 10;

    // ── 2. Nitaqat Tier ──────────────────────────────────────────────────────
    const sim = simulateExpats(
        BASE_WEIGHTED_SAUDI,
        BASE_TOTAL_EMP,
        BASE_TIER,
        expatsHired,
    );

    // ── 3. Stock-at-Risk ─────────────────────────────────────────────────────
    // Project stockDays from onHandUnits ÷ projected velocity (not static input)
    const currentGap    = calculateStockGap(DEMO_STOCK_GAP_INPUT);
    const projVelocity  = Math.max(0.5, BASE_VELOCITY * (1 + salesGrowthPct / 100));
    const projStockDays = DEMO_STOCK_GAP_INPUT.onHandUnits / projVelocity;
    const projGap       = calculateStockGap({
        ...DEMO_STOCK_GAP_INPUT,
        stockDays:          projStockDays,
        dailySalesVelocity: projVelocity,
    });

    // ── 4. Estimated annual impact ───────────────────────────────────────────
    const marginDelta           = Math.round((projectedMarginPct - currentMarginPct) * 10) / 10;
    const estimatedAnnualImpact = Math.round((marginDelta / 100) * projRevenue * 12);

    return {
        currentMarginPct:   Math.round(currentMarginPct * 10) / 10,
        projectedMarginPct,
        marginDelta,
        projectedRevenue:   Math.round(projRevenue),
        currentTier:        BASE_TIER,
        projectedTier:      sim.newTier as NitaqatTierKey,
        tierDropped:        sim.tierDropped,
        currentStockDays:   currentGap.stockDays,
        currentStockRisk:   currentGap.isAtRisk,
        projectedStockDays: projGap.stockDays,
        projectedStockRisk: projGap.isAtRisk,
        estimatedAnnualImpact,
    };
}
