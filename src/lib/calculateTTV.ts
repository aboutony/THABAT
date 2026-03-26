/**
 * calculateTTV — Time-to-Value Friction Engine  (Phase 11)
 *
 * Tracks delta between each process stage's baseline duration and its
 * current measured duration. The friction ratio drives blip placement on
 * the EfficiencyRadar: a ratio of 1.0 (on time) places the blip at the
 * outer ring; a ratio ≥ 2.0 (double baseline) collapses it to the centre.
 *
 * Quadrant layout (clockwise from top-right):
 *   Sales → 45°  |  Legal → 135°  |  Manufacturing → 225°  |  Logistics → 315°
 */

export type StageKey = 'sales' | 'legal' | 'manufacturing' | 'logistics';

export interface TTVStage {
    key:           StageKey;
    label:         { en: string; ar: string };
    /** Baseline process duration in hours */
    baselineHours: number;
    /** Actual / current measured duration in hours */
    currentHours:  number;
    /** Clockwise degrees from north; used to place blip in SVG space */
    quadrantAngle: number;
}

export interface TTVResult extends TTVStage {
    /** currentHours / baselineHours — 1.0 = on target */
    frictionRatio:  number;
    /** currentHours - baselineHours */
    delayHours:     number;
    severity:       'low' | 'medium' | 'high';
    /** Hex colour for the blip and its glow */
    color:          string;
    /**
     * Fraction of radar radius (0 = centre / max friction, 1 = outer ring / no friction).
     * Formula: position = clamp(0.85 - (frictionRatio - 1) * 0.75, 0.10, 0.85)
     */
    radarPosition:  number;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
// Swap with real API data once Phase 11 backend is live.

const STAGES: TTVStage[] = [
    {
        key:           'sales',
        label:         { en: 'Sales', ar: 'المبيعات' },
        baselineHours: 48,
        currentHours:  52,
        quadrantAngle: 45,
    },
    {
        key:           'legal',
        label:         { en: 'Legal', ar: 'القانونية' },
        baselineHours: 24,
        currentHours:  72,   // 3× baseline → high friction → near centre
        quadrantAngle: 135,
    },
    {
        key:           'manufacturing',
        label:         { en: 'Mfg', ar: 'التصنيع' },
        baselineHours: 168,
        currentHours:  185,
        quadrantAngle: 225,
    },
    {
        key:           'logistics',
        label:         { en: 'Logistics', ar: 'اللوجستيات' },
        baselineHours: 48,
        currentHours:  72,   // 1.5× baseline → medium-high friction
        quadrantAngle: 315,
    },
];

// ── Core function ─────────────────────────────────────────────────────────────

export function calculateTTV(stages: TTVStage[] = STAGES): TTVResult[] {
    return stages.map(stage => {
        const frictionRatio = stage.currentHours / stage.baselineHours;
        const delayHours    = stage.currentHours - stage.baselineHours;

        let severity: TTVResult['severity'];
        let color:    string;

        if (frictionRatio < 1.2) {
            severity = 'low';
            color    = '#4ADE80'; // emerald — on track
        } else if (frictionRatio < 1.5) {
            severity = 'medium';
            color    = '#F59E0B'; // amber — watch
        } else {
            severity = 'high';
            color    = '#F87171'; // red — action required
        }

        // Map friction ratio → radar distance from centre
        // ratio=1.0 → 0.85 (outer),  ratio≥2.0 → 0.10 (near centre)
        const frictionExcess = Math.min(Math.max(frictionRatio - 1, 0), 1);
        const radarPosition  = Math.max(0.85 - frictionExcess * 0.75, 0.10);

        return { ...stage, frictionRatio, delayHours, severity, color, radarPosition };
    });
}

// Pre-computed results (used by components that don't need reactivity)
export const TTV_RESULTS = calculateTTV();

// Convenience: look up a single stage by key
export function getTTVStage(key: StageKey): TTVResult {
    return TTV_RESULTS.find(r => r.key === key)!;
}
