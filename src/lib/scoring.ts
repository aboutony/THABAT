/**
 * THABAT Stability Score Engine v2 — Calibrated
 *
 * Base Weights:
 *   Liquidity   : 30%
 *   Margins     : 25%
 *   Receivables : 15%
 *   Costs       : 15%
 *   Revenue     : 15%
 *
 * Calibration layers:
 *   1. Industry profile weight multipliers
 *   2. Revenue band volatility thresholds + score floors
 *   3. Growth stage leniency factors
 *   4. EMA-based volatility smoothing for trajectory
 */

import {
    getIndustryProfile,
    getRevenueBand,
    getGrowthStage,
} from './taxonomy';

export interface RawMetrics {
    cash: number;
    revenue: number;
    expenses: number;
    receivables: number;
    payables: number;
}

export interface CalibrationProfile {
    industryCode?: string | null;
    revenueBand?: string | null;
    growthStage?: string | null;
}

export interface ScoreBreakdown {
    liquidity: number;
    margins: number;
    receivables: number;
    costs: number;
    revenue: number;
    overall: number;
    trend: 'strengthening' | 'stable' | 'weakening';
    delta: number;
    drivers: DriverInsight[];
    calibration: {
        industry: string;
        revenueBand: string;
        growthStage: string;
    };
}

export interface DriverInsight {
    key: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    impact: 'positive' | 'negative' | 'neutral';
}

const BASE_WEIGHTS = {
    liquidity: 0.30,
    margins: 0.25,
    receivables: 0.15,
    costs: 0.15,
    revenue: 0.15,
};

// ---- Sub-Score Calculations ----

function scoreLiquidity(cash: number, expenses: number): number {
    const monthlyExpenses = expenses > 0 ? expenses : 1;
    const runwayMonths = cash / monthlyExpenses;
    return clamp((runwayMonths / 12) * 100, 0, 100);
}

function scoreMargins(revenue: number, expenses: number): number {
    if (revenue <= 0) return 0;
    const marginPct = ((revenue - expenses) / revenue) * 100;
    return clamp((marginPct / 40) * 100, 0, 100);
}

function scoreReceivables(receivables: number, revenue: number): number {
    if (revenue <= 0) return receivables > 0 ? 0 : 50;
    const ratio = receivables / revenue;
    return clamp((1 - ratio) * 100, 0, 100);
}

function scoreCosts(expenses: number, revenue: number): number {
    if (revenue <= 0) return expenses > 0 ? 0 : 50;
    const ratio = expenses / revenue;
    return clamp(((1 - ratio) / 0.5) * 100, 0, 100);
}

function scoreRevenue(revenue: number, expenses: number): number {
    if (revenue <= 0) return 0;
    const coverageRatio = revenue / Math.max(expenses, 1);
    return clamp(coverageRatio * 50, 0, 100);
}

// ---- Calibrated Weight Computation ----

function getCalibratedWeights(profile: CalibrationProfile) {
    const industry = getIndustryProfile(profile.industryCode);
    const cal = industry.weightCalibration;

    // Apply industry multipliers to base weights
    const raw = {
        liquidity: BASE_WEIGHTS.liquidity * cal.liquidity,
        margins: BASE_WEIGHTS.margins * cal.margins,
        receivables: BASE_WEIGHTS.receivables * cal.receivables,
        costs: BASE_WEIGHTS.costs * cal.costs,
        revenue: BASE_WEIGHTS.revenue * cal.revenue,
    };

    // Re-normalize to sum = 1.0
    const total = raw.liquidity + raw.margins + raw.receivables + raw.costs + raw.revenue;
    return {
        liquidity: raw.liquidity / total,
        margins: raw.margins / total,
        receivables: raw.receivables / total,
        costs: raw.costs / total,
        revenue: raw.revenue / total,
    };
}

// ---- EMA Trajectory Detection (Volatility Smoothed) ----

/**
 * Exponential Moving Average with adaptive threshold.
 * Uses EMA (α = 0.2) instead of simple average for smoothing.
 * Threshold is calibrated per revenue band.
 */
export function detectTrajectory(
    currentScore: number,
    historicalScores: number[],
    revenueBand?: string | null
): { trend: 'strengthening' | 'stable' | 'weakening'; delta: number } {
    if (historicalScores.length === 0) return { trend: 'stable', delta: 0 };

    const band = getRevenueBand(revenueBand);
    const threshold = band.volatilityThreshold;

    // Compute EMA (α = 0.2, more recent data weighted heavier)
    const alpha = 0.2;
    let ema = historicalScores[historicalScores.length - 1]; // oldest first
    for (let i = historicalScores.length - 2; i >= 0; i--) {
        ema = alpha * historicalScores[i] + (1 - alpha) * ema;
    }

    const delta = currentScore - ema;

    if (delta >= threshold) return { trend: 'strengthening', delta: Math.round(delta * 10) / 10 };
    if (delta <= -threshold) return { trend: 'weakening', delta: Math.round(delta * 10) / 10 };
    return { trend: 'stable', delta: Math.round(delta * 10) / 10 };
}

// ---- Main Scoring Function (Calibrated) ----

export function calculateStabilityScore(
    metrics: RawMetrics,
    historicalScores: number[] = [],
    profile: CalibrationProfile = {}
): ScoreBreakdown {
    const { cash, revenue, expenses, receivables } = metrics;
    const stage = getGrowthStage(profile.growthStage);

    // Calculate sub-scores
    let liquidityScore = scoreLiquidity(cash, expenses);
    let marginsScore = scoreMargins(revenue, expenses);
    let receivablesScore = scoreReceivables(receivables, revenue);
    let costsScore = scoreCosts(expenses, revenue);
    let revenueScore = scoreRevenue(revenue, expenses);

    // Apply growth stage leniency to low sub-scores
    // Leniency only boosts scores below 50 to reduce penalty severity
    if (stage.leniencyFactor > 1.0) {
        const applyLeniency = (score: number) =>
            score < 50 ? Math.min(50, score * stage.leniencyFactor) : score;
        liquidityScore = applyLeniency(liquidityScore);
        marginsScore = applyLeniency(marginsScore);
        receivablesScore = applyLeniency(receivablesScore);
        costsScore = applyLeniency(costsScore);
        revenueScore = applyLeniency(revenueScore);
    }

    // Apply calibrated weights
    const weights = getCalibratedWeights(profile);
    let overall = Math.round(
        liquidityScore * weights.liquidity +
        marginsScore * weights.margins +
        receivablesScore * weights.receivables +
        costsScore * weights.costs +
        revenueScore * weights.revenue
    );

    // Apply revenue band score floor
    const band = getRevenueBand(profile.revenueBand);
    overall = Math.max(overall, band.scoreFloor);
    overall = clamp(overall, 0, 100);

    // EMA trajectory
    const { trend, delta } = detectTrajectory(overall, historicalScores, profile.revenueBand);

    // Driver insights
    const drivers = buildDriverInsights(metrics, {
        liquidity: liquidityScore,
        margins: marginsScore,
        receivables: receivablesScore,
        costs: costsScore,
        revenue: revenueScore,
    });

    return {
        liquidity: Math.round(liquidityScore),
        margins: Math.round(marginsScore),
        receivables: Math.round(receivablesScore),
        costs: Math.round(costsScore),
        revenue: Math.round(revenueScore),
        overall,
        trend,
        delta,
        drivers,
        calibration: {
            industry: getIndustryProfile(profile.industryCode).code,
            revenueBand: band.code,
            growthStage: stage.code,
        },
    };
}

// ---- Driver Insights ----

function buildDriverInsights(
    metrics: RawMetrics,
    scores: Record<string, number>
): DriverInsight[] {
    const { cash, revenue, expenses, receivables } = metrics;
    const monthlyExpenses = expenses > 0 ? expenses : 1;
    const runway = cash / monthlyExpenses;
    const marginPct = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
    const collectionRatio = revenue > 0 ? (receivables / revenue) * 100 : 0;

    const drivers: DriverInsight[] = [
        {
            key: 'runway',
            value: `${runway.toFixed(1)}`,
            trend: runway >= 6 ? 'up' : runway >= 3 ? 'neutral' : 'down',
            impact: scores.liquidity >= 60 ? 'positive' : scores.liquidity >= 30 ? 'neutral' : 'negative',
        },
        {
            key: 'margin',
            value: `${marginPct.toFixed(1)}%`,
            trend: marginPct > 0 ? 'up' : marginPct === 0 ? 'neutral' : 'down',
            impact: scores.margins >= 60 ? 'positive' : scores.margins >= 30 ? 'neutral' : 'negative',
        },
        {
            key: 'collection',
            value: `${collectionRatio.toFixed(0)}%`,
            trend: collectionRatio <= 30 ? 'up' : collectionRatio <= 60 ? 'neutral' : 'down',
            impact: scores.receivables >= 60 ? 'positive' : scores.receivables >= 30 ? 'neutral' : 'negative',
        },
    ];

    const impactOrder = { negative: 0, neutral: 1, positive: 2 };
    drivers.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    return drivers.slice(0, 3);
}

// ---- Utilities ----

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function computeNormalizedMetrics(metrics: RawMetrics) {
    const { cash, revenue, expenses, receivables } = metrics;
    const monthlyExpenses = expenses > 0 ? expenses : 1;

    return {
        runway_months: parseFloat((cash / monthlyExpenses).toFixed(2)),
        burn_rate: parseFloat(expenses.toFixed(2)),
        margin_pct: revenue > 0
            ? parseFloat((((revenue - expenses) / revenue) * 100).toFixed(2))
            : 0,
        liquidity_ratio: parseFloat((cash / Math.max(expenses, 1)).toFixed(2)),
        collection_days: revenue > 0
            ? parseFloat(((receivables / revenue) * 30).toFixed(1))
            : 0,
    };
}

// ---- Explainability Engine: Consequence Statements ----

export interface ConsequenceInsight {
    metricKey: string;      // i18n key for the metric name
    consequenceKey: string; // i18n key for the consequence template
    severity: 'critical' | 'warning' | 'moderate';
    impactValue: string;    // interpolation value (e.g., "4.2%")
    score: number;          // the raw sub-score
}

/**
 * Identifies the lowest-scoring metric and generates an
 * 'Executive So-What' consequence statement.
 *
 * Rule: Don't just name the metric — state the business impact.
 */
export function generateConsequenceStatement(
    breakdown: ScoreBreakdown,
    metrics: RawMetrics
): ConsequenceInsight {
    const scores = [
        { key: 'liquidity', score: breakdown.liquidity },
        { key: 'margins', score: breakdown.margins },
        { key: 'receivables', score: breakdown.receivables },
        { key: 'costs', score: breakdown.costs },
        { key: 'revenue', score: breakdown.revenue },
    ];

    // Find the weakest metric
    scores.sort((a, b) => a.score - b.score);
    const weakest = scores[0];

    const severity: ConsequenceInsight['severity'] =
        weakest.score < 30 ? 'critical' : weakest.score < 50 ? 'warning' : 'moderate';

    // Compute contextual impact values
    const { cash, revenue, expenses, receivables } = metrics;
    let impactValue = '';

    switch (weakest.key) {
        case 'liquidity': {
            const runwayMonths = cash / Math.max(expenses, 1);
            impactValue = runwayMonths < 3
                ? `${runwayMonths.toFixed(1)}`
                : `${runwayMonths.toFixed(0)}`;
            break;
        }
        case 'margins': {
            const margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
            impactValue = `${Math.abs(margin).toFixed(1)}%`;
            break;
        }
        case 'receivables': {
            const daysOutstanding = revenue > 0 ? (receivables / revenue) * 30 : 0;
            impactValue = `${daysOutstanding.toFixed(0)}`;
            break;
        }
        case 'costs': {
            const costRatio = revenue > 0 ? (expenses / revenue) * 100 : 100;
            impactValue = `${costRatio.toFixed(1)}%`;
            break;
        }
        case 'revenue': {
            const coverage = revenue / Math.max(expenses, 1);
            impactValue = `${(coverage * 100).toFixed(0)}%`;
            break;
        }
    }

    return {
        metricKey: `scoring.${weakest.key}`,
        consequenceKey: `insight.consequence.${weakest.key}`,
        severity,
        impactValue,
        score: weakest.score,
    };
}
