/**
 * THABAT Industry Taxonomy
 *
 * Standardized classification system for SME benchmarking.
 * No hard-coded industry logic in the scoring engine —
 * industries only affect weight calibration profiles.
 */

export interface IndustryProfile {
    code: string;
    nameEN: string;
    nameAR: string;
    /** Weight overrides relative to base (1.0 = no change) */
    weightCalibration: {
        liquidity: number;
        margins: number;
        receivables: number;
        costs: number;
        revenue: number;
    };
}

/**
 * Standard industry taxonomy aligned with ISIC Rev.4 groupings
 * adapted for Saudi SME landscape.
 */
export const INDUSTRY_TAXONOMY: Record<string, IndustryProfile> = {
    RETAIL: {
        code: 'RETAIL',
        nameEN: 'Retail & E-Commerce',
        nameAR: 'تجارة التجزئة والتجارة الإلكترونية',
        weightCalibration: {
            liquidity: 1.1,    // Inventory-heavy → liquidity more critical
            margins: 0.9,      // Thin margins expected
            receivables: 0.8,  // Mostly cash/card sales
            costs: 1.1,        // COGS management critical
            revenue: 1.0,
        },
    },
    TECH: {
        code: 'TECH',
        nameEN: 'Technology & SaaS',
        nameAR: 'التكنولوجيا والبرمجيات',
        weightCalibration: {
            liquidity: 1.2,    // Burn-rate focused
            margins: 1.1,      // High-margin expected
            receivables: 1.0,
            costs: 0.8,        // Less cost-sensitive
            revenue: 1.2,      // Growth-driven
        },
    },
    MANUFACTURING: {
        code: 'MFG',
        nameEN: 'Manufacturing',
        nameAR: 'التصنيع',
        weightCalibration: {
            liquidity: 1.0,
            margins: 1.1,
            receivables: 1.2,  // Long payment cycles
            costs: 1.2,        // Material costs critical
            revenue: 0.8,
        },
    },
    SERVICES: {
        code: 'SVC',
        nameEN: 'Professional Services',
        nameAR: 'الخدمات المهنية',
        weightCalibration: {
            liquidity: 0.9,    // Low capital needs
            margins: 1.2,      // Margin is king
            receivables: 1.3,  // Delayed invoicing common
            costs: 0.9,
            revenue: 1.0,
        },
    },
    HOSPITALITY: {
        code: 'HOSP',
        nameEN: 'Hospitality & F&B',
        nameAR: 'الضيافة والأغذية',
        weightCalibration: {
            liquidity: 1.2,    // Cash-flow critical
            margins: 1.0,
            receivables: 0.7,  // Mostly cash
            costs: 1.3,        // Food cost / rent heavy
            revenue: 1.0,
        },
    },
    HEALTHCARE: {
        code: 'HC',
        nameEN: 'Healthcare',
        nameAR: 'الرعاية الصحية',
        weightCalibration: {
            liquidity: 1.0,
            margins: 1.0,
            receivables: 1.3,  // Insurance claim delays
            costs: 1.1,
            revenue: 0.9,
        },
    },
    CONSTRUCTION: {
        code: 'CONST',
        nameEN: 'Construction & Real Estate',
        nameAR: 'البناء والعقارات',
        weightCalibration: {
            liquidity: 1.3,    // Project-based cash flow
            margins: 1.0,
            receivables: 1.2,  // Milestone payments
            costs: 1.1,
            revenue: 0.7,      // Lumpy revenue
        },
    },
    LOGISTICS: {
        code: 'LOG',
        nameEN: 'Logistics & Transport',
        nameAR: 'الخدمات اللوجستية والنقل',
        weightCalibration: {
            liquidity: 1.1,
            margins: 1.0,
            receivables: 1.0,
            costs: 1.2,        // Fuel / fleet costs
            revenue: 1.0,
        },
    },
    OTHER: {
        code: 'OTH',
        nameEN: 'Other',
        nameAR: 'أخرى',
        weightCalibration: {
            liquidity: 1.0,
            margins: 1.0,
            receivables: 1.0,
            costs: 1.0,
            revenue: 1.0,
        },
    },
};

/**
 * Revenue Band Definitions
 * Each band has a scaling factor for score calibration.
 */
export interface RevenueBandProfile {
    code: string;
    labelEN: string;
    labelAR: string;
    /** Noise tolerance: smaller bands tolerate less volatility */
    volatilityThreshold: number;
    /** Score floor: minimum credible score for the band */
    scoreFloor: number;
}

export const REVENUE_BANDS: Record<string, RevenueBandProfile> = {
    '0-1m': {
        code: '0-1m',
        labelEN: '0 – 1M SAR',
        labelAR: '٠ – ١ مليون ريال',
        volatilityThreshold: 8,   // High tolerance (noisy data)
        scoreFloor: 10,
    },
    '1-5m': {
        code: '1-5m',
        labelEN: '1M – 5M SAR',
        labelAR: '١ – ٥ مليون ريال',
        volatilityThreshold: 5,
        scoreFloor: 15,
    },
    '5-20m': {
        code: '5-20m',
        labelEN: '5M – 20M SAR',
        labelAR: '٥ – ٢٠ مليون ريال',
        volatilityThreshold: 4,
        scoreFloor: 20,
    },
    '20-50m': {
        code: '20-50m',
        labelEN: '20M – 50M SAR',
        labelAR: '٢٠ – ٥٠ مليون ريال',
        volatilityThreshold: 3,
        scoreFloor: 20,
    },
    '50m+': {
        code: '50m+',
        labelEN: '50M+ SAR',
        labelAR: '+٥٠ مليون ريال',
        volatilityThreshold: 2,   // Low tolerance (stable data expected)
        scoreFloor: 25,
    },
};

/**
 * Growth Stage Definitions
 * Adjusts how aggressively the scoring penalizes metrics.
 */
export interface GrowthStageProfile {
    code: string;
    labelEN: string;
    labelAR: string;
    /** Factor applied to "negative" sub-scores. >1 = more forgiving */
    leniencyFactor: number;
}

export const GROWTH_STAGES: Record<string, GrowthStageProfile> = {
    startup: {
        code: 'startup',
        labelEN: 'Startup / Seed',
        labelAR: 'ناشئة / بذرة',
        leniencyFactor: 1.25,  // More forgiving of low margins / high burn
    },
    growth: {
        code: 'growth',
        labelEN: 'Growth',
        labelAR: 'نمو',
        leniencyFactor: 1.1,
    },
    mature: {
        code: 'mature',
        labelEN: 'Mature / Stable',
        labelAR: 'ناضجة / مستقرة',
        leniencyFactor: 1.0,
    },
    turnaround: {
        code: 'turnaround',
        labelEN: 'Turnaround',
        labelAR: 'إعادة هيكلة',
        leniencyFactor: 1.15,
    },
};

/**
 * Resolve the industry code to a profile. Falls back to OTHER.
 */
export function getIndustryProfile(industryCode?: string | null): IndustryProfile {
    if (!industryCode) return INDUSTRY_TAXONOMY.OTHER;
    const upper = industryCode.toUpperCase();
    return INDUSTRY_TAXONOMY[upper] || INDUSTRY_TAXONOMY.OTHER;
}

export function getRevenueBand(bandCode?: string | null): RevenueBandProfile {
    if (!bandCode) return REVENUE_BANDS['0-1m'];
    return REVENUE_BANDS[bandCode] || REVENUE_BANDS['0-1m'];
}

export function getGrowthStage(stageCode?: string | null): GrowthStageProfile {
    if (!stageCode) return GROWTH_STAGES.mature;
    return GROWTH_STAGES[stageCode] || GROWTH_STAGES.mature;
}
