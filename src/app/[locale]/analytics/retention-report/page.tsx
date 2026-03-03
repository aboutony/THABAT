'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import styles from './retention.module.css';

const RETENTION_DATA = {
    overallRate: 96.2,
    contractsActive: 14,
    contractsRenewed: 12,
    avgContractYears: 3.5,
    primaryContracts: [
        {
            client: { en: 'NUPCO – National Unified Procurement', ar: 'نوبكو – الشركة الوطنية الموحدة للشراء' },
            type: { en: 'Framework Agreement', ar: 'اتفاقية إطارية' },
            value: 4200000,
            startYear: 2023,
            endYear: 2027,
            renewals: 3,
            status: 'active',
        },
        {
            client: { en: 'MOH – Ministry of Health (Central)', ar: 'وزارة الصحة – الإدارة المركزية' },
            type: { en: 'Direct Purchase Agreement', ar: 'اتفاقية شراء مباشر' },
            value: 2100000,
            startYear: 2024,
            endYear: 2026,
            renewals: 1,
            status: 'active',
        },
        {
            client: { en: 'King Faisal Specialist Hospital', ar: 'مستشفى الملك فيصل التخصصي' },
            type: { en: 'Tender Contract', ar: 'عقد مناقصة' },
            value: 1350000,
            startYear: 2024,
            endYear: 2026,
            renewals: 2,
            status: 'active',
        },
        {
            client: { en: 'Saudi German Hospital Group', ar: 'مجموعة المستشفى السعودي الألماني' },
            type: { en: 'Supply Agreement', ar: 'اتفاقية توريد' },
            value: 890000,
            startYear: 2025,
            endYear: 2027,
            renewals: 0,
            status: 'new',
        },
    ],
    recurringNUPCO: [
        {
            product: { en: 'Urological Catheter – Foley 2-Way', ar: 'قسطرة بولية – فولي ثنائية الاتجاه' },
            annualQty: 3200,
            unitPrice: 650.0,
        },
        {
            product: { en: 'Suture Braid Silk 2/0 – 75cm', ar: 'خيط جراحي حريري مجدول 2/0 – 75سم' },
            annualQty: 2400,
            unitPrice: 469.9,
        },
        {
            product: { en: 'Surgical Drain – Jackson-Pratt', ar: 'مصرف جراحي – جاكسون برات' },
            annualQty: 880,
            unitPrice: 312.5,
        },
    ],
};

export default function RetentionReportPage() {
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';
    const isAr = locale === 'ar';
    const t = useTranslations('retention');
    const tc = useTranslations('common');

    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const mSuffix = isAr ? 'م' : 'M';
    const kSuffix = isAr ? 'ألف' : 'K';

    const formatSARShort = (n: number) => {
        if (n >= 1000000) return `${tc('sar')} ${formatNumber((n / 1000000).toFixed(1), locale)}${mSuffix}`;
        if (n >= 1000) return `${tc('sar')} ${formatNumber((n / 1000).toFixed(0), locale)}${kSuffix}`;
        return formatSAR(n);
    };

    const totalContractValue = RETENTION_DATA.primaryContracts.reduce((sum, c) => sum + c.value, 0);
    const totalRecurringRevenue = RETENTION_DATA.recurringNUPCO.reduce((sum, p) => sum + p.annualQty * p.unitPrice, 0);

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    {isAr ? '→' : '←'} {t('back')}
                </Link>

                {/* Header */}
                <motion.div
                    className={`glass-card ${styles.headerCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.headerTitle}>{t('title')}</div>
                    <div className={styles.rateValue}>{formatNumber(RETENTION_DATA.overallRate, locale)}%</div>
                    <div className={styles.rateLabel}>{t('overallRetention')}</div>
                    <div className={styles.statsRow}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{formatNumber(RETENTION_DATA.contractsActive, locale)}</span>
                            <span className={styles.statLabel}>{t('activeContracts')}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={`${styles.statNum} ${styles.greenNum}`}>{formatNumber(RETENTION_DATA.contractsRenewed, locale)}</span>
                            <span className={styles.statLabel}>{t('renewed')}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{formatNumber(RETENTION_DATA.avgContractYears, locale)}</span>
                            <span className={styles.statLabel}>{t('avgYears')}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Contract Breakdown */}
                <motion.div
                    className={`glass-card ${styles.contractsCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>{t('contractValue')}</span>
                        <span className={styles.sectionTotal}>{formatSARShort(totalContractValue)}</span>
                    </div>
                    {RETENTION_DATA.primaryContracts.map((c, i) => (
                        <motion.div
                            key={i}
                            className={styles.contractRow}
                            initial={{ opacity: 0, x: isAr ? 8 : -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                        >
                            <div className={styles.contractInfo}>
                                <span className={styles.contractClient}>{L(c.client)}</span>
                                <span className={styles.contractType}>{L(c.type)}</span>
                                <span className={styles.contractPeriod}>
                                    {formatNumber(c.startYear, locale)}-{formatNumber(c.endYear, locale)} • {formatNumber(c.renewals, locale)} {t('renewals')}
                                </span>
                            </div>
                            <div className={styles.contractRight}>
                                <span className={styles.contractAmount}>{formatSARShort(c.value)}</span>
                                <span className={`${styles.contractStatus} ${c.status === 'new' ? styles.statusNew : styles.statusActive}`}>
                                    {c.status === 'new' ? t('new') : t('active')}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Recurring NUPCO Orders */}
                <motion.div
                    className={`glass-card ${styles.recurringCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>{t('recurringOrders')}</span>
                        <span className={styles.sectionTotal}>{formatSARShort(totalRecurringRevenue)}/{t('year')}</span>
                    </div>
                    {RETENTION_DATA.recurringNUPCO.map((p, i) => (
                        <div key={i} className={styles.productRow}>
                            <div className={styles.productInfo}>
                                <span className={styles.productName}>{L(p.product)}</span>
                                <span className={styles.productQty}>
                                    {formatNumber(p.annualQty.toLocaleString('en-US'), locale)} {t('unitsYear')}
                                </span>
                            </div>
                            <span className={styles.productTotal}>{formatSARShort(p.annualQty * p.unitPrice)}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </Shell>
    );
}
