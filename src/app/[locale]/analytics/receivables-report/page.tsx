'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import { getEntityReceivablesContent } from '@/lib/entityDemoContent';
import { useEntity } from '@/context/EntityContext';
import styles from './receivables.module.css';

const RECEIVABLES_DATA = getEntityReceivablesContent('ENT_02');

export default function ReceivablesReportPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('receivables');
    const tc = useTranslations('common');
    const { activeEntity } = useEntity();
    const receivables = activeEntity.id === 'ENT_02'
        ? RECEIVABLES_DATA
        : getEntityReceivablesContent(activeEntity.id);

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const mSuffix = isAr ? 'م' : 'M';
    const kSuffix = isAr ? 'ألف' : 'K';

    const formatSARShort = (n: number) => {
        if (n >= 1000000) return `${tc('sar')} ${formatNumber((n / 1000000).toFixed(2), locale)}${mSuffix}`;
        if (n >= 1000) return `${tc('sar')} ${formatNumber((n / 1000).toFixed(0), locale)}${kSuffix}`;
        return formatSAR(n);
    };

    const dueDate = useMemo(() => {
        const filing = new Date(receivables.primaryPO.filingDate);
        const due = new Date(filing.getTime() + receivables.primaryPO.paymentTerms * 24 * 60 * 60 * 1000);
        const dateLocale = isAr ? 'ar-SA' : 'en-US';
        return due.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    }, [isAr, receivables.primaryPO.filingDate, receivables.primaryPO.paymentTerms]);

    const maxBucket = Math.max(...receivables.agingBuckets.map(b => b.amount));
    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;

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
                    <div className={styles.totalValue}>{formatSARShort(receivables.totalOutstanding)}</div>
                    <div className={styles.totalLabel}>{t('totalOutstanding')}</div>
                    <div className={styles.collectionRow}>
                        <span className={styles.collectionLabel}>{t('collectionRate')}</span>
                        <span className={styles.collectionValue}>{formatNumber(receivables.collectionRate, locale)}%</span>
                    </div>
                </motion.div>

                {/* Primary PO */}
                <motion.div
                    className={`glass-card ${styles.poCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                >
                    <div className={styles.poTag}>{formatNumber(receivables.primaryPO.number, locale)}</div>
                    <div className={styles.poProduct}>{L(receivables.primaryPO.product)}</div>
                    <div className={styles.poClient}>{L(receivables.primaryPO.client)}</div>
                    <div className={styles.poRow}>
                        <span className={styles.poLabel}>{t('invoiceAmount')}</span>
                        <span className={styles.poAmount}>{formatSAR(receivables.primaryPO.amount)}</span>
                    </div>
                    <div className={styles.poRow}>
                        <span className={styles.poLabel}>{t('legallyDue')}</span>
                        <span className={styles.poDate}>
                            {dueDate} ({formatNumber(receivables.primaryPO.paymentTerms, locale)} {t('days')})
                        </span>
                    </div>
                    <div className={styles.poNote}>
                        {L(receivables.note)}
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
                        {(isAr ? [...receivables.agingBuckets].reverse() : receivables.agingBuckets).map((bucket, i) => {
                            const origIdx = receivables.agingBuckets.indexOf(bucket);
                            return (
                                <div key={i} className={styles.bucketRow}>
                                    <span className={styles.bucketLabel}>
                                        {isAr ? bucket.labelAr : bucket.label} {t('days')}
                                    </span>
                                    <div className={styles.bucketBarOuter}>
                                        <motion.div
                                            className={styles.bucketBarInner}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(bucket.amount / maxBucket) * 100}%` }}
                                            transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                                            style={{
                                                background: origIdx < 2
                                                    ? 'rgba(0, 108, 53, 0.6)'
                                                    : origIdx === 2
                                                        ? 'rgba(245, 158, 11, 0.6)'
                                                        : 'rgba(239, 68, 68, 0.6)',
                                            }}
                                        />
                                    </div>
                                    <span className={styles.bucketAmount}>{formatSARShort(bucket.amount)}</span>
                                </div>
                            );
                        })}
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
                    {receivables.topDebtors.map((debtor, i) => (
                        <div key={i} className={styles.debtorRow}>
                            <div className={styles.debtorInfo}>
                                <span className={styles.debtorName}>{L(debtor.name)}</span>
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
