/**
 * THABAT Revenue Forecast Engine
 *
 * Generates 6-month predictive scenarios for the Sales Intelligence module.
 *
 * Scenarios
 * ─────────
 *   Bear  : 62% of base projection — adverse conditions (demand slump / supply issues)
 *   Base  : Volume-adjusted baseline with 2% monthly organic growth
 *   Bull  : 138% of base projection — optimistic (follow-on orders / price uplift)
 *
 * Cost Model (Medical Manufacturing)
 * ────────────────────────────────────
 *   Variable costs : 72% of volume-adjusted revenue (COGS + direct labour)
 *   Fixed overhead : 10% of base revenue (facilities, compliance, staff)
 *
 * Margin Risk
 * ───────────
 *   A month is flagged `marginRisk` when the Bear scenario gross margin
 *   falls below MARGIN_WARNING_THRESHOLD (12%).
 *   The agentic alert bar reads `marginRiskMonths` to determine severity.
 */

const BEAR_FACTOR              = 0.62;
const BULL_FACTOR              = 1.38;
const MONTHLY_GROWTH           = 0.02;   // 2 % organic growth per month
const VARIABLE_COST_RATE       = 0.72;   // 72 % of revenue = variable costs
const FIXED_COST_RATIO         = 0.10;   // 10 % of base revenue = fixed overhead
const MARGIN_WARNING_THRESHOLD = 0.12;   // < 12 % margin → margin risk

const AR_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface ForecastMonth {
    monthLabel:   string;   // e.g. "Apr"
    monthLabelAr: string;   // e.g. "أبريل"
    bear:         number;
    base:         number;
    bull:         number;
    marginRisk:   boolean;  // true when bear margin < MARGIN_WARNING_THRESHOLD
}

export interface ForecastResult {
    months:           ForecastMonth[];
    worstBear:        number;   // SAR — lowest bear projection across all months
    peakBull:         number;   // SAR — highest bull projection across all months
    marginRiskMonths: number;   // count of at-risk months
    overallTrend:     'improving' | 'flat' | 'declining';
}

export function getRevenueForecast(
    baseRevenue:      number,
    volumeMultiplier: number,
    projectionMonths  = 6,
): ForecastResult {
    const factor          = volumeMultiplier / 100;
    const adjustedBase    = baseRevenue * factor;
    const fixedCosts      = baseRevenue * FIXED_COST_RATIO;

    const today  = new Date();
    const months: ForecastMonth[] = [];

    for (let i = 0; i < projectionMonths; i++) {
        const date         = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthLabel   = date.toLocaleDateString('en-US', { month: 'short' });
        const monthLabelAr = AR_MONTHS[date.getMonth()];

        // Base projection compounds 2 % monthly growth
        const base = adjustedBase * Math.pow(1 + MONTHLY_GROWTH, i);
        const bear = base * BEAR_FACTOR;
        const bull = base * BULL_FACTOR;

        // Margin risk evaluated on the Bear scenario
        const bearExpenses  = bear * VARIABLE_COST_RATE + fixedCosts;
        const bearMargin    = bear > 0 ? (bear - bearExpenses) / bear : -1;
        const marginRisk    = bearMargin < MARGIN_WARNING_THRESHOLD;

        months.push({ monthLabel, monthLabelAr, bear, base, bull, marginRisk });
    }

    const worstBear        = Math.min(...months.map(m => m.bear));
    const peakBull         = Math.max(...months.map(m => m.bull));
    const marginRiskMonths = months.filter(m => m.marginRisk).length;

    const firstBase    = months[0].base;
    const lastBase     = months[months.length - 1].base;
    const growthRate   = (lastBase - firstBase) / firstBase;
    const overallTrend = growthRate > 0.05 ? 'improving' : growthRate < -0.05 ? 'declining' : 'flat';

    return { months, worstBear, peakBull, marginRiskMonths, overallTrend };
}

/** Format SAR in abbreviated form: 1,050,000 → "1.05M" */
export function formatSARShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
    return n.toFixed(0);
}
