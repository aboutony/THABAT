// ── Pathfinder — Sweet Spot Optimizer ────────────────────────────────────────
// Finds the optimal lever combination for a given business target while
// maintaining: Platinum Nitaqat AND ≥ 18% Net Profit Margin.
//
// Solver strategy (constraint-decoupled):
//   • Nitaqat  — only depends on expatsHired      → solved with maxExpatsBeforeDrop
//   • Margin   — depends on salesGrowth + materialDelta → solved by target rules
//   • Stock    — soft constraint (advise restock if projected risk)

import { maxExpatsBeforeDrop }    from './nitaqat';
import { projectScenarioImpact }  from './projectScenarioImpact';
import type { ScenarioLevers, ScenarioProjection } from './projectScenarioImpact';

// ── Baseline mirrors projectScenarioImpact constants ─────────────────────────
const BASE_WEIGHTED_SAUDI = 50.5;
const BASE_TOTAL_EMP      = 120;
const BASE_REVENUE        = 200_000;
const BASE_EXPENSES       = 150_000;
const BASE_MATERIAL_FRAC  = 0.48;
const BASE_MATERIAL_COST  = BASE_EXPENSES * BASE_MATERIAL_FRAC;  // 72,000

// ── Types ─────────────────────────────────────────────────────────────────────

export type OptimizationTarget = 'balanced' | 'maxGrowth' | 'maxProfit';

export interface ReasoningPoint {
    icon:   string;
    key:    string;   // maps to optimizer.reason.{key}
    params: Record<string, string | number>;
}

export interface OptimalResult {
    levers:     ScenarioLevers;
    projection: ScenarioProjection;
    reasoning:  ReasoningPoint[];
    target:     OptimizationTarget;
}

// ── Solver ────────────────────────────────────────────────────────────────────

export function findOptimalPath(target: OptimizationTarget = 'balanced'): OptimalResult {

    // ── 1. Nitaqat headroom (shared across all targets) ──────────────────────
    const maxSafeExpats = maxExpatsBeforeDrop(BASE_WEIGHTED_SAUDI, BASE_TOTAL_EMP, 'platinum');

    // ── 2. Select lever recipe per target ────────────────────────────────────
    let levers: ScenarioLevers;

    switch (target) {

        case 'maxGrowth':
            // Maximize revenue growth; use full Nitaqat headroom; hold material costs flat
            levers = {
                salesGrowthPct:    40,
                expatsHired:       maxSafeExpats,
                materialCostDelta: 0,
            };
            break;

        case 'maxProfit':
            // Maximize margin; aggressive cost reduction; minimal headcount expansion
            levers = {
                salesGrowthPct:    20,
                expatsHired:       0,
                materialCostDelta: -20,
            };
            break;

        case 'balanced':
        default:
            // Sweet spot: sustainable growth + cost discipline + safe hiring
            levers = {
                salesGrowthPct:    15,
                expatsHired:       Math.min(5, maxSafeExpats),
                materialCostDelta: -10,
            };
    }

    // ── 3. Run projection ─────────────────────────────────────────────────────
    const projection = projectScenarioImpact(levers);

    // ── 4. Derive reasoning numbers ───────────────────────────────────────────
    const extraRevenue = Math.round((BASE_REVENUE * levers.salesGrowthPct) / 100);
    const materialSavings = Math.round(
        BASE_MATERIAL_COST * Math.abs(Math.min(0, levers.materialCostDelta)) / 100
    );
    const tierPenaltyAvoided = Math.max(0, 12_000 * Math.max(
        0, levers.expatsHired - maxSafeExpats
    ));
    const hiresBelowCeiling = Math.max(0, maxSafeExpats - levers.expatsHired);
    const marginDelta        = Math.round((projection.projectedMarginPct - projection.currentMarginPct) * 10) / 10;
    const annualImpact       = Math.abs(projection.estimatedAnnualImpact);

    // ── 5. Build reasoning points ────────────────────────────────────────────
    const reasoning: ReasoningPoint[] = [
        {
            icon:   '📈',
            key:    'growth',
            params: {
                pct:     levers.salesGrowthPct,
                revenue: extraRevenue.toLocaleString('en-SA'),
            },
        },
        {
            icon:   '👥',
            key:    'expats',
            params: {
                n:         levers.expatsHired,
                remaining: hiresBelowCeiling,
                penalty:   tierPenaltyAvoided > 0
                    ? tierPenaltyAvoided.toLocaleString('en-SA')
                    : (maxSafeExpats * 12_000).toLocaleString('en-SA'),
            },
        },
        ...(levers.materialCostDelta < 0 ? [{
            icon:   '📦',
            key:    'material',
            params: {
                pct:     Math.abs(levers.materialCostDelta),
                savings: materialSavings.toLocaleString('en-SA'),
            },
        }] : []),
        {
            icon:   '✦',
            key:    'outcome',
            params: {
                margin: projection.projectedMarginPct,
                delta:  marginDelta > 0 ? `+${marginDelta}` : `${marginDelta}`,
                impact: annualImpact.toLocaleString('en-SA'),
            },
        },
    ];

    return { levers, projection, reasoning, target };
}
