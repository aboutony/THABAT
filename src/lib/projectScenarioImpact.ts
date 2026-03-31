// ── ScenarioEngine — Impact Matrix Projector ───────────────────────────────────
// Takes the 3 lever values from ScenarioPlayground and calculates the ripple
// effect across: Net Profit Margin, Nitaqat Tier, and Stock-at-Risk.

import { getEntityScenarioBaseline } from './entityDemoContent';
import { calculateStockGap, getEntityStockGapInput } from './stockGap';
import { calcWeightedSaudi, simulateExpats } from './nitaqat';
import type { NitaqatTierKey } from './ledger';

export interface ScenarioLevers {
    salesGrowthPct:    number;
    expatsHired:       number;
    materialCostDelta: number;
}

export interface ScenarioProjection {
    currentMarginPct:   number;
    projectedMarginPct: number;
    marginDelta:        number;
    projectedRevenue:   number;
    currentTier:        NitaqatTierKey;
    projectedTier:      NitaqatTierKey;
    tierDropped:        boolean;
    currentStockDays:   number;
    currentStockRisk:   boolean;
    projectedStockDays: number;
    projectedStockRisk: boolean;
    estimatedAnnualImpact: number;
}

export function projectScenarioImpact(
    levers: ScenarioLevers,
    entityId = 'ENT_02',
): ScenarioProjection {
    const { salesGrowthPct, expatsHired, materialCostDelta } = levers;
    const baseline = getEntityScenarioBaseline(entityId);
    const stockInput = getEntityStockGapInput(entityId);

    const baseRevenue = baseline.revenue;
    const baseExpenses = baseline.expenses;
    const baseMaterial = baseExpenses * baseline.materialFraction;
    const baseVelocity = stockInput.dailySalesVelocity;
    const weightedSaudi = calcWeightedSaudi(baseline.workforce);
    const baseTotalEmployees = baseline.workforce.totalEmployees;
    const baseTier = baseline.tier;

    const projRevenue  = baseRevenue * (1 + salesGrowthPct / 100);
    const projMaterial = baseMaterial * (1 + materialCostDelta / 100);
    const projExpenses = (baseExpenses - baseMaterial) + projMaterial;

    const currentMarginPct = ((baseRevenue - baseExpenses) / baseRevenue) * 100;
    const rawProjectedMargin = projRevenue > 0
        ? ((projRevenue - projExpenses) / projRevenue) * 100
        : currentMarginPct;
    const projectedMarginPct = Math.round(rawProjectedMargin * 10) / 10;

    const sim = simulateExpats(
        weightedSaudi,
        baseTotalEmployees,
        baseTier,
        expatsHired,
    );

    const currentGap = calculateStockGap(stockInput);
    const projVelocity = Math.max(0.5, baseVelocity * (1 + salesGrowthPct / 100));
    const projStockDays = stockInput.onHandUnits / projVelocity;
    const projGap = calculateStockGap({
        ...stockInput,
        stockDays:          projStockDays,
        dailySalesVelocity: projVelocity,
    });

    const marginDelta = Math.round((projectedMarginPct - currentMarginPct) * 10) / 10;
    const estimatedAnnualImpact = Math.round((marginDelta / 100) * projRevenue * 12);

    return {
        currentMarginPct:   Math.round(currentMarginPct * 10) / 10,
        projectedMarginPct,
        marginDelta,
        projectedRevenue:   Math.round(projRevenue),
        currentTier:        baseTier,
        projectedTier:      sim.newTier as NitaqatTierKey,
        tierDropped:        sim.tierDropped,
        currentStockDays:   currentGap.stockDays,
        currentStockRisk:   currentGap.isAtRisk,
        projectedStockDays: projGap.stockDays,
        projectedStockRisk: projGap.isAtRisk,
        estimatedAnnualImpact,
    };
}
