// ── SovereignSilo — Entity Context Library ───────────────────────────────────
// Pure utility module (no React). Provides entity data, active-entity
// localStorage read/write, and the namespaced ledger storage-key builder.
//
// Storage layout:
//   thabat-active-entity         → 'ENT_01' | 'ENT_02' | 'ENT_03'
//   thabat-ent_01-ledger         → JSON array (PAC Technologies)
//   thabat-ent_02-ledger         → JSON array (Al-Noor Medical)
//   thabat-ent_03-ledger         → JSON array (Salam Logistics)
//
// This ensures data from one entity never bleeds into another.

// ── Types ──────────────────────────────────────────────────────────────────

export interface Entity {
    id:          string;   // 'ENT_01'
    name:        string;   // English display name
    nameAr:      string;   // Arabic display name
    industry:    string;
    industryAr:  string;
    healthScore: number;   // 0-100 — shown in the switcher before selecting
    accent:      string;   // hex — entity colour for dot / ring accent
}

// ── Demo entities ──────────────────────────────────────────────────────────
// Three distinct business verticals for the Saudi SME market.

export const DEMO_ENTITIES: Entity[] = [
    {
        id:          'ENT_01',
        name:        'The Digital Transformation Agency',
        nameAr:      'وكالة التحول الرقمي',
        industry:    'Technology',
        industryAr:  'التقنية',
        healthScore: 87,
        accent:      '#6366F1',   // indigo
    },
    {
        id:          'ENT_02',
        name:        'The Medical Equipment Factory',
        nameAr:      'مصنع المعدات الطبية',
        industry:    'Healthcare',
        industryAr:  'الرعاية الصحية',
        healthScore: 72,
        accent:      '#4ADE80',   // emerald
    },
    {
        id:          'ENT_03',
        name:        'Salam Logistics',
        nameAr:      'سلام للوجستيات',
        industry:    'Logistics',
        industryAr:  'اللوجستيات',
        healthScore: 61,
        accent:      '#D4AF37',   // gold
    },
];

// ── Constants ─────────────────────────────────────────────────────────────

export const ENTITY_ACTIVE_KEY  = 'thabat-active-entity';
export const DEFAULT_ENTITY_ID  = 'ENT_01';

// ── Helpers ───────────────────────────────────────────────────────────────

export function getActiveEntityId(): string {
    if (typeof window === 'undefined') return DEFAULT_ENTITY_ID;
    return localStorage.getItem(ENTITY_ACTIVE_KEY) ?? DEFAULT_ENTITY_ID;
}

export function getActiveEntity(): Entity {
    const id = getActiveEntityId();
    return DEMO_ENTITIES.find(e => e.id === id) ?? DEMO_ENTITIES[0];
}

/** Persist the new active entity and notify all listeners. */
export function setActiveEntityId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ENTITY_ACTIVE_KEY, id);
    // Dispatch entity-changed so EntityContext React state updates,
    // and ledger-updated so all ledger-consuming components refresh.
    window.dispatchEvent(new Event('thabat-entity-changed'));
    window.dispatchEvent(new Event('thabat-ledger-updated'));
}

/**
 * Returns the namespaced localStorage key for the Action Ledger.
 * Called on every ledger read/write — never cached at module load.
 *
 * Example: 'ENT_01' → 'thabat-ent_01-ledger'
 */
export function getLedgerStorageKey(): string {
    return `thabat-${getActiveEntityId().toLowerCase()}-ledger`;
}
