'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import StabilityRing from '@/components/StabilityRing';
import DriverCard from '@/components/DriverCard';
import InsightCard from '@/components/InsightCard';
import StockHourglass from '@/components/StockHourglass';
import OracleBriefing from '@/components/OracleBriefing';
import ClientConstellation from '@/components/ClientConstellation';
import ScenarioPlayground from '@/components/ScenarioPlayground';
import ExportPortal from '@/components/ExportPortal';
import EntitySelector from '@/components/EntitySelector';
import { generateConsequenceStatement } from '@/lib/scoring';
import { formatScore, formatPercent } from '@/lib/locale-utils';
import { getTotalAvoided } from '@/lib/ledger';
import { calculateStockGap, DEMO_STOCK_GAP_INPUT, DEMO_NEXT_SHIPMENT_DAYS } from '@/lib/stockGap';
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
    const t   = useTranslations('drivers');
    const tL  = useTranslations('ledger');
    const tSR = useTranslations('stockAtRisk');
    const tSC = useTranslations('scenario');
    const tR  = useTranslations('report');
    const [latestData, setLatestData] = useState<LatestScore | null>(null);
    const [insight, setInsight] = useState<ConsequenceInsight | null>(null);
    const [showScenario, setShowScenario] = useState(false);
    const [showExport,   setShowExport]   = useState(false);
    const [now, setNow] = useState(() => new Date());
    const locale = useLocale();

    // Live clock — refresh every minute
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    // Time-aware greeting
    const hour = now.getHours();
    const greetingWord =
        locale === 'ar'
            ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'نهاركم سعيد' : 'مساء الخير')
            : (hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening');
    const greetingFull = locale === 'ar' ? `${greetingWord}، القائد` : `${greetingWord}, Commander`;
    const timeString   = now.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit', minute: '2-digit', hour12: locale !== 'ar',
    });

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

    // ── Stock-at-Risk ─────────────────────────────────────────────────────────
    const stockGap = calculateStockGap(DEMO_STOCK_GAP_INPUT);

    const [totalAvoided, setTotalAvoided] = useState(0);
    useEffect(() => {
        setTotalAvoided(getTotalAvoided());
        const sync = () => setTotalAvoided(getTotalAvoided());
        window.addEventListener('thabat-ledger-updated', sync);
        return () => window.removeEventListener('thabat-ledger-updated', sync);
    }, []);

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
            href: `/${locale}/analytics/efficiency-report`,
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            ),
            label: t('compliance'),
            description: t('complianceDesc'),
            value: locale === 'ar' ? 'بلاتيني' : 'Platinum',
            trend: 'up' as const,
            href: `/${locale}/analytics/nitaqat`,
        },
    ];

    return (
        <div className={styles.ritual}>
            {/* ── Entity Switcher ───────────────────────────────────────── */}
            <div className={styles.entityRow}>
                <EntitySelector />
            </div>

            {/* ── Scenario Playground overlay ───────────────────────────── */}
            <AnimatePresence>
                {showScenario && (
                    <ScenarioPlayground onClose={() => setShowScenario(false)} />
                )}
                {showExport && (
                    <ExportPortal
                        healthScore={score}
                        onClose={() => setShowExport(false)}
                    />
                )}
            </AnimatePresence>
            {/* Stability Ring — sticky visual anchor */}
            <section className={styles.ringSection}>
                <StabilityRing score={score} trend={trend} locale={locale} />
            </section>

            {/* Scrollable content below the ring */}
            <section className={styles.contentSection}>
                {/* ── Executive Greeting ───────────────────────────── */}
                <div className={styles.greeting}>
                    <span className={styles.greetingText}>{greetingFull}</span>
                    <span className={styles.greetingTime}>{timeString}</span>
                </div>

                {/* ── Oracle Briefing + OEE micro-ring ─────────────── */}
                <div className={styles.oracleRow}>
                    <OracleBriefing
                        score={score}
                        scoreBreakdown={latestData?.score}
                    />
                    <Link
                        href={`/${locale}/analytics/efficiency-report`}
                        className={styles.oeeWidget}
                        aria-label="Overall Equipment Effectiveness"
                    >
                        <svg viewBox="0 0 44 44" className={styles.oeeSvg} aria-hidden="true">
                            <circle cx="22" cy="22" r="18" className={styles.oeeTrack} />
                            <circle cx="22" cy="22" r="18" className={styles.oeeFill} />
                        </svg>
                        <span className={styles.oeeValue}>84%</span>
                        <span className={styles.oeeLabel}>OEE</span>
                    </Link>
                </div>

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

                {/* ── Stock-at-Risk alert widget ───────────────────────── */}
                <Link
                    href={`/${locale}/analytics/supply-chain`}
                    className={`${styles.sarWidget} ${stockGap.isAtRisk ? styles.sarCritical : styles.sarSafe}`}
                >
                    <StockHourglass
                        stockDays={stockGap.stockDays}
                        maxStockDays={30}
                        isAtRisk={stockGap.isAtRisk}
                        velocityFactor={0.65}
                        compact
                    />
                    <div className={styles.sarBody}>
                        <span className={styles.sarLabel}>{tSR('label')}</span>
                        <span className={styles.sarValue}>
                            {tSR('daysRemaining', { n: stockGap.stockDays })}
                        </span>
                        <span className={styles.sarSub}>
                            {tSR('nextShipment', { n: DEMO_NEXT_SHIPMENT_DAYS })}
                        </span>
                    </div>
                    <span className={styles.sarArrow}>›</span>
                </Link>

                {/* ── Impact Scoreboard ─────────────────────────────────── */}
                {totalAvoided > 0 && (
                    <div className={`glass-card ${styles.valueWidget}`}>
                        <span className={styles.valueLabel}>
                            {tL('totalRealized')}
                        </span>
                        <span className={styles.valueAmount}>
                            SAR {totalAvoided.toLocaleString('en-SA')}
                        </span>
                    </div>
                )}

                {/* ── Relationship Constellation ───────────────────────── */}
                <ClientConstellation />

                {/* ── Action row: Scenario Lab + Export ────────────────── */}
                <div className={styles.actionRow}>
                    <button
                        className={styles.simBtn}
                        onClick={() => setShowScenario(true)}
                    >
                        <span className={styles.simBtnIcon}>⚗</span>
                        {tSC('triggerBtn')}
                    </button>
                    <button
                        className={styles.exportBtn}
                        onClick={() => setShowExport(true)}
                        aria-label={tR('portalTitle')}
                    >
                        ↗
                    </button>
                </div>
            </section>
        </div>
    );
}
