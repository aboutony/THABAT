/**
 * THABAT Nitaqat 2.0 Engine — Phase 04
 *
 * Formula  :  y = m · ln(x) + c
 *   y = required Saudization %
 *   x = total labour force size
 *
 * Manufacturing-sector constants (HRSD 2026 Nitaqat 2.0):
 *   Platinum    m = 2.08  c = 28.37
 *   High Green  m = 2.08  c = 23.37
 *   Med Green   m = 2.08  c = 18.37
 *   Low Green   m = 2.08  c = 13.37
 *   Red         Below Low Green threshold
 *
 * 2026 Weighted Counting Rules
 * ──────────────────────────────
 *   Saudi, salary ≥ SAR 4 000     → 1.0
 *   Saudi, salary < SAR 4 000     → 0.5
 *   Saudi student                  → 0.5
 *   Saudi special needs            → 4.0  (capped at 10 % of total labour)
 */

export type NitaqatTier = 'platinum' | 'highGreen' | 'medGreen' | 'lowGreen' | 'red';

export interface TierConstants { m: number; c: number }

export const TIER_CONSTANTS: Record<Exclude<NitaqatTier, 'red'>, TierConstants> = {
    platinum:  { m: 2.08, c: 28.37 },
    highGreen: { m: 2.08, c: 23.37 },
    medGreen:  { m: 2.08, c: 18.37 },
    lowGreen:  { m: 2.08, c: 13.37 },
};

/** Ordered from best to worst */
export const TIER_ORDER: NitaqatTier[] = [
    'platinum', 'highGreen', 'medGreen', 'lowGreen', 'red',
];

export const TIER_COLORS: Record<NitaqatTier, string> = {
    platinum:  '#D4AF37',
    highGreen: '#15803D',
    medGreen:  '#4ADE80',
    lowGreen:  '#A3E635',
    red:       '#DC2626',
};

export const TIER_LABEL_KEYS: Record<NitaqatTier, string> = {
    platinum:  'tierPlatinum',
    highGreen: 'tierHighGreen',
    medGreen:  'tierMedGreen',
    lowGreen:  'tierLowGreen',
    red:       'tierRed',
};

export const MIN_FULL_SALARY        = 4_000;
export const MAX_SPECIAL_NEEDS_FRAC = 0.10;
export const GAUGE_MAX_PCT          = 55;   // gauge arc spans 0 → 55 % Saudization

// ─── Workforce types ─────────────────────────────────────────────────────────

export interface WorkforceInput {
    totalEmployees:    number;
    saudiRegular:      number;   // salary ≥ SAR 4 000  → weight 1.0
    saudiLowSalary:    number;   // salary < SAR 4 000  → weight 0.5
    saudiStudents:     number;   // Saudi student       → weight 0.5
    saudiSpecialNeeds: number;   // special needs       → weight 4.0 (capped)
}

// ─── Core calculations ────────────────────────────────────────────────────────

/** Required Saudization % to reach a given tier for `totalEmployees` workers. */
export function calcThreshold(
    tier: Exclude<NitaqatTier, 'red'>,
    totalEmployees: number,
): number {
    const { m, c } = TIER_CONSTANTS[tier];
    return m * Math.log(Math.max(totalEmployees, 1)) + c;
}

/** Weighted Saudi headcount per 2026 counting rules. */
export function calcWeightedSaudi(w: WorkforceInput): number {
    const cap = Math.floor(w.totalEmployees * MAX_SPECIAL_NEEDS_FRAC);
    return (
        w.saudiRegular       * 1.0 +
        w.saudiLowSalary     * 0.5 +
        w.saudiStudents      * 0.5 +
        Math.min(w.saudiSpecialNeeds, cap) * 4.0
    );
}

/** Saudization % (weighted). */
export function calcSaudizationPct(weightedSaudi: number, total: number): number {
    return total > 0 ? (weightedSaudi / total) * 100 : 0;
}

/** Determine current Nitaqat tier. */
export function getTier(saudizationPct: number, totalEmployees: number): NitaqatTier {
    for (const tier of TIER_ORDER.filter(t => t !== 'red') as Exclude<NitaqatTier, 'red'>[]) {
        if (saudizationPct >= calcThreshold(tier, totalEmployees)) return tier;
    }
    return 'red';
}

/** Is `a` at least as good as `b`? */
export function tierGte(a: NitaqatTier, b: NitaqatTier): boolean {
    return TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b);
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimulationResult {
    newTotal:        number;
    newWeightedPct:  number;
    newTier:         NitaqatTier;
    tierChanged:     boolean;
    tierDropped:     boolean;
}

/** Simulate adding `plannedExpats` without adding any new Saudi hires. */
export function simulateExpats(
    currentWeighted: number,
    currentTotal:    number,
    currentTier:     NitaqatTier,
    plannedExpats:   number,
): SimulationResult {
    const newTotal       = currentTotal + plannedExpats;
    const newWeightedPct = calcSaudizationPct(currentWeighted, newTotal);
    const newTier        = getTier(newWeightedPct, newTotal);
    return {
        newTotal,
        newWeightedPct,
        newTier,
        tierChanged: newTier !== currentTier,
        tierDropped: TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier),
    };
}

/**
 * Saudi hires (at weight 1.0, i.e. salary ≥ SAR 4 000) needed
 * to maintain `targetTier` after adding `plannedExpats`.
 */
export function calcCorrectionSaudis(
    currentWeighted: number,
    newTotal:        number,
    targetTier:      Exclude<NitaqatTier, 'red'>,
): number {
    const requiredPct      = calcThreshold(targetTier, newTotal);
    const requiredWeighted = (requiredPct / 100) * newTotal;
    return Math.max(0, Math.ceil(requiredWeighted - currentWeighted));
}

/**
 * Maximum additional expat hires before dropping below `tier`.
 * Iterates up to 200.
 */
export function maxExpatsBeforeDrop(
    weightedSaudi:  number,
    currentTotal:   number,
    tier:           Exclude<NitaqatTier, 'red'>,
): number {
    let max = 0;
    for (let n = 1; n <= 200; n++) {
        const total = currentTotal + n;
        const pct   = calcSaudizationPct(weightedSaudi, total);
        if (pct < calcThreshold(tier, total)) break;
        max = n;
    }
    return max;
}

// ─── Gauge helpers ────────────────────────────────────────────────────────────

/** Map Saudization % to SVG rotation in degrees.
 *  LTR: -90° = left (0%), +90° = right (GAUGE_MAX_PCT%).
 *  RTL: reversed. */
export function toNeedleRotation(saudizationPct: number, isAr: boolean): number {
    const norm = Math.max(0, Math.min(1, saudizationPct / GAUGE_MAX_PCT));
    return isAr ? 90 - norm * 180 : norm * 180 - 90;
}

/** Convert SVG needle rotation (degrees) back to the gauge arc angle (math degrees). */
export function needleRotToMathAngle(svgRot: number): number {
    return 90 - svgRot;
}
