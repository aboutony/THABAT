// ── ExecutiveOracle — Daily Briefing Generator ───────────────────────────────
// Reads live ledger, stock-gap, and score state to produce a structured
// BriefingContext used by OracleBriefing.tsx for i18n sentence assembly.

import { getLedger } from './ledger';
import type { NitaqatTierKey } from './ledger';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskKey =
    | 'stockOutRisk'
    | 'nitaqatRisk'
    | 'retentionRisk'
    | 'marginsRisk'
    | 'receivablesRisk'
    | 'liquidityRisk'
    | 'healthy';

export type ActionKey =
    | 'pivotedSupplier'
    | 'finalizedHirePlan'
    | 'noAction';

/** Route segment for deep-link, relative to /[locale]/analytics/ */
export type ModuleRoute =
    | 'supply-chain'
    | 'nitaqat'
    | 'sales-report'
    | 'receivables-report'
    | 'efficiency-report'
    | 'retention';

export interface BriefingInput {
    /** Overall stability score 0–100 */
    score:          number;
    /** From calculateStockGap */
    stockGap:       { isAtRisk: boolean; stockDays: number; gapDays: number; };
    /** Current Nitaqat tier from Nitaqat engine */
    nitaqatTier:    NitaqatTierKey;
    /** Sub-score breakdown (optional — use when available) */
    scoreBreakdown?: {
        margins:     number;
        receivables: number;
        liquidity:   number;
    };
    /** True when any client health score < 60 */
    hasRetentionRisk?: boolean;
}

export interface BriefingContext {
    riskKey:     RiskKey;
    riskModule:  ModuleRoute;
    actionKey:   ActionKey;
    actionValue: number;     // SAR value from most recent ledger entry
    actionMeta:  string;     // supplementary label (supplier name / expat count)
    healthScore: number;
    // Sentence interpolation params
    stockDays:   number;
    leadDays:    number;
}

// ── Demo constant ─────────────────────────────────────────────────────────────

/** Default tier used when no real Nitaqat session exists */
export const DEMO_NITAQAT_TIER: NitaqatTierKey = 'platinum';

// ── Priority ranking ──────────────────────────────────────────────────────────

function resolveRisk(
    input:       BriefingInput,
): { riskKey: RiskKey; riskModule: ModuleRoute } {
    // 1. Supply chain stock-out (most operationally urgent)
    if (input.stockGap.isAtRisk) {
        return { riskKey: 'stockOutRisk', riskModule: 'supply-chain' };
    }

    // 2. Nitaqat tier danger zone
    if (input.nitaqatTier === 'red' || input.nitaqatTier === 'lowGreen') {
        return { riskKey: 'nitaqatRisk', riskModule: 'nitaqat' };
    }

    // 3. Client retention risk (churn signals)
    if (input.hasRetentionRisk) {
        return { riskKey: 'retentionRisk', riskModule: 'retention' };
    }

    // 4. Financial sub-score weaknesses
    if (input.scoreBreakdown) {
        const { margins, receivables, liquidity } = input.scoreBreakdown;
        if (margins < 50) {
            return { riskKey: 'marginsRisk', riskModule: 'sales-report' };
        }
        if (receivables < 50) {
            return { riskKey: 'receivablesRisk', riskModule: 'receivables-report' };
        }
        if (liquidity < 50) {
            return { riskKey: 'liquidityRisk', riskModule: 'efficiency-report' };
        }
    }

    // 5. Overall score degradation
    if (input.score < 60) {
        return { riskKey: 'marginsRisk', riskModule: 'sales-report' };
    }

    return { riskKey: 'healthy', riskModule: 'supply-chain' };
}

function resolveAction(): { actionKey: ActionKey; actionValue: number; actionMeta: string } {
    const entries = getLedger();
    if (entries.length === 0) {
        return { actionKey: 'noAction', actionValue: 0, actionMeta: '' };
    }
    const latest = entries[0]; // newest first
    if (latest.actionType === 'SUPPLY_CHAIN_PIVOT') {
        return {
            actionKey:   'pivotedSupplier',
            actionValue: latest.avoidedCost,
            actionMeta:  latest.meta?.alternative ?? '',
        };
    }
    return {
        actionKey:   'finalizedHirePlan',
        actionValue: latest.avoidedCost,
        actionMeta:  String(latest.plannedExpats ?? 0),
    };
}

// ── Main function ─────────────────────────────────────────────────────────────

export function generateBriefing(input: BriefingInput): BriefingContext {
    const { riskKey, riskModule } = resolveRisk(input);
    const { actionKey, actionValue, actionMeta } = resolveAction();

    return {
        riskKey,
        riskModule,
        actionKey,
        actionValue,
        actionMeta,
        healthScore: input.score,
        stockDays:   input.stockGap.stockDays,
        leadDays:    Math.round(input.stockGap.stockDays + Math.max(0, input.stockGap.gapDays)),
    };
}
