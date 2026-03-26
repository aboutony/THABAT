// ── Capital Reporter — Board Report Aggregator ───────────────────────────────
// Aggregates the last 30 days of the Action Ledger into a structured report
// used by ExportPortal (PDF) and InvestorView (read-only stakeholder page).

import {
    getLedger,
    type LedgerEntry,
    type NitaqatTierKey,
    type ScenarioMeta,
} from './ledger';

// ── Tier → compliance score ────────────────────────────────────────────────

const TIER_SCORE: Record<NitaqatTierKey, number> = {
    platinum:  100,
    highGreen:  80,
    medGreen:   60,
    lowGreen:   40,
    red:        10,
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionSimulation {
    salesGrowthPct:        number;
    expatsHired:           number;
    materialCostDelta:     number;
    projectedMarginPct:    number;
    projectedTier:         string;
    estimatedAnnualImpact: number;
}

export interface BoardReport {
    generatedAt:  string;   // ISO
    periodFrom:   string;   // ISO (30 days ago)
    periodTo:     string;   // ISO (now)

    // Overall KPIs
    totalValueProtected: number;  // sum of avoidedCost for all 30-day entries
    realizedCount:       number;
    pendingCount:        number;

    // Compliance & Workforce
    nitaqatEntries:    LedgerEntry[];
    lastKnownTier:     NitaqatTierKey;
    complianceScore:   number;     // 0-100
    tierDropPrevented: number;     // NITAQAT entries where tierDropped === true

    // Supply Chain Resilience
    pivotEntries:     LedgerEntry[];
    safeguardedValue: number;

    // Strategic Outlook
    verifiedStrategies: LedgerEntry[];
    scenarioPlans:      LedgerEntry[];
    topStrategyImpact:  number;          // max avoidedCost among VERIFIED_STRATEGY
    scenarioSnapshot:   ScenarioMeta | null; // latest verified or scenario plan meta

    // Health context
    healthScore: number;

    // Live session simulation (What-If sliders, not yet saved to ledger)
    sessionSimulation: SessionSimulation | null;
}

// ── Aggregator ────────────────────────────────────────────────────────────

export function generateBoardReport(healthScore: number, sessionLevers?: SessionSimulation): BoardReport {
    const now       = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const all     = getLedger();
    const entries = all.filter(e => new Date(e.date) >= thirtyAgo);

    const nitaqatEntries     = entries.filter(e => e.actionType === 'NITAQAT');
    const pivotEntries       = entries.filter(e => e.actionType === 'SUPPLY_CHAIN_PIVOT');
    const scenarioPlans      = entries.filter(e => e.actionType === 'SCENARIO_PLAN');
    const verifiedStrategies = entries.filter(e => e.actionType === 'VERIFIED_STRATEGY');

    const totalValueProtected = entries.reduce((s, e) => s + e.avoidedCost, 0);
    const safeguardedValue    = pivotEntries.reduce((s, e) => s + e.avoidedCost, 0);
    const tierDropPrevented   = nitaqatEntries.filter(e => e.tierDropped).length;
    const topStrategyImpact   = verifiedStrategies.reduce((m, e) => Math.max(m, e.avoidedCost), 0);

    // Scenario snapshot: prefer most recent verified strategy, fall back to plan
    const scenarioSnapshot: ScenarioMeta | null =
        verifiedStrategies[0]?.scenarioMeta ??
        scenarioPlans[0]?.scenarioMeta ??
        null;

    // Compliance: derive from most recent NITAQAT entry, otherwise assume platinum (demo)
    const lastKnownTier: NitaqatTierKey =
        (nitaqatEntries[0]?.currentTier as NitaqatTierKey | undefined) ?? 'platinum';
    const complianceScore = TIER_SCORE[lastKnownTier] ?? 100;

    return {
        generatedAt:  now.toISOString(),
        periodFrom:   thirtyAgo.toISOString(),
        periodTo:     now.toISOString(),
        totalValueProtected,
        realizedCount: entries.filter(e => e.status === 'realized').length,
        pendingCount:  entries.filter(e => e.status === 'pending').length,
        nitaqatEntries,
        lastKnownTier,
        complianceScore,
        tierDropPrevented,
        pivotEntries,
        safeguardedValue,
        verifiedStrategies,
        scenarioPlans,
        topStrategyImpact,
        scenarioSnapshot,
        healthScore,
        sessionSimulation: sessionLevers ?? null,
    };
}
