'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import styles from './receivables.module.css';

const RECEIVABLES_DATA = {
    totalOutstanding: 4369800,
    primaryPO: {
        number: 'PO 3001145285',
        client: 'NUPCO Marketplace',
        product: 'Suture Braid Silk 2/0 – 75cm',
        amount: 939.80,
        filingDate: '2026-01-15',
        paymentTerms: 120,
    },
    agingBuckets: [
        { label: '0-30', labelAr: '٠-٣٠', amount: 1250000, percent: 28.6 },
        { label: '31-60', labelAr: '٣١-٦٠', amount: 980000, percent: 22.4 },
        { label: '61-90', labelAr: '٦١-٩٠', amount: 1450000, percent: 33.2 },
        { label: '91-120', labelAr: '٩١-١٢٠', amount: 689800, percent: 15.8 },
    ],
    topDebtors: [
        { name: 'NUPCO – Central Region', amount: 1850000, days: 87 },
        { name: 'MOH – Riyadh Cluster', amount: 1320000, days: 62 },
        { name: 'King Faisal Specialist Hospital', amount: 750000, days: 45 },
        { name: 'Saudi German Hospital', amount: 449800, days: 28 },
    ],
    collectionRate: 78.4,
};

export default function ReceivablesReportPage() {
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';
    const t = useTranslations('receivables');
    const tc = useTranslations('common');

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const formatSARShort = (n: number) => {
        if (n >= 1000000) return `${tc('sar')} ${formatNumber((n / 1000000).toFixed(2), locale)}M`;
        if (n >= 1000) return `${tc('sar')} ${formatNumber((n / 1000).toFixed(0), locale)}K`;
        return formatSAR(n);
    };

    const dueDate = useMemo(() => {
        const filing = new Date(RECEIVABLES_DATA.primaryPO.filingDate);
        const due = new Date(filing.getTime() + RECEIVABLES_DATA.primaryPO.paymentTerms * 24 * 60 * 60 * 1000);
        return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }, []);

    const maxBucket = Math.max(...RECEIVABLES_DATA.agingBuckets.map(b => b.amount));

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    ← {t('back')}
                </Link>

                {/* Header */}
                <motion.div
                    className={`glass-card ${styles.headerCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.headerTitle}>{t('title')}</div>
                    <div className={styles.totalValue}>{formatSARShort(RECEIVABLES_DATA.totalOutstanding)}</div>
                    <div className={styles.totalLabel}>{t('totalOutstanding')}</div>
                    <div className={styles.collectionRow}>
                        <span className={styles.collectionLabel}>{t('collectionRate')}</span>
                        <span className={styles.collectionValue}>{formatNumber(RECEIVABLES_DATA.collectionRate, locale)}%</span>
                    </div>
                </motion.div>

                {/* Primary PO */}
                <motion.div
                    className={`glass-card ${styles.poCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                >
                    <div className={styles.poTag}>{RECEIVABLES_DATA.primaryPO.number}</div>
                    <div className={styles.poProduct}>{RECEIVABLES_DATA.primaryPO.product}</div>
                    <div className={styles.poClient}>{RECEIVABLES_DATA.primaryPO.client}</div>
                    <div className={styles.poRow}>
                        <span className={styles.poLabel}>{t('invoiceAmount')}</span>
                        <span className={styles.poAmount}>{formatSAR(RECEIVABLES_DATA.primaryPO.amount)}</span>
                    </div>
                    <div className={styles.poRow}>
                        <span className={styles.poLabel}>{t('legallyDue')}</span>
                        <span className={styles.poDate}>
                            {formatNumber(dueDate, locale)} ({formatNumber(RECEIVABLES_DATA.primaryPO.paymentTerms, locale)} {t('days')})
                        </span>
                    </div>
                </motion.div>

                {/* Aging Buckets */}
                <motion.div
                    className={`glass-card ${styles.agingCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <div className={styles.sectionTitle}>{t('agingBuckets')}</div>
                    <div className={styles.bucketList}>
                        {RECEIVABLES_DATA.agingBuckets.map((bucket, i) => (
                            <div key={i} className={styles.bucketRow}>
                                <span className={styles.bucketLabel}>
                                    {locale === 'ar' ? bucket.labelAr : bucket.label} {t('days')}
                                </span>
                                <div className={styles.bucketBarOuter}>
                                    <motion.div
                                        className={styles.bucketBarInner}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(bucket.amount / maxBucket) * 100}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                                        style={{
                                            background: i < 2
                                                ? 'rgba(0, 108, 53, 0.6)'
                                                : i === 2
                                                    ? 'rgba(245, 158, 11, 0.6)'
                                                    : 'rgba(239, 68, 68, 0.6)',
                                        }}
                                    />
                                </div>
                                <span className={styles.bucketAmount}>{formatSARShort(bucket.amount)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Debtors */}
                <motion.div
                    className={`glass-card ${styles.debtorsCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                >
                    <div className={styles.sectionTitle}>{t('topDebtors')}</div>
                    {RECEIVABLES_DATA.topDebtors.map((debtor, i) => (
                        <div key={i} className={styles.debtorRow}>
                            <div className={styles.debtorInfo}>
                                <span className={styles.debtorName}>{debtor.name}</span>
                                <span className={styles.debtorDays}>
                                    {formatNumber(debtor.days, locale)} {t('days')}
                                </span>
                            </div>
                            <span className={styles.debtorAmount}>{formatSARShort(debtor.amount)}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </Shell>
    );
}
