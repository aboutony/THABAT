// ── Pathfinder — Sweet Spot Optimizer ─────────────────────────────────────────
// Finds the optimal lever combination for a given business target while
// maintaining the current entity's Nitaqat posture and protecting margin.

import { maxExpatsBeforeDrop } from './nitaqat';
import { getEntityScenarioBaseline } from './entityDemoContent';
import { projectScenarioImpact } from './projectScenarioImpact';
import type { ScenarioLevers, ScenarioProjection } from './projectScenarioImpact';

export type OptimizationTarget = 'balanced' | 'maxGrowth' | 'maxProfit';

export interface ReasoningPoint {
    icon:   string;
    key:    string;
    params: Record<string, string | number>;
}

export interface OptimalResult {
    levers:     ScenarioLevers;
    projection: ScenarioProjection;
    reasoning:  ReasoningPoint[];
    target:     OptimizationTarget;
}

export function findOptimalPath(
    target: OptimizationTarget = 'balanced',
    entityId = 'ENT_02',
): OptimalResult {
    const baseline = getEntityScenarioBaseline(entityId);
    const weightedSaudi =
        baseline.workforce.saudiRegular +
        baseline.workforce.saudiLowSalary * 0.5 +
        baseline.workforce.saudiStudents * 0.5 +
        Math.min(
            baseline.workforce.saudiSpecialNeeds,
            Math.floor(baseline.workforce.totalEmployees * 0.10),
        ) * 4.0;

    const maxSafeExpats = maxExpatsBeforeDrop(
        weightedSaudi,
        baseline.workforce.totalEmployees,
        baseline.tier,
    );

    let levers: ScenarioLevers;

    switch (target) {
        case 'maxGrowth':
            levers = {
                salesGrowthPct:    entityId === 'ENT_03' ? 26 : 40,
                expatsHired:       maxSafeExpats,
                materialCostDelta: entityId === 'ENT_03' ? -4 : 0,
            };
            break;
        case 'maxProfit':
            levers = {
                salesGrowthPct:    entityId === 'ENT_03' ? 12 : 20,
                expatsHired:       0,
                materialCostDelta: entityId === 'ENT_03' ? -12 : -20,
            };
            break;
        case 'balanced':
        default:
            levers = {
                salesGrowthPct:    entityId === 'ENT_03' ? 18 : 15,
                expatsHired:       Math.min(entityId === 'ENT_03' ? 8 : 5, maxSafeExpats),
                materialCostDelta: entityId === 'ENT_03' ? -8 : -10,
            };
            break;
    }

    const projection = projectScenarioImpact(levers, entityId);
    const extraRevenue = Math.round((baseline.revenue * levers.salesGrowthPct) / 100);
    const materialSavings = Math.round(
        baseline.expenses * baseline.materialFraction * Math.abs(Math.min(0, levers.materialCostDelta)) / 100,
    );
    const hiresBelowCeiling = Math.max(0, maxSafeExpats - levers.expatsHired);
    const marginDelta = Math.round((projection.projectedMarginPct - projection.currentMarginPct) * 10) / 10;
    const annualImpact = Math.abs(projection.estimatedAnnualImpact);

    const reasoning: ReasoningPoint[] = [
        {
            icon: '📈',
            key: 'growth',
            params: {
                pct:     levers.salesGrowthPct,
                revenue: extraRevenue.toLocaleString('en-SA'),
            },
        },
        {
            icon: '👥',
            key: 'expats',
            params: {
                n:         levers.expatsHired,
                remaining: hiresBelowCeiling,
                penalty:   (maxSafeExpats * 12_000).toLocaleString('en-SA'),
            },
        },
        ...(levers.materialCostDelta < 0 ? [{
            icon: '📦',
            key: 'material',
            params: {
                pct:     Math.abs(levers.materialCostDelta),
                savings: materialSavings.toLocaleString('en-SA'),
            },
        }] : []),
        {
            icon: '✦',
            key: 'outcome',
            params: {
                margin: projection.projectedMarginPct,
                delta:  marginDelta > 0 ? `+${marginDelta}` : `${marginDelta}`,
                impact: annualImpact.toLocaleString('en-SA'),
            },
        },
    ];

    return { levers, projection, reasoning, target };
}
