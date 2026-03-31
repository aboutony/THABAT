'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import { getEntityRetentionReport } from '@/lib/entityDemoContent';
import { useEntity } from '@/context/EntityContext';
import styles from './retention.module.css';

const DEFAULT_RETENTION = getEntityRetentionReport('ENT_02');

export default function RetentionReportPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('retention');
    const tc = useTranslations('common');
    const { activeEntity } = useEntity();
    const report = activeEntity.id === 'ENT_02' ? DEFAULT_RETENTION : getEntityRetentionReport(activeEntity.id);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [renewalSent, setRenewalSent] = useState<Record<string, boolean>>({});

    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;
    const mSuffix = isAr ? 'م' : 'M';
    const kSuffix = isAr ? 'ألف' : 'K';

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const formatSARShort = (n: number) => {
        if (n >= 1000000) return `${tc('sar')} ${formatNumber((n / 1000000).toFixed(1), locale)}${mSuffix}`;
        if (n >= 1000) return `${tc('sar')} ${formatNumber((n / 1000).toFixed(0), locale)}${kSuffix}`;
        return formatSAR(n);
    };

    const handleRenewal = (id: string) => {
        setRenewalSent(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setRenewalSent(prev => ({ ...prev, [id]: false }));
        }, 3000);
    };

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    {isAr ? '→' : '←'} {t('back')}
                </Link>

                {/* Header — Contract Stability */}
                <motion.div
                    className={`glass-card ${styles.headerCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.headerTitle}>{t('contractStability')}</div>
                    <div className={styles.rateValue}>{formatNumber(report.stats.overallStability, locale)}%</div>
                    <div className={styles.rateLabel}>{t('overallRetention')}</div>
                    <div className={styles.statsRow}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{formatNumber(report.stats.activeContracts, locale)}</span>
                            <span className={styles.statLabel}>{t('activeContracts')}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={`${styles.statNum} ${styles.greenNum}`}>{formatSARShort(report.stats.recurringRevenue)}</span>
                            <span className={styles.statLabel}>{t('recurringRevenue')}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{formatNumber(report.stats.avgContractYears, locale)}</span>
                            <span className={styles.statLabel}>{t('avgYears')}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Contract List */}
                <div className={styles.sectionTitle}>{t('contractValue')}</div>
                {report.contracts.map((c, i) => {
                    const isExpiring = c.daysRemaining < 90;
                    const isExpanded = expandedId === c.id;

                    return (
                        <motion.div
                            key={c.id}
                            className={`glass-card ${styles.contractCard} ${isExpiring ? styles.expiringCard : ''}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.08 }}
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                            <div className={styles.contractHeader}>
                                <div className={styles.contractInfo}>
                                    <span className={styles.contractClient}>{L(c.client)}</span>
                                    <span className={styles.contractType}>{L(c.type)}</span>
                                </div>
                                <div className={styles.contractRight}>
                                    <span className={styles.contractAmount}>{formatSARShort(c.value)}</span>
                                    <span className={`${styles.stabilityBadge} ${c.status === 'stable' ? styles.badgeStable :
                                            c.status === 'expiring' ? styles.badgeExpiring :
                                                styles.badgeNew
                                        }`}>
                                        {L(c.stability)}
                                    </span>
                                </div>
                            </div>

                            {/* Renewal Alert */}
                            {isExpiring && (
                                <div className={styles.renewalAlert}>
                                    <span className={styles.alertPulse} />
                                    <span className={styles.alertText}>
                                        {t('renewalAlert', { days: formatNumber(c.daysRemaining, locale) })}
                                    </span>
                                </div>
                            )}

                            {/* Contract Meta */}
                            <div className={styles.metaRow}>
                                <span className={styles.metaItem}>
                                    {formatNumber(c.daysRemaining, locale)} {t('daysRemaining')}
                                </span>
                                <span className={styles.metaDot}>•</span>
                                <span className={styles.metaItem}>
                                    {formatNumber(c.renewals, locale)} {t('renewals')}
                                </span>
                                <span className={styles.metaDot}>•</span>
                                <span className={styles.metaItem}>{t('renewalStatus')}</span>
                            </div>

                            {/* Expanded Detail */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        className={styles.expandedSection}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className={styles.productsHeader}>{t('recurringOrders')}</div>
                                        {c.products.map((p, j) => (
                                            <div key={j} className={styles.productRow}>
                                                <span className={styles.productName}>{L(p.name)}</span>
                                                <span className={styles.productQty}>
                                                    {formatNumber(p.qty.toLocaleString('en-US'), locale)} × {formatSAR(p.price)}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Executive Action — Renewal Brief */}
                                        {isExpiring && (
                                            <button
                                                className={`${styles.renewalBtn} ${renewalSent[c.id] ? styles.renewalSent : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleRenewal(c.id); }}
                                                disabled={renewalSent[c.id]}
                                            >
                                                {renewalSent[c.id] ? (
                                                    <>✓ {t('renewalBriefSent')}</>
                                                ) : (
                                                    t('requestRenewalBrief')
                                                )}
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </Shell>
    );
}
