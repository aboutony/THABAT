'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import StabilityRing from '@/components/StabilityRing';
import DriverCard from '@/components/DriverCard';
import InsightCard from '@/components/InsightCard';
import { generateConsequenceStatement } from '@/lib/scoring';
import { formatScore, formatPercent } from '@/lib/locale-utils';
import type { ScoreBreakdown, RawMetrics, ConsequenceInsight } from '@/lib/scoring';
import styles from './RitualScreen.module.css';

// Fallback demo data when no real metrics exist
const DEMO_SCORE = 87;
const DEMO_TREND = 'strengthening' as const;

interface LatestScore {
    score: ScoreBreakdown;
    metrics: RawMetrics;
}

export default function RitualScreen() {
    const t = useTranslations('drivers');
    const [latestData, setLatestData] = useState<LatestScore | null>(null);
    const [insight, setInsight] = useState<ConsequenceInsight | null>(null);
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    // Fetch latest score from the API
    useEffect(() => {
        async function fetchLatest() {
            try {
                const res = await fetch('/api/metrics?latest=true');
                if (res.ok) {
                    const data = await res.json();
                    if (data.latestScore) {
                        const scoreBreakdown: ScoreBreakdown = {
                            liquidity: data.latestScore.liquidity_component ?? 50,
                            margins: data.latestScore.margin_component ?? 50,
                            receivables: data.latestScore.receivables_component ?? 50,
                            costs: data.latestScore.cost_component ?? 50,
                            revenue: data.latestScore.revenue_component ?? 50,
                            overall: data.latestScore.total_score,
                            trend: data.latestScore.trajectory_direction || 'stable',
                            delta: data.latestScore.score_delta || 0,
                            drivers: [],
                            calibration: { industry: '', revenueBand: '', growthStage: '' },
                        };

                        const rawMetrics: RawMetrics = {
                            cash: data.latestMetrics?.cash_balance ?? 500000,
                            revenue: data.latestMetrics?.revenue ?? 200000,
                            expenses: data.latestMetrics?.expenses ?? 150000,
                            receivables: data.latestMetrics?.receivables ?? 80000,
                            payables: data.latestMetrics?.payables ?? 60000,
                        };

                        setLatestData({ score: scoreBreakdown, metrics: rawMetrics });
                        setInsight(generateConsequenceStatement(scoreBreakdown, rawMetrics));
                    }
                }
            } catch {
                // Silent fail — use demo data
            }
        }
        fetchLatest();
    }, []);

    const score = latestData?.score.overall ?? DEMO_SCORE;
    const trend = latestData?.score.trend ?? DEMO_TREND;

    // Generate demo insight if no real data
    const demoInsight: ConsequenceInsight | null = !insight ? {
        metricKey: 'scoring.costs',
        consequenceKey: 'insight.consequence.costs',
        severity: 'moderate',
        impactValue: '74.2%',
        score: 62,
    } : null;

    const activeInsight = insight || demoInsight;

    const drivers = [
        {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            label: t('revenue'),
            description: t('revenueDesc'),
            value: latestData ? formatPercent(((latestData.metrics.revenue - latestData.metrics.expenses) / Math.max(latestData.metrics.revenue, 1) * 100), locale) : formatPercent(12.4, locale),
            trend: 'up' as const,
            href: `/${locale}/analytics/sales-report`,
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
            label: t('retention'),
            description: t('retentionDesc'),
            value: latestData ? formatPercent(latestData.score.receivables, locale) : formatPercent(94.2, locale),
            trend: 'up' as const,
            href: `/${locale}/analytics/receivables-report`,
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
            label: t('efficiency'),
            description: t('efficiencyDesc'),
            value: latestData ? formatPercent(latestData.score.margins, locale) : formatPercent(88.7, locale),
            trend: 'up' as const,
            href: `/${locale}/analytics/receivables-report`,
        },
    ];

    return (
        <div className={styles.ritual}>
            {/* Stability Ring — sticky visual anchor */}
            <section className={styles.ringSection}>
                <StabilityRing score={score} trend={trend} locale={locale} />
            </section>

            {/* Scrollable content below the ring */}
            <section className={styles.contentSection}>
                {/* Executive Insight — Consequence Statement */}
                {activeInsight && (
                    <InsightCard insight={activeInsight} />
                )}

                {/* Top 3 Drivers */}
                <div className={styles.driversBlock}>
                    <h2 className={styles.driversTitle}>{t('title')}</h2>
                    <div className={styles.driversList}>
                        {drivers.map((d, i) => (
                            <DriverCard key={i} {...d} delay={i} />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
