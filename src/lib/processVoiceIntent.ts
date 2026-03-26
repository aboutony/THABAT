/**
 * processVoiceIntent — Phase 13: Intent Engine
 *
 * Keyword-based intent mapper. Handles both English and Arabic transcripts.
 * Designed to be swapped for a live LLM endpoint in a future phase.
 */

export type VoiceIntent =
    | 'FINANCIAL_HEALTH'
    | 'COMPLIANCE_STATUS'
    | 'OPERATIONAL_FRICTION'
    | 'RETENTION_RISK'
    | 'UNKNOWN';

// ── Intent → route mapping ─────────────────────────────────────────────────────
// Values are locale-relative (prepend /${locale}/ at call site)
export const INTENT_ROUTE: Record<VoiceIntent, string | null> = {
    FINANCIAL_HEALTH:     '/analytics/sales-report',
    COMPLIANCE_STATUS:    '/analytics/nitaqat',
    OPERATIONAL_FRICTION: '/analytics/efficiency-report',
    RETENTION_RISK:       '/analytics/retention',
    UNKNOWN:              null,
};

// ── Keyword map ───────────────────────────────────────────────────────────────
// Each entry lists EN + AR keywords so the mapper is language-agnostic.
const INTENT_MAP: Array<{ intent: VoiceIntent; keywords: string[] }> = [
    {
        intent: 'FINANCIAL_HEALTH',
        keywords: [
            'margin', 'money', 'profit', 'revenue', 'cash', 'financial', 'income',
            'هامش', 'مال', 'ربح', 'إيرادات', 'نقدية', 'مالي', 'دخل',
        ],
    },
    {
        intent: 'COMPLIANCE_STATUS',
        keywords: [
            'saudi', 'nitaqat', 'labor', 'labour', 'saudization', 'compliance',
            'workforce', 'employee', 'hiring',
            'نطاقات', 'سعودة', 'عمالة', 'توطين', 'موظف', 'امتثال', 'تعيين',
        ],
    },
    {
        intent: 'OPERATIONAL_FRICTION',
        keywords: [
            'bottleneck', 'delay', 'legal', 'friction', 'stuck', 'slow',
            'manufacturing', 'logistics', 'blocked', 'efficiency', 'operation',
            'اختناق', 'تأخير', 'قانوني', 'احتكاك', 'بطيء', 'تصنيع', 'لوجستيات', 'كفاءة',
        ],
    },
    {
        intent: 'RETENTION_RISK',
        keywords: [
            'client', 'risk', 'leaving', 'churn', 'retention', 'customer',
            'who is', 'at risk', 'health',
            'عميل', 'مخاطر', 'مغادر', 'احتفاظ', 'زبون', 'صحة',
        ],
    },
];

// ── Processor ─────────────────────────────────────────────────────────────────

export function processVoiceIntent(transcript: string): VoiceIntent {
    const lower = transcript.toLowerCase();
    for (const { intent, keywords } of INTENT_MAP) {
        if (keywords.some(kw => lower.includes(kw))) {
            return intent;
        }
    }
    return 'UNKNOWN';
}
