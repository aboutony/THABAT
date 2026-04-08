// ── Action Ledger — THABAT Phase 1.9 ─────────────────────────────────────
// Persists to the database via /api/ledger.
// Also dual-writes to localStorage so the multi-entity COMMANDER demo
// stays responsive without a network round-trip on entity switch.
// Guest / demo-tier users (no real session) fall back to localStorage only.

export type NitaqatTierKey   = 'platinum' | 'highGreen' | 'medGreen' | 'lowGreen' | 'red';
export type LedgerStatus     = 'pending' | 'realized';
export type LedgerActionType = 'NITAQAT' | 'SUPPLY_CHAIN_PIVOT' | 'SCENARIO_PLAN' | 'VERIFIED_STRATEGY';

export interface SupplyChainMeta {
    original:    string;
    alternative: string;
    units:       number;
    description: string;
}

export interface LedgerEntry {
    id:                string;
    date:              string;               // ISO timestamp
    actionType:        LedgerActionType;
    avoidedCost:       number;               // SAR
    status:            LedgerStatus;
    plannedExpats?:    number;
    currentTier?:      NitaqatTierKey;
    projectedTier?:    NitaqatTierKey;
    tierDropped?:      boolean;
    correctionNeeded?: number;
    safeWindow?:       number;
    meta?:             SupplyChainMeta;
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

// ── localStorage helpers (client-only) ────────────────────────────────────

import { getLedgerStorageKey } from './entityContext';

function lsGet(): LedgerEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(getLedgerStorageKey()) ?? '[]') as LedgerEntry[];
    } catch { return []; }
}

function lsSave(entries: LedgerEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getLedgerStorageKey(), JSON.stringify(entries));
    window.dispatchEvent(new Event('thabat-ledger-updated'));
}

function lsAddEntry(entry: LedgerEntry): void {
    const entries = lsGet();
    entries.unshift(entry);
    lsSave(entries);
}

function lsMarkRealized(id: string): void {
    const entries = lsGet();
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) { entries[idx].status = 'realized'; lsSave(entries); }
}

// ── Sync helpers — safe no-ops outside browser ─────────────────────────────

function isClientContext(): boolean {
    return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Save a new ledger entry.
 * Writes to DB (non-blocking) + localStorage simultaneously.
 * Returns the entry immediately using a client-generated id so callers
 * don't need to await a network round-trip.
 */
export function addLedgerEntry(
    payload: Omit<LedgerEntry, 'id' | 'date' | 'status'>,
): LedgerEntry {
    const entry: LedgerEntry = {
        ...payload,
        id:     `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date:   new Date().toISOString(),
        status: 'pending',
    };

    // Always write to localStorage for instant local feedback
    lsAddEntry(entry);

    // Fire-and-forget DB write — replace client id with server id if successful
    if (isClientContext()) {
        fetch('/api/ledger', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(entry),
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json() as { entry: LedgerEntry };
                // Swap client-generated id for the DB-assigned id in localStorage
                const entries = lsGet();
                const idx = entries.findIndex(e => e.id === entry.id);
                if (idx >= 0) {
                    entries[idx].id   = data.entry.id;
                    entries[idx].date = data.entry.date;
                    lsSave(entries);
                }
            }
        }).catch(() => { /* localStorage already has the entry — no data lost */ });
    }

    return entry;
}

/**
 * Mark an entry as realized.
 * Updates localStorage immediately, then syncs to DB.
 */
export function markLedgerRealized(id: string): void {
    lsMarkRealized(id);

    if (isClientContext()) {
        fetch('/api/ledger', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id }),
        }).catch(() => { /* localStorage already updated */ });
    }
}

/**
 * Synchronous read from localStorage (for components that need instant data).
 * ActionLedger.tsx uses the API for its primary load; this is used by
 * getTotalAvoided() in RitualScreen.
 */
export function getLedger(): LedgerEntry[] {
    return lsGet();
}

// ── Aggregates ────────────────────────────────────────────────────────────

export function getTotalAvoided(): number {
    return getLedger().reduce((sum, e) => sum + e.avoidedCost, 0);
}

// ── Business logic ────────────────────────────────────────────────────────

export function calcAvoidedCost(
    plannedExpats:    number,
    correctionNeeded: number,
    tierDropped:      boolean,
    safeWindow:       number,
): number {
    if (tierDropped && correctionNeeded > 0) return correctionNeeded * 12_000;
    return Math.min(plannedExpats, safeWindow) * 2_400;
}
