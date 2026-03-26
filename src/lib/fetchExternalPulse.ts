/**
 * fetchExternalPulse — Phase 14: RealitySeed
 *
 * Mock aggregator for 3 external intelligence streams:
 *   • Regulatory — HRSD (Labor) & ZATCA (Tax)
 *   • Market     — Brent Oil / SAR-USD peg
 *   • Local      — Aramco / PIF / JCSA tender cycles
 *
 * Designed to be replaced with a live API layer in a future phase.
 * Sovereign Gold (#D4AF37) is the visual accent for all external data.
 */

export type PulseCategory = 'regulatory' | 'market' | 'local';
export type PulseSeverity = 'alert' | 'watch' | 'info';

export interface ExternalPulse {
    id:         string;
    category:   PulseCategory;
    severity:   PulseSeverity;
    sourceEn:   string;
    sourceAr:   string;
    headlineEn: string;
    headlineAr: string;
    bodyEn:     string;
    bodyAr:     string;
    timestamp:  string;   // ISO date string
    isNew:      boolean;  // triggers Globe pulse in Shell nav
}

// ── Mock pulse feed ────────────────────────────────────────────────────────────

const PULSE_FEED: ExternalPulse[] = [
    // ── Regulatory ────────────────────────────────────────────────────────────
    {
        id:         'hrsd-2026-q2-quota',
        category:   'regulatory',
        severity:   'alert',
        sourceEn:   'HRSD',
        sourceAr:   'وزارة الموارد البشرية',
        headlineEn: 'Nitaqat Quota Update Effective Q2 2026',
        headlineAr: 'تحديث حصص نطاقات اعتباراً من الربع الثاني 2026',
        bodyEn:     'HRSD issued circular raising the Saudization threshold for the healthcare sector by +3 pp. High Green now requires 37% localisation.',
        bodyAr:     'أصدرت الوزارة تعميماً يرفع حد السعودة في القطاع الصحي بمقدار 3 نقاط مئوية. الأخضر المرتفع يستلزم الآن 37% توطيناً.',
        timestamp:  '2026-03-24',
        isNew:      true,
    },
    {
        id:         'zatca-phase2-extension',
        category:   'regulatory',
        severity:   'watch',
        sourceEn:   'ZATCA',
        sourceAr:   'هيئة الزكاة والضريبة والجمارك',
        headlineEn: 'E-Invoice Phase 2 Deadline Extended to May 2026',
        headlineAr: 'تمديد موعد المرحلة الثانية للفاتورة الإلكترونية حتى مايو 2026',
        bodyEn:     'ZATCA extended Phase 2 e-invoicing onboarding. Businesses with annual revenue above SAR 5M must comply. Penalties apply from June.',
        bodyAr:     'مددت الهيئة موعد تهيئة الفاتورة الإلكترونية. يجب على الشركات التي تتجاوز إيراداتها 5 ملايين ريال الامتثال. الغرامات تبدأ من يونيو.',
        timestamp:  '2026-03-20',
        isNew:      false,
    },

    // ── Market ────────────────────────────────────────────────────────────────
    {
        id:         'brent-march-2026',
        category:   'market',
        severity:   'watch',
        sourceEn:   'Market',
        sourceAr:   'السوق',
        headlineEn: 'Brent Crude Below $74 — SAR/USD Peg Stable',
        headlineAr: 'برنت دون 74 دولاراً — ربط الريال/الدولار مستقر',
        bodyEn:     'Brent averaged $73.4/bbl in March. SAR/USD peg holds at 3.75. Saudi budget breakeven estimated at $76 — monitor for supply cuts.',
        bodyAr:     'بلغ متوسط برنت 73.4 دولاراً في مارس. ربط الريال/الدولار ثابت عند 3.75. تعادل الميزانية السعودية المقدر 76 دولاراً — راقب قرارات خفض الإنتاج.',
        timestamp:  '2026-03-26',
        isNew:      true,
    },

    // ── Local ─────────────────────────────────────────────────────────────────
    {
        id:         'aramco-pif-tender-q2',
        category:   'local',
        severity:   'info',
        sourceEn:   'Aramco / PIF',
        sourceAr:   'أرامكو / صندوق الاستثمارات العامة',
        headlineEn: 'Aramco Q2 Supplier Cycle & NEOM Tenders Open April 5',
        headlineAr: 'دورة موردي أرامكو للربع الثاني ومناقصات نيوم تفتح 5 أبريل',
        bodyEn:     'Major MRO and industrial supply procurement cycle opens. PIF-linked NEOM sub-contractor tenders active. JCSA accreditation required.',
        bodyAr:     'تفتح دورة شراء كبرى للصيانة والمستلزمات الصناعية. مناقصات مقاولي الباطن في نيوم المرتبطة بالصندوق نشطة. يُشترط اعتماد هيئة المقاولين.',
        timestamp:  '2026-03-25',
        isNew:      true,
    },
];

// ── Public API ─────────────────────────────────────────────────────────────────

export function fetchExternalPulse(): ExternalPulse[] {
    return PULSE_FEED;
}

/** True if any new external events exist — drives the Shell Globe pulse */
export function hasNewExternalEvents(): boolean {
    return PULSE_FEED.some(p => p.isNew);
}

/** Count of new external events */
export function newExternalEventCount(): number {
    return PULSE_FEED.filter(p => p.isNew).length;
}
