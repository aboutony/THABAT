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

const ENT_03_PULSE_FEED: ExternalPulse[] = [
    {
        id:         'sfda-qa-skin-contact',
        category:   'regulatory',
        severity:   'alert',
        sourceEn:   'SFDA',
        sourceAr:   'الهيئة العامة للغذاء والدواء',
        headlineEn: 'Skin-Contact Material Release Needs Full QA Traceability',
        headlineAr: 'إطلاق المواد الملامسة للبشرة يتطلب تتبعاً كاملاً للجودة',
        bodyEn:     'One hygiene-material release lot remains under enhanced QA review. Batch genealogy and skin-contact documentation must stay complete before branch allocation.',
        bodyAr:     'إحدى دفعات المواد الصحية ما زالت تحت مراجعة جودة معززة. يجب اكتمال شجرة التتبع ووثائق المواد الملامسة للبشرة قبل تخصيص الفروع.',
        timestamp:  '2026-03-29',
        isNew:      true,
    },
    {
        id:         'retail-west-demand-uplift',
        category:   'market',
        severity:   'watch',
        sourceEn:   'Modern Trade Watch',
        sourceAr:   'مراقبة تجارة التجزئة الحديثة',
        headlineEn: 'West Region Hygiene Demand Running Ahead of Allocation',
        headlineAr: 'طلب منتجات العناية في المنطقة الغربية يتجاوز المخصصات',
        bodyEn:     'Branch sell-out for baby and feminine-care categories is ahead of plan in Jeddah and Makkah. Rebalance BabyJoy and Sofy replenishment before the weekend peak.',
        bodyAr:     'مبيعات فروع فئات العناية بالطفل والعناية النسائية تتقدم على الخطة في جدة ومكة. أعد موازنة إعادة توريد بيبي جوي وسوفي قبل ذروة نهاية الأسبوع.',
        timestamp:  '2026-03-28',
        isNew:      true,
    },
    {
        id:         'riyadh-export-window',
        category:   'local',
        severity:   'info',
        sourceEn:   'Branch Operations',
        sourceAr:   'عمليات الفروع',
        headlineEn: 'Riyadh Plant Export Window Opens for GCC Replenishment',
        headlineAr: 'فتح نافذة التصدير من مصنع الرياض لإعادة الإمداد الخليجي',
        bodyEn:     'The next consolidated loading window supports branch replenishment and GCC export allocations. Prioritize absorbent inputs before locking outbound plans.',
        bodyAr:     'تدعم نافذة التحميل الموحدة القادمة إعادة إمداد الفروع وتخصيصات التصدير الخليجية. أعط أولوية للمواد الماصة قبل تثبيت خطط الشحن الخارجي.',
        timestamp:  '2026-03-27',
        isNew:      false,
    },
];

// ── Public API ─────────────────────────────────────────────────────────────────

function getEntityPulseFeed(entityId?: string): ExternalPulse[] {
    return entityId === 'ENT_03' ? ENT_03_PULSE_FEED : PULSE_FEED;
}

export function fetchExternalPulse(entityId?: string): ExternalPulse[] {
    return getEntityPulseFeed(entityId);
}

/** True if any new external events exist — drives the Shell Globe pulse */
export function hasNewExternalEvents(entityId?: string): boolean {
    return getEntityPulseFeed(entityId).some(p => p.isNew);
}

/** Count of new external events */
export function newExternalEventCount(entityId?: string): number {
    return getEntityPulseFeed(entityId).filter(p => p.isNew).length;
}
