// ── Action Ledger — THABAT Phase 05 + 06 ─────────────────────────────────
// Stores finalized recruitment plans and supply-chain pivots, tracking
// their real-world outcome.
// Persisted to localStorage; dispatches 'thabat-ledger-updated' so all
// open components can sync without a full re-render.

export type NitaqatTierKey  = 'platinum' | 'highGreen' | 'medGreen' | 'lowGreen' | 'red';
export type LedgerStatus    = 'pending' | 'realized';
export type LedgerActionType = 'NITAQAT' | 'SUPPLY_CHAIN_PIVOT' | 'SCENARIO_PLAN' | 'VERIFIED_STRATEGY';

export interface SupplyChainMeta {
    original:    string;   // original supplier name
    alternative: string;   // pivoted-to supplier name
    units:       number;   // shortfall units averted
    description: string;   // human-readable action description
}

export interface LedgerEntry {
    id:                string;
    date:              string;               // ISO timestamp
    actionType:        LedgerActionType;
    avoidedCost:       number;               // SAR
    status:            LedgerStatus;
    // Nitaqat-specific (undefined for SUPPLY_CHAIN_PIVOT)
    plannedExpats?:    number;
    currentTier?:      NitaqatTierKey;
    projectedTier?:    NitaqatTierKey;
    tierDropped?:      boolean;
    correctionNeeded?: number;
    safeWindow?:       number;
    // Supply-chain-specific (undefined for NITAQAT)
    meta?:             SupplyChainMeta;
    // Scenario-specific (undefined for other types)
    scenarioMeta?:     ScenarioMeta;
}

export interface ScenarioMeta {
    salesGrowthPct:      number;
    expatsHired:         number;
    materialCostDelta:   number;
    projectedMarginPct:  number;
    projectedTier:       NitaqatTierKey;
    projectedStockRisk:  boolean;
}

const STORAGE_KEY = 'thabat-action-ledger';

// ── Persistence helpers ───────────────────────────────────────────────────

export function getLedger(): LedgerEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LedgerEntry[];
    } catch {
        return [];
    }
}

function saveLedger(entries: LedgerEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event('thabat-ledger-updated'));
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export function addLedgerEntry(
    payload: Omit<LedgerEntry, 'id' | 'date' | 'status'>,
): LedgerEntry {
    const entry: LedgerEntry = {
        ...payload,
        id:     `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date:   new Date().toISOString(),
        status: 'pending',
    };
    const entries = getLedger();
    entries.unshift(entry); // newest first
    saveLedger(entries);
    return entry;
}

export function markLedgerRealized(id: string): void {
    const entries = getLedger();
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) {
        entries[idx].status = 'realized';
        saveLedger(entries);
    }
}

// ── Aggregates ────────────────────────────────────────────────────────────

export function getTotalAvoided(): number {
    return getLedger().reduce((sum, e) => sum + e.avoidedCost, 0);
}

// ── Business logic ────────────────────────────────────────────────────────

/**
 * Calculates the SAR value of costs avoided by following the simulation:
 * - Tier-drop scenario: cost of corrective Saudi hires (SAR 12,000 ea.)
 * - Safe-hire scenario: visa renewal fees saved (SAR 2,400 per expat/yr)
 */
export function calcAvoidedCost(
    plannedExpats:    number,
    correctionNeeded: number,
    tierDropped:      boolean,
    safeWindow:       number,
): number {
    if (tierDropped && correctionNeeded > 0) {
        return correctionNeeded * 12_000;
    }
    return Math.min(plannedExpats, safeWindow) * 2_400;
}
