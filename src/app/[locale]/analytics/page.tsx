'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ActionLedger from '@/components/ActionLedger';
import PageHeader from '@/components/PageHeader';
import PercentileBadge from '@/components/PercentileBadge';
import StabilityRing from '@/components/StabilityRing';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import { useIdentity } from '@/hooks/useIdentity';
import styles from './analytics.module.css';

interface ScoreResult {
    overall: number;
    trend: string;
    liquidity: number;
    margins: number;
    receivables: number;
    costs: number;
    revenue: number;
    drivers: Array<{
        key: string;
        value: string;
        trend: string;
        impact: string;
    }>;
}

export default function AnalyticsPage() {
    const t = useTranslations('analytics');
    const ts = useTranslations('scoring');
    const tb = useTranslations('benchmark');
    const [score, setScore] = useState<ScoreResult | null>(null);
    const [fetchingLatest, setFetchingLatest] = useState(true);
    const locale = useLocale();
    const { isClient } = useIdentity();
    const isAr = locale === 'ar';

    // Fetch latest score on mount
    const fetchLatest = useCallback(async () => {
        try {
            const res = await fetch('/api/metrics');
            if (res.ok) {
                const data = await res.json();
                if (data.latestScore) {
                    setScore({
                        overall: data.latestScore.total_score,
                        trend: data.latestScore.trajectory_direction || 'stable',
                        liquidity: 0, margins: 0, receivables: 0, costs: 0, revenue: 0,
                        drivers: [],
                    });
                }
            }
        } catch {
            // No data yet — that's fine
        } finally {
            setFetchingLatest(false);
        }
    }, []);

    useEffect(() => { fetchLatest(); }, [fetchLatest]);

    const getScoreColor = (s: number) => {
        if (s >= 70) return 'var(--success)';
        if (s >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <>
        <Shell>
            <div className={styles.page}>
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                    rightAction={
                        <Link
                            href={`/${locale}/settings/integrations`}
                            className={styles.dataSettingsBtn}
                            aria-label="Data Settings"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </Link>
                    }
                />

                {/* Industry Percentile Badge — replaced with inactive notice for CLIENT */}
                {isClient ? (
                    <div style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(148,163,184,0.06)',
                        border: '1px solid rgba(148,163,184,0.12)',
                        fontSize: 12, color: 'rgba(148,163,184,0.55)',
                        textAlign: 'center', lineHeight: 1.5,
                    }}>
                        {isAr
                            ? 'مقارنة القطاع: غير نشطة. تتطلب 30 يومًا من استيعاب البيانات التاريخية.'
                            : 'Sector Benchmarking: Inactive. Requires 30 days of historical data ingestion.'}
                    </div>
                ) : (
                    <PercentileBadge percentile={15} industryLabel={tb('ofIndustry', { industry: isAr ? 'الشركات المصنعة للمعدات الطبية في المملكة' : 'Saudi Medical Manufacturers' })} />
                )}

                {/* Stability Ring — with shimmer on compute */}
                {score && (
                    <motion.div
                        className={styles.ringContainer}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <StabilityRing
                            score={score?.overall ?? 0}
                            trend={(score?.trend as 'strengthening' | 'stable' | 'weakening') ?? 'stable'}
                            locale={locale}
                        />
                    </motion.div>
                )}

                {/* Score Preview (if calculated) */}
                {score && !fetchingLatest && (
                    <motion.div
                        className={`glass-card ${styles.scorePreview}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className={styles.scoreRow}>
                            <div>
                                <div className={styles.scoreLabel}>{t('latestScore')}</div>
                                <div className={styles.scoreTrend} style={{ color: getScoreColor(score.overall) }}>
                                    {ts(score.trend)}
                                </div>
                            </div>
                            <div
                                className={styles.scoreNumber}
                                style={{ color: getScoreColor(score.overall) }}
                            >
                                {formatNumber(score.overall, locale)}
                            </div>
                        </div>

                        {/* Sub-scores */}
                        {score.liquidity > 0 && (
                            <div className={styles.subScores}>
                                {[
                                    { key: 'liquidity', val: score.liquidity, weight: '30%' },
                                    { key: 'margins', val: score.margins, weight: '25%' },
                                    { key: 'receivables', val: score.receivables, weight: '15%' },
                                    { key: 'costs', val: score.costs, weight: '15%' },
                                    { key: 'revenue', val: score.revenue, weight: '15%' },
                                ].map((sub) => (
                                    <div key={sub.key} className={styles.subScore}>
                                        <div className={styles.subLabel}>
                                            {ts(sub.key)} <span className={styles.subWeight}>{sub.weight}</span>
                                        </div>
                                        <div className={styles.subBar}>
                                            <motion.div
                                                className={styles.subFill}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${sub.val}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                style={{ background: getScoreColor(sub.val) }}
                                            />
                                        </div>
                                        <div className={styles.subValue}>{sub.val}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Driver Insights */}
                        {score.drivers.length > 0 && (
                            <div className={styles.drivers}>
                                <div className={styles.driversTitle}>{t('keyDrivers')}</div>
                                {score.drivers.map((d, i) => (
                                    <div key={i} className={styles.driver}>
                                        <span className={styles.driverLabel}>{ts(`driver.${d.key}`)}</span>
                                        <span className={styles.driverValue}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Intelligence Module Hub ───────────────────────────── */}
                <div className={styles.moduleHub}>
                    <p className={styles.moduleHubTitle}>{t('moduleHub')}</p>
                    <div className={styles.moduleList}>

                        {/* Card A: Expense Waterfall */}
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.1 }}
                        >
                            <Link href={`/${locale}/analytics/sales-report`} className={styles.moduleCard}>
                                <div className={styles.moduleIcon} style={{ background: 'rgba(0, 108, 53, 0.14)', color: '#22c55e' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2"  y="3"  width="5" height="18" rx="1.5"/>
                                        <rect x="9"  y="7"  width="5" height="14" rx="1.5"/>
                                        <rect x="16" y="11" width="5" height="10" rx="1.5"/>
                                    </svg>
                                </div>
                                <div className={styles.moduleBody}>
                                    <p className={styles.moduleTitle}>{t('moduleSalesReport')}</p>
                                    <p className={styles.moduleDesc}>{t('moduleSalesReportDesc')}</p>
                                </div>
                                <div className={styles.moduleMeta}>
                                    <span className={styles.moduleBadge} style={{ color: 'var(--success)', background: 'rgba(39,103,73,0.12)', borderColor: 'rgba(39,103,73,0.25)' }}>Live</span>
                                    <span className={styles.moduleArrow}>›</span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Card B: Nitaqat Compliance */}
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.2 }}
                        >
                            <Link href={`/${locale}/analytics/nitaqat`} className={styles.moduleCard}>
                                <div className={styles.moduleIcon} style={{ background: 'rgba(212, 175, 55, 0.14)', color: '#D4AF37' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                                        <path d="M9 12l2 2 4-4"/>
                                    </svg>
                                </div>
                                <div className={styles.moduleBody}>
                                    <p className={styles.moduleTitle}>{t('moduleNitaqat')}</p>
                                    <p className={styles.moduleDesc}>{t('moduleNitaqatDesc')}</p>
                                </div>
                                <div className={styles.moduleMeta}>
                                    <span className={styles.moduleBadge} style={{ color: '#D4AF37', background: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.3)' }}>Platinum</span>
                                    <span className={styles.moduleArrow}>›</span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Card C: Supply Chain Nerve Center */}
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.3 }}
                        >
                            <Link href={`/${locale}/analytics/supply-chain`} className={styles.moduleCard}>
                                <div className={styles.moduleIcon} style={{ background: 'rgba(79, 70, 229, 0.14)', color: '#6366F1' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1"  y="3"  width="15" height="13" rx="2"/>
                                        <path d="M16 8h4l3 3v5h-7V8z"/>
                                        <circle cx="5.5"  cy="18.5" r="2.5"/>
                                        <circle cx="18.5" cy="18.5" r="2.5"/>
                                    </svg>
                                </div>
                                <div className={styles.moduleBody}>
                                    <p className={styles.moduleTitle}>{t('moduleSupplyChain')}</p>
                                    <p className={styles.moduleDesc}>{t('moduleSupplyChainDesc')}</p>
                                </div>
                                <div className={styles.moduleMeta}>
                                    <span className={styles.moduleBadge} style={{ color: '#6366F1', background: 'rgba(79,70,229,0.12)', borderColor: 'rgba(79,70,229,0.28)' }}>Live</span>
                                    <span className={styles.moduleArrow}>›</span>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Card D: Operational Efficiency — Phase 11 */}
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.4 }}
                        >
                            <Link href={`/${locale}/analytics/efficiency-report`} className={styles.moduleCard}>
                                <div className={styles.moduleIcon} style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10B981' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                    </svg>
                                </div>
                                <div className={styles.moduleBody}>
                                    <p className={styles.moduleTitle}>{t('moduleEfficiency')}</p>
                                    <p className={styles.moduleDesc}>{t('moduleEfficiencyDesc')}</p>
                                </div>
                                <div className={styles.moduleMeta}>
                                    <span className={styles.moduleBadge} style={{ color: '#10B981', background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.28)' }}>Phase 11</span>
                                    <span className={styles.moduleArrow}>›</span>
                                </div>
                            </Link>
                        </motion.div>

                    </div>
                </div>

                {/* ── Executive Action Ledger ───────────────────────────── */}
                {!isClient && (
                    <div className={styles.moduleHub}>
                        <p className={styles.moduleHubTitle}>{t('actionLedger')}</p>
                        <ActionLedger />
                    </div>
                )}

            </div>
        </Shell>

        {/* ── CLIENT Ignition Overlay ─────────────────────────── */}
        {isClient && (
            <div className={styles.ignitionOverlay}>
                <Link href={`/${locale}/settings`} className={styles.ignitionBtn}>
                    {isAr ? '⚡ تفعيل التغذية المالية' : '⚡ Initiate Financial Feed'}
                </Link>
            </div>
        )}
        </>
    );
}
