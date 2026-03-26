/**
 * calculateClientHealth — Phase 12: Churn Sentinel
 *
 * Weighted health score (0–100) for each major client:
 *   Revenue Velocity  40%  — month-over-month order volume trend
 *   Payment Hygiene   40%  — average days past invoice due date
 *   Engagement        20%  — interaction frequency (mocked for Phase 12)
 *
 * A score < 60 marks the client as at-risk (amber, flickering star).
 * A score < 40 marks critical churn risk (red).
 */

export interface ClientRecord {
    id:             string;
    name:           { en: string; ar: string };
    /** Annual Contract Value in SAR */
    acv:            number;
    /**
     * Monthly order volumes in SAR, most-recent first (3 months).
     * Used to compute MoM revenue velocity.
     */
    monthlyOrders:  [number, number, number];
    /** Average days overdue across all open invoices (0 = always on time) */
    avgDaysOverdue: number;
    /**
     * Engagement score 0–100 (mocked).
     * Tracks meeting frequency, portal logins, response time.
     */
    engagementScore: number;
    /** Constellation SVG position (pre-set per client) */
    starX: number;
    starY: number;
}

export interface ClientHealthResult extends ClientRecord {
    revenueVelocityScore: number;   // 0–100
    paymentScore:         number;   // 0–100
    healthScore:          number;   // 0–100 weighted composite
    riskLevel:            'healthy' | 'watch' | 'at-risk' | 'critical';
    color:                string;
    /** True when health < 60 → star flickers amber on the constellation */
    isFlickering:         boolean;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const CLIENTS: ClientRecord[] = [
    {
        id: 'moh',
        name: { en: 'Ministry of Health', ar: 'وزارة الصحة' },
        acv: 2100000,
        monthlyOrders: [178000, 175000, 172000],  // steady growth
        avgDaysOverdue: 7,
        engagementScore: 88,
        starX: 155, starY: 38,
    },
    {
        id: 'nupco',
        name: { en: 'NUPCO', ar: 'نوبكو' },
        acv: 1053000,
        monthlyOrders: [89000, 87500, 86000],     // healthy growth
        avgDaysOverdue: 5,
        engagementScore: 91,
        starX: 48, starY: 28,
    },
    {
        id: 'ng-health',
        name: { en: 'National Guard Health', ar: 'صحة الحرس الوطني' },
        acv: 980000,
        monthlyOrders: [78000, 80000, 79000],     // flat
        avgDaysOverdue: 14,
        engagementScore: 70,
        starX: 108, starY: 62,
    },
    {
        id: 'kfsh',
        name: { en: 'King Faisal Specialist', ar: 'الملك فيصل التخصصي' },
        acv: 1350000,
        monthlyOrders: [82000, 95000, 112000],    // declining (recent is lowest)
        avgDaysOverdue: 22,
        engagementScore: 42,
        starX: 248, starY: 55,
    },
    {
        id: 'sgh',
        name: { en: 'Saudi German Hospital', ar: 'السعودي الألماني' },
        acv: 890000,
        monthlyOrders: [54000, 61000, 72000],     // significant decline
        avgDaysOverdue: 18,
        engagementScore: 48,
        starX: 72, starY: 94,
    },
    {
        id: 'al-rajhi-medical',
        name: { en: 'Al Rajhi Medical', ar: 'مستشفى الراجحي' },
        acv: 720000,
        monthlyOrders: [42000, 55000, 68000],     // sharp decline
        avgDaysOverdue: 31,
        engagementScore: 35,
        starX: 192, starY: 102,
    },
    {
        id: 'al-bilad',
        name: { en: 'Al-Bilad Hospital', ar: 'مستشفى البلاد' },
        acv: 540000,
        monthlyOrders: [28000, 38000, 46000],     // sharp decline
        avgDaysOverdue: 38,
        engagementScore: 28,
        starX: 296, starY: 88,
    },
];

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Revenue Velocity Score (0–100)
 * Measures trend from oldest → newest order volume.
 * +5% growth → ~60,  +15% → ~80,  −15% → ~20, −30% → ~0
 */
function revenueVelocityScore(orders: [number, number, number]): number {
    const [recent, , oldest] = orders;
    if (oldest === 0) return 50;
    const growthPct = ((recent - oldest) / oldest) * 100;   // % MoM swing
    const score = 50 + growthPct * 1.5;                     // 1.5× sensitivity
    return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Payment Hygiene Score (0–100)
 * 0 days overdue → 100,  30 days → 25,  40+ days → 0
 */
function paymentScore(avgDaysOverdue: number): number {
    return Math.round(Math.max(0, 100 - avgDaysOverdue * 2.5));
}

// ── Core function ─────────────────────────────────────────────────────────────

export function calculateClientHealth(
    clients: ClientRecord[] = CLIENTS,
): ClientHealthResult[] {
    return clients.map(client => {
        const rvScore  = revenueVelocityScore(client.monthlyOrders);
        const pyScore  = paymentScore(client.avgDaysOverdue);
        const engScore = client.engagementScore;

        const health = Math.round(
            rvScore  * 0.40 +
            pyScore  * 0.40 +
            engScore * 0.20,
        );

        let riskLevel: ClientHealthResult['riskLevel'];
        let color: string;

        if (health >= 70) {
            riskLevel = 'healthy'; color = '#4ADE80';  // emerald
        } else if (health >= 60) {
            riskLevel = 'watch';   color = '#FDE68A';  // pale yellow
        } else if (health >= 40) {
            riskLevel = 'at-risk'; color = '#F59E0B';  // amber
        } else {
            riskLevel = 'critical'; color = '#F87171'; // red
        }

        return {
            ...client,
            revenueVelocityScore: rvScore,
            paymentScore:         pyScore,
            healthScore:          health,
            riskLevel,
            color,
            isFlickering:         health < 60,
        };
    });
}

// ── Convenience exports ───────────────────────────────────────────────────────

/** Pre-computed results for components that don't need reactivity */
export const CLIENT_HEALTH_RESULTS = calculateClientHealth();

/** True if any client has health < 60 (drives Oracle retention risk) */
export function hasRetentionRisk(): boolean {
    return CLIENT_HEALTH_RESULTS.some(c => c.isFlickering);
}

/** Returns at-risk clients sorted by health score ascending (worst first) */
export function getAtRiskClients(): ClientHealthResult[] {
    return CLIENT_HEALTH_RESULTS
        .filter(c => c.isFlickering)
        .sort((a, b) => a.healthScore - b.healthScore);
}

/** Max ACV across all clients — used for star size normalisation */
export const MAX_CLIENT_ACV = Math.max(...CLIENTS.map(c => c.acv));
