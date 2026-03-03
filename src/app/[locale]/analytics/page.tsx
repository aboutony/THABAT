'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import MetricsEntry from '@/components/MetricsEntry';
import PageHeader from '@/components/PageHeader';
import PercentileBadge from '@/components/PercentileBadge';
import StabilityRing from '@/components/StabilityRing';
import Shell from '@/components/Shell';
import { useAuth } from '@/context/AuthContext';
import { formatNumber } from '@/lib/locale-utils';
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
    const [loading, setLoading] = useState(false);
    const [ringLoading, setRingLoading] = useState(false);
    const [fetchingLatest, setFetchingLatest] = useState(true);
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

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

    const handleSubmit = async (data: {
        date: string;
        cash: number;
        revenue: number;
        expenses: number;
        receivables: number;
        payables: number;
    }) => {
        setLoading(true);
        setRingLoading(true);
        try {
            const res = await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                const result = await res.json();
                // Hold the shimmer for a moment to emphasize 'Engine Calculation'
                await new Promise(r => setTimeout(r, 1800));
                setScore(result.score);
            }
        } catch (err) {
            console.error('Failed to submit metrics:', err);
        } finally {
            setRingLoading(false);
            setLoading(false);
        }
    };

    const getScoreColor = (s: number) => {
        if (s >= 70) return 'var(--success)';
        if (s >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader title={t('title')} subtitle={t('subtitle')} />

                {/* Industry Percentile Badge */}
                <PercentileBadge percentile={15} industryLabel={tb('ofIndustry', { industry: locale === 'ar' ? 'الشركات المصنعة للمعدات الطبية في المملكة' : 'Saudi Medical Manufacturers' })} />

                {/* Stability Ring — with shimmer on compute */}
                {(ringLoading || score) && (
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
                            loading={ringLoading}
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

                {/* Metrics Entry Form */}
                <MetricsEntry onSubmit={handleSubmit} loading={loading} />
            </div>
        </Shell>
    );
}
