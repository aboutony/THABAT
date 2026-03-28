'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import StabilityRing from '@/components/StabilityRing';
import DriverCard from '@/components/DriverCard';
import OracleBriefing from '@/components/OracleBriefing';
import ScenarioPlayground from '@/components/ScenarioPlayground';
import ExportPortal from '@/components/ExportPortal';
import EntitySelector from '@/components/EntitySelector';
import { useAuth } from '@/context/AuthContext';
import { formatPercent } from '@/lib/locale-utils';
import { getTotalAvoided } from '@/lib/ledger';
import type { ScoreBreakdown, RawMetrics } from '@/lib/scoring';
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
    const tSC = useTranslations('scenario');
    const tR  = useTranslations('report');
    const { user } = useAuth();
    const router   = useRouter();

    // CLIENT first-session redirect to Settings (once per browser session)
    useEffect(() => {
        if (user?.role === 'CLIENT') {
            const key = 'thabat-client-onboarded';
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                router.push(`/${locale}/settings`);
            }
        }
    }, [user, locale, router]);

    const [latestData, setLatestData] = useState<LatestScore | null>(null);
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

    const [totalAvoided, setTotalAvoided] = useState(0);
    useEffect(() => {
        setTotalAvoided(getTotalAvoided());
        const sync = () => setTotalAvoided(getTotalAvoided());
        window.addEventListener('thabat-ledger-updated', sync);
        return () => window.removeEventListener('thabat-ledger-updated', sync);
    }, []);

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
            href: `/${locale}/analytics/retention`,
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
            {/* ── Entity Switcher — COMMANDER only ─────────────────────── */}
            {user?.role === 'COMMANDER' && (
                <div className={styles.entityRow}>
                    <EntitySelector />
                </div>
            )}

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

                {/* ── Oracle Briefing — Floating Command Header ────── */}
                <OracleBriefing
                    score={score}
                    scoreBreakdown={latestData?.score}
                    oeeHref={`/${locale}/analytics/efficiency-report`}
                    oeeValue="84%"
                    oeePercent={84}
                />

                {/* Top 3 Drivers */}
                <div className={styles.driversBlock}>
                    <h2 className={styles.driversTitle}>{t('title')}</h2>
                    <div className={styles.driversList}>
                        {drivers.map((d, i) => (
                            <DriverCard key={i} {...d} delay={i} />
                        ))}
                    </div>
                </div>

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
