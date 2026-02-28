/**
 * Locale formatting utilities for THABAT
 * Handles Arabic-Indic digit conversion and locale-aware number formatting
 */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert Western digits to Arabic-Indic digits
 * e.g., "123.4%" → "١٢٣.٤%"
 */
export function toArabicDigits(value: string | number): string {
    return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d)]);
}

/**
 * Format a number with locale-appropriate digits
 * In Arabic mode: converts to Arabic-Indic digits
 * In English mode: returns as-is
 */
export function formatNumber(value: number | string, locale: string): string {
    const str = String(value);
    return locale === 'ar' ? toArabicDigits(str) : str;
}

/**
 * Format a percentage with locale-appropriate digits
 * e.g., formatPercent(74.2, 'ar') → "٧٤.٢%"
 */
export function formatPercent(value: number, locale: string, decimals = 1): string {
    const formatted = `${value.toFixed(decimals)}%`;
    return locale === 'ar' ? toArabicDigits(formatted) : formatted;
}

/**
 * Format a score with locale-appropriate digits
 * e.g., formatScore(61.8, 'ar') → "٦١.٨"
 */
export function formatScore(value: number, locale: string): string {
    const str = typeof value === 'number'
        ? (Number.isInteger(value) ? String(value) : value.toFixed(1))
        : String(value);
    return locale === 'ar' ? toArabicDigits(str) : str;
}

/**
 * Map action_type DB constants to i18n keys
 */
export function localizeActionType(type: string, locale: string): string {
    const map: Record<string, Record<string, string>> = {
        metrics_ingestion: { en: 'Metrics Ingestion', ar: 'استيعاب المقاييس' },
        manual_entry: { en: 'Manual Entry', ar: 'إدخال يدوي' },
        erp_sync: { en: 'ERP Sync', ar: 'مزامنة ERP' },
        score_calculation: { en: 'Score Update', ar: 'تحديث المؤشر' },
    };
    const key = type.toLowerCase();
    return map[key]?.[locale] || map[key]?.en || type;
}

/**
 * Localize action notes from the DB
 * e.g., "Manual data entry for 2026-02-28" → "إدخال يدوي للبيانات بتاريخ ٢٠٢٦-٠٢-٢٨"
 */
export function localizeActionNote(note: string, locale: string): string {
    if (locale !== 'ar') return note;

    // Pattern: "Manual data entry for YYYY-MM-DD"
    const manualMatch = note.match(/^Manual data entry for (.+)$/);
    if (manualMatch) {
        return `إدخال يدوي للبيانات بتاريخ ${toArabicDigits(manualMatch[1])}`;
    }

    // Pattern: "ERP sync for YYYY-MM-DD"
    const syncMatch = note.match(/^ERP sync for (.+)$/);
    if (syncMatch) {
        return `مزامنة ERP بتاريخ ${toArabicDigits(syncMatch[1])}`;
    }

    // Fallback: convert any digits in the note
    return toArabicDigits(note);
}

/**
 * Score band labels localized
 */
export function getScoreBandLabel(band: string, locale: string): string {
    const map: Record<string, Record<string, string>> = {
        strong: { en: 'Strong (70+)', ar: 'قوي (٧٠+)' },
        moderate: { en: 'Moderate (40-69)', ar: 'متوسط (٤٠-٦٩)' },
        at_risk: { en: 'At Risk (<40)', ar: 'دائرة الخطر (<٤٠)' },
    };
    const key = band.toLowerCase().replace(/\s+/g, '_');
    return map[key]?.[locale] || band;
}
