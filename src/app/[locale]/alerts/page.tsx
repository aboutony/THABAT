'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Shell from '@/components/Shell';
import StockHourglass from '@/components/StockHourglass';
import ExternalPulseCard from '@/components/ExternalPulseCard';
import { useAuth } from '@/context/AuthContext';
import { useEntity } from '@/context/EntityContext';
import { calculateStockGap, DEMO_STOCK_GAP_INPUT, DEMO_NEXT_SHIPMENT_DAYS } from '@/lib/stockGap';
import { DEMO_NITAQAT_TIER } from '@/lib/generateBriefing';
import { hasRetentionRisk, getAtRiskClients } from '@/lib/calculateClientHealth';
import { hasNewExternalEvents } from '@/lib/fetchExternalPulse';

// Receivables risk threshold: score below 70 triggers a vault warning
const DEMO_RECEIVABLES_SCORE = 62;
import styles from './vault.module.css';

// ── Warning card definition ────────────────────────────────────────────────

interface WarningCard {
    id:      string;
    titleEn: string;
    titleAr: string;
    bodyEn:  string;
    bodyAr:  string;
    href:    string;
    color:   string;
}

// ── Entity-specific intelligence triggers ─────────────────────────────────

function getEntityWarnings(entityId: string, locale: string): WarningCard[] {
    switch (entityId) {
        case 'ENT_06': // The Hospital
            return [
                {
                    id:      'ent06-bed-turnover',
                    titleEn: 'Critical: Bed Turnover Delay in Ward B',
                    titleAr: 'حرج: تأخر دوران الأسرة في جناح ب',
                    bodyEn:  'Bed turnover rate in Ward B is below the 85% target. Immediate triage protocol review required.',
                    bodyAr:  'معدل دوران الأسرة في جناح ب أقل من الهدف البالغ 85%. مراجعة فورية لبروتوكول الفرز مطلوبة.',
                    href:    `/${locale}/analytics/retention`,
                    color:   '#F87171',
                },
                {
                    id:      'ent06-moh-audit',
                    titleEn: 'MOH Compliance Audit Window Closing (48h)',
                    titleAr: 'إغلاق نافذة تدقيق الامتثال لوزارة الصحة (48 ساعة)',
                    bodyEn:  'Ministry of Health compliance audit window closes in 48 hours. Submit pending documentation to avoid penalties.',
                    bodyAr:  'تُغلق نافذة تدقيق الامتثال لوزارة الصحة خلال 48 ساعة. سلّم الوثائق المعلقة لتفادي الغرامات.',
                    href:    `/${locale}/analytics/nitaqat`,
                    color:   '#F59E0B',
                },
            ];

        case 'ENT_05': // The Real-Estate Developer
            return [
                {
                    id:      'ent05-contractor-overdue',
                    titleEn: 'Friction: Contractor Payment Milestone Overdue',
                    titleAr: 'احتكاك: تأخر دفعة معلم مقاول',
                    bodyEn:  'Contractor payment milestone for Project Phase 3 is overdue by 14 days. GOSI clearance friction escalating.',
                    bodyAr:  'تأخرت دفعة المقاول لمعلم المرحلة الثالثة 14 يوماً. احتكاك تخليص الغوص في تصاعد.',
                    href:    `/${locale}/analytics/sales-report`,
                    color:   '#F87171',
                },
                {
                    id:      'ent05-permit-gosi',
                    titleEn: 'Regulatory: Permit 409-A Pending GOSI Clearance',
                    titleAr: 'تنظيمي: التصريح 409-أ بانتظار تخليص الغوص',
                    bodyEn:  'Permit 409-A is held pending GOSI employer compliance certificate. 3 red flags flagged.',
                    bodyAr:  'التصريح 409-أ موقوف بانتظار شهادة امتثال صاحب العمل من الغوص. 3 علامات حمراء مرصودة.',
                    href:    `/${locale}/analytics/nitaqat`,
                    color:   '#F59E0B',
                },
            ];

        case 'ENT_08': // The F&B Distributor
            return [
                {
                    id:      'ent08-fuel-margin',
                    titleEn: 'Margin Alert: Fuel Price Increase (+0.12 SAR/L)',
                    titleAr: 'تنبيه هامش: ارتفاع سعر الوقود (+0.12 ريال/لتر)',
                    bodyEn:  'Fuel cost up +0.12 SAR/L — logistics margin at critical threshold. Distribution cost now 35% above 6-month average.',
                    bodyAr:  'تكلفة الوقود ارتفعت 0.12 ريال/لتر — هامش اللوجستيك عند العتبة الحرجة. تكلفة التوزيع أعلى بنسبة 35% عن المتوسط.',
                    href:    `/${locale}/analytics/supply-chain`,
                    color:   '#F87171',
                },
                {
                    id:      'ent08-fleet-util',
                    titleEn: 'Logistics: Fleet Utilization below 70% Threshold',
                    titleAr: 'لوجستيك: استخدام الأسطول دون عتبة 70%',
                    bodyEn:  'Fleet utilization at 67% — below the 70% efficiency threshold. Route optimization review required.',
                    bodyAr:  'استخدام الأسطول عند 67% — دون عتبة الكفاءة البالغة 70%. مراجعة تحسين المسارات مطلوبة.',
                    href:    `/${locale}/analytics/supply-chain`,
                    color:   '#F59E0B',
                },
            ];

        default:
            return [];
    }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ExecutiveVault() {
    const { user, loading: authLoading } = useAuth();
    const { activeEntity } = useEntity();
    const router  = useRouter();
    const locale  = useLocale();
    const isAr    = locale === 'ar';

    // COMMANDER guard
    useEffect(() => {
        if (!authLoading && user && user.role !== 'COMMANDER') {
            router.push(`/${locale}`);
        }
    }, [user, authLoading, router, locale]);

    // ── Risk computation ─────────────────────────────────────────────────
    const stockGap           = calculateStockGap(DEMO_STOCK_GAP_INPUT);
    const hasNitaqatDanger   = DEMO_NITAQAT_TIER === 'red' || DEMO_NITAQAT_TIER === 'lowGreen';
    const retentionRisk      = hasRetentionRisk();
    const atRiskCount        = retentionRisk ? getAtRiskClients().length : 0;
    const hasReceivablesRisk = DEMO_RECEIVABLES_SCORE < 70;
    const externalPulseNew   = hasNewExternalEvents();

    // ── Build warning cards ──────────────────────────────────────────────
    // Entity-specific intelligence always leads; generic signals follow.
    const warnings: WarningCard[] = [
        ...getEntityWarnings(activeEntity.id, locale),
    ];

    if (stockGap.isAtRisk) {
        warnings.push({
            id:      'stock',
            titleEn: 'Stock-Out Risk',
            titleAr: 'خطر نفاد المخزون',
            bodyEn:  `${stockGap.stockDays} days of inventory remaining — reorder window exceeded by ${Math.round(stockGap.gapDays)} days.`,
            bodyAr:  `${stockGap.stockDays} أيام من المخزون — تجاوزت نافذة إعادة الطلب بـ ${Math.round(stockGap.gapDays)} يوماً.`,
            href:    `/${locale}/analytics/supply-chain`,
            color:   '#F87171',
        });
    }

    if (hasNitaqatDanger) {
        warnings.push({
            id:      'nitaqat',
            titleEn: 'Nitaqat Tier Drop',
            titleAr: 'تراجع مستوى نطاقات',
            bodyEn:  'Current Nitaqat tier requires workforce corrections to avoid penalties.',
            bodyAr:  'المستوى الحالي لنطاقات يستلزم تصحيحات في القوى العاملة لتفادي الغرامات.',
            href:    `/${locale}/analytics/nitaqat`,
            color:   '#F59E0B',
        });
    }

    if (retentionRisk) {
        warnings.push({
            id:      'retention',
            titleEn: 'Client Retention Alert',
            titleAr: 'تنبيه استبقاء العملاء',
            bodyEn:  `${atRiskCount} client${atRiskCount !== 1 ? 's' : ''} showing churn signals — proactive outreach recommended.`,
            bodyAr:  `${atRiskCount} عميل يُظهر إشارات مخاطر — يُنصح بالتواصل الاستباقي.`,
            href:    `/${locale}/analytics/retention`,
            color:   '#FB7185',
        });
    }

    if (hasReceivablesRisk) {
        warnings.push({
            id:      'receivables',
            titleEn: 'Receivables Under Pressure',
            titleAr: 'ضغط على المستحقات',
            bodyEn:  `Receivables score ${DEMO_RECEIVABLES_SCORE}/100 — elevated overdue exposure detected. Review financial position.`,
            bodyAr:  `نقاط المستحقات ${DEMO_RECEIVABLES_SCORE}/100 — تم رصد ارتفاع في التعرض للمتأخرات. راجع الوضع المالي.`,
            href:    `/${locale}/analytics/sales-report`,
            color:   '#F59E0B',
        });
    }

    return (
        <Shell>
            <div className={styles.page}>

                {/* ── Page header ──────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        {isAr ? 'الخزينة التنفيذية' : 'Executive Vault'}
                    </h1>
                    <p className={styles.pageSubtitle}>
                        {isAr
                            ? 'مراقبة المخاطر الحية · إجراءات فورية'
                            : 'Live risk monitoring · immediate action'}
                    </p>
                </div>

                {/* ── Sand Watch — Stock-at-Risk ───────────────────────── */}
                <div className={styles.sectionLabel}>
                    {isAr ? 'ساعة الرمل' : 'Sand Watch'}
                </div>

                <Link
                    href={`/${locale}/analytics/supply-chain`}
                    className={`${styles.sandWatch} ${stockGap.isAtRisk ? styles.sandWatchCritical : styles.sandWatchSafe}`}
                >
                    <StockHourglass
                        stockDays={stockGap.stockDays}
                        maxStockDays={30}
                        isAtRisk={stockGap.isAtRisk}
                        velocityFactor={0.65}
                        compact
                    />
                    <div className={styles.sandWatchBody}>
                        <span className={styles.sandWatchLabel}>
                            {isAr ? 'المخزون المتبقي' : 'Stock-at-Risk'}
                        </span>
                        <span
                            className={styles.sandWatchValue}
                            style={{ color: stockGap.isAtRisk ? '#F87171' : '#4ADE80' }}
                        >
                            {isAr
                                ? `${stockGap.stockDays} أيام متبقية`
                                : `${stockGap.stockDays} days remaining`}
                        </span>
                        <span className={styles.sandWatchSub}>
                            {isAr
                                ? `الشحنة القادمة خلال ${DEMO_NEXT_SHIPMENT_DAYS} أيام`
                                : `Next shipment in ${DEMO_NEXT_SHIPMENT_DAYS} days`}
                        </span>
                    </div>
                    <span className={styles.sandWatchArrow}>›</span>
                </Link>

                {/* ── Oracle Warnings ──────────────────────────────────── */}
                <div className={styles.sectionLabel}>
                    {isAr ? 'تحذيرات الأوراكل' : 'Oracle Warnings'}
                </div>

                <div className={styles.warningsList}>
                    {warnings.length === 0 ? (
                        <div className={styles.allClear}>
                            <span className={styles.allClearIcon}>✓</span>
                            <span className={styles.allClearText}>
                                {isAr ? 'جميع الأنظمة تعمل بشكل طبيعي' : 'All systems nominal'}
                            </span>
                        </div>
                    ) : (
                        warnings.map((w, i) => (
                            <motion.div
                                key={w.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <Link
                                    href={w.href}
                                    className={styles.warningCard}
                                    style={{ borderColor: `${w.color}30` }}
                                >
                                    <span
                                        className={styles.warningDot}
                                        style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }}
                                    />
                                    <div className={styles.warningBody}>
                                        <span className={styles.warningTitle} style={{ color: w.color }}>
                                            {isAr ? w.titleAr : w.titleEn}
                                        </span>
                                        <span className={styles.warningText}>
                                            {isAr ? w.bodyAr : w.bodyEn}
                                        </span>
                                    </div>
                                    <span className={styles.warningArrow}>›</span>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* ── External Pulse ─────────────────────────────────── */}
                <div className={styles.sectionLabel} style={{ marginTop: '12mm' }}>
                    {externalPulseNew && <span style={{ color: '#D4AF37', marginInlineEnd: 4 }}>🌐</span>}
                    {isAr ? 'النبضة الخارجية' : 'External Pulse'}
                </div>

                <div className={styles.externalPulseContainer}>
                    <ExternalPulseCard />
                </div>

            </div>
        </Shell>
    );
}
