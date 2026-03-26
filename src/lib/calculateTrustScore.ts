// ── Supplier Trust Shield scoring ────────────────────────────────────────────
// Formula: baseScore = (onTimeRate × 0.6 + qualityCompliance × 0.4) / 20
// Friction penalty: processing friction days reduce the base score
// finalScore = baseScore × (1 − frictionDays/windowDays × 0.5)    [0–5 scale]

export interface SupplierInput {
    /** Delivery on-time rate 0–100 */
    onTimeRate:              number;
    /** Quality / regulatory compliance 0–100 */
    qualityCompliance:       number;
    /** Pre-port processing friction days (from LeadTimePulse friction zones) */
    processingFrictionDays:  number;
    /** Reference window for friction normalisation (default 30) */
    windowDays?:             number;
}

export function calculateTrustScore(input: SupplierInput): number {
    const { onTimeRate, qualityCompliance, processingFrictionDays, windowDays = 30 } = input;
    const baseScore        = (onTimeRate * 0.6 + qualityCompliance * 0.4) / 20;
    const frictionPenalty  = (processingFrictionDays / windowDays) * 0.5;
    return Math.max(0, Math.min(5, baseScore * (1 - frictionPenalty)));
}

// ── Trust band ────────────────────────────────────────────────────────────────
export type TrustBand = 'emerald' | 'gold' | 'crimson';

export function getTrustBand(score: number): TrustBand {
    if (score >= 4.5) return 'emerald';
    if (score >= 3.0) return 'gold';
    return 'crimson';
}

export const TRUST_COLORS: Record<TrustBand, string> = {
    emerald: '#15803D',
    gold:    '#D4AF37',
    crimson: '#DC2626',
};

// ── Supplier type ─────────────────────────────────────────────────────────────
export interface Supplier {
    id:                     string;
    name:                   string;
    nameAr:                 string;
    country:                string;
    countryAr:              string;
    city:                   string;
    cityAr:                 string;
    onTimeRate:             number;
    qualityCompliance:      number;
    processingFrictionDays: number;
    trustScore:             number;
    band:                   TrustBand;
    /** Linked shipment ID from Nerve Center */
    shipmentId?:            string;
    isSaudi?:               boolean;
}

function mkSupplier(
    base: Omit<Supplier, 'trustScore' | 'band'>,
): Supplier {
    const raw  = calculateTrustScore({
        onTimeRate:             base.onTimeRate,
        qualityCompliance:      base.qualityCompliance,
        processingFrictionDays: base.processingFrictionDays,
    });
    const trustScore = Math.round(raw * 100) / 100;
    return { ...base, trustScore, band: getTrustBand(trustScore) };
}

// ── UNIMED primary suppliers (matched to Nerve Center shipments) ──────────────
export const DEMO_SUPPLIERS: Supplier[] = [
    mkSupplier({
        id: 'SUP-001', shipmentId: 'SHP-2841',
        name: 'Siemens Healthineers',   nameAr: 'سيمنس هيلث إنيرز',
        country: 'Germany',             countryAr: 'ألمانيا',
        city: 'Hamburg',                cityAr: 'هامبورغ',
        onTimeRate: 82, qualityCompliance: 95, processingFrictionDays: 3,
    }),
    mkSupplier({
        id: 'SUP-002', shipmentId: 'SHP-2840',
        name: 'Shanghai MedTech',       nameAr: 'شنغهاي ميدتك',
        country: 'China',               countryAr: 'الصين',
        city: 'Shanghai',               cityAr: 'شنغهاي',
        onTimeRate: 58, qualityCompliance: 72, processingFrictionDays: 8,
    }),
    mkSupplier({
        id: 'SUP-003', shipmentId: 'SHP-2838',
        name: 'Medline Industries',     nameAr: 'ميدلاين إندستريز',
        country: 'USA',                 countryAr: 'الولايات المتحدة',
        city: 'Boston',                 cityAr: 'بوسطن',
        onTimeRate: 94, qualityCompliance: 98, processingFrictionDays: 1,
    }),
    mkSupplier({
        id: 'SUP-004', shipmentId: 'SHP-2836',
        name: 'Sartorius AG',           nameAr: 'سارتوريوس',
        country: 'Germany',             countryAr: 'ألمانيا',
        city: 'Stuttgart',              cityAr: 'شتوتغارت',
        onTimeRate: 88, qualityCompliance: 91, processingFrictionDays: 2,
    }),
];

// ── Saudi alternative suppliers (shown in Local Sourcing overlay) ─────────────
export const SAUDI_ALTERNATIVES: Supplier[] = [
    mkSupplier({
        id: 'SAU-001', isSaudi: true,
        name: 'Saudi German Hospital Group',          nameAr: 'المجموعة السعودية الألمانية للمستشفيات',
        country: 'Saudi Arabia',                       countryAr: 'المملكة العربية السعودية',
        city: 'Jeddah',                                cityAr: 'جدة',
        onTimeRate: 91, qualityCompliance: 89, processingFrictionDays: 0,
    }),
    mkSupplier({
        id: 'SAU-002', isSaudi: true,
        name: 'Advanced Medical Technology Co.',      nameAr: 'شركة التقنية الطبية المتقدمة',
        country: 'Saudi Arabia',                       countryAr: 'المملكة العربية السعودية',
        city: 'Riyadh',                                cityAr: 'الرياض',
        onTimeRate: 87, qualityCompliance: 94, processingFrictionDays: 1,
    }),
];

/** Primary supplier used on Nitaqat page for margin linkage widget */
export const PRIMARY_SUPPLIER = DEMO_SUPPLIERS[0]; // Siemens Healthineers
