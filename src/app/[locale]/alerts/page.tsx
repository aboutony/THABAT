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

// ── Page ──────────────────────────────────────────────────────────────────

export default function ExecutiveVault() {
    const { user, loading: authLoading } = useAuth();
    const router  = useRouter();
    const locale  = useLocale();
    const isAr    = locale === 'ar';

    // Admin guard
    useEffect(() => {
        if (!authLoading && user && user.role !== 'admin') {
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
    const warnings: WarningCard[] = [];

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
