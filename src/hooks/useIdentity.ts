'use client';

/**
 * useIdentity — Triple-Silo Architecture (Command #61)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SILO VERIFICATION — role-gated data access matrix                 │
 * │                                                                     │
 * │  COMMANDER  adonis@thabat.app                                       │
 * │    → Full 8-LoB entity switcher                                     │
 * │    → Live portfolio data + all analytics                            │
 * │    → Score: live / demo (87)                                        │
 * │                                                                     │
 * │  GUEST      guest@thabat.app                                        │
 * │    → Entity pinned to ENT_02 "The Medical Equipment Factory"        │
 * │    → No entity switcher dropdown                                    │
 * │    → Static demo data only (score: 87, UNIMED context)              │
 * │    → No CLIENT zero-out — reads same demo arrays as COMMANDER       │
 * │                                                                     │
 * │  CLIENT     client@thabat.app (and all non-demo logins)             │
 * │    → TOTAL ZERO STATE — no score, no workforce, no charts           │
 * │    → All numeric values: 0 or "---"                                 │
 * │    → All chart arrays: []                                           │
 * │    → Daily briefing: Standby mode only                              │
 * │    → Settings: Sovereign Connector Hub for ERP onboarding           │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The switch statement below is the ONLY place role → data-silo mapping
 * is authorised. All components derive their gating from this export.
 */

import { useAuth } from '@/context/AuthContext';

// ── Data-silo descriptor ──────────────────────────────────────────────────────
export interface DataSilo {
    access:         'FULL' | 'STATIC' | 'ZERO';
    entitySwitcher: boolean;  // Can the user switch entities?
    scoreData:      boolean;  // Is the stability score shown?
    portfolioData:  boolean;  // Are live charts / analytics arrays populated?
    pinnedEntityId: string | null; // null = use localStorage; string = forced entity
}

// ── Canonical silo switch — the single source of truth ───────────────────────
function resolveDataSilo(role: string | null): DataSilo {
    switch (role) {
        case 'COMMANDER':
            return {
                access:         'FULL',
                entitySwitcher: true,
                scoreData:      true,
                portfolioData:  true,
                pinnedEntityId: null,         // free to switch
            };
        case 'GUEST':
            return {
                access:         'STATIC',
                entitySwitcher: false,
                scoreData:      true,         // shows demo score (87)
                portfolioData:  true,         // reads same demo arrays as COMMANDER
                pinnedEntityId: 'ENT_02',     // The Medical Equipment Factory — always
            };
        default: // 'CLIENT' and any unrecognised role
            return {
                access:         'ZERO',
                entitySwitcher: false,
                scoreData:      false,        // score shown as 0 / "---"
                portfolioData:  false,        // all arrays coerced to []
                pinnedEntityId: null,
            };
    }
}

export interface Identity {
    isCommander: boolean;
    isGuest:     boolean;
    isClient:    boolean;
    role:        string | null;
    silo:        DataSilo;
}

export function useIdentity(): Identity {
    const { user } = useAuth();
    const role = user?.role ?? null;
    const silo = resolveDataSilo(role);
    return {
        isCommander: role === 'COMMANDER',
        isGuest:     role === 'GUEST',
        isClient:    silo.access === 'ZERO',
        role,
        silo,
    };
}
