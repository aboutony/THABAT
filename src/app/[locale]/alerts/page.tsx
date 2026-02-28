'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import Shell from '@/components/Shell';
import { localizeActionType, localizeActionNote, getScoreBandLabel, formatNumber } from '@/lib/locale-utils';
import styles from './pilot.module.css';

interface KPIData {
    totalOrgs: number;
    activeThisWeek: number;
    daer: number;
    retentionRate: number;
    totalMetricsEntries: number;
    avgScore: number;
    scoreDistribution: { label: string; count: number; color: string }[];
    trajectoryDistribution: { strengthening: number; stable: number; weakening: number };
    recentActions: { type: string; note: string; date: string }[];
}

export default function PilotDashboard() {
    const t = useTranslations('pilot');
    const [data, setData] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    const fetchKPIs = useCallback(async () => {
        try {
            const res = await fetch('/api/pilot/kpis');
            if (res.ok) setData(await res.json());
        } catch { /* empty state */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchKPIs(); }, [fetchKPIs]);

    if (loading) {
        return <div className={styles.page}><div className={styles.loading}>{t('loading')}</div></div>;
    }

    const kpis = data || {
        totalOrgs: 0, activeThisWeek: 0, daer: 0, retentionRate: 0,
        totalMetricsEntries: 0, avgScore: 0, scoreDistribution: [],
        trajectoryDistribution: { strengthening: 0, stable: 0, weakening: 0 },
        recentActions: [],
    };

    const cards = [
        { label: t('totalOrgs'), value: kpis.totalOrgs, icon: '🏢', color: 'var(--accent-primary)' },
        { label: t('activeWeek'), value: kpis.activeThisWeek, icon: '📊', color: 'var(--success)' },
        { label: t('daer'), value: `${kpis.daer}%`, icon: '⚡', color: 'var(--warning)' },
        { label: t('retention'), value: `${kpis.retentionRate}%`, icon: '🔒', color: 'var(--accent-secondary)' },
        { label: t('totalEntries'), value: kpis.totalMetricsEntries, icon: '📝', color: 'var(--text-secondary)' },
        { label: t('avgScore'), value: kpis.avgScore, icon: '🎯', color: 'var(--success)' },
    ];

    const traj = kpis.trajectoryDistribution;

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader title={t('title')} subtitle={t('subtitle')} />

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    {cards.map((kpi, i) => (
                        <motion.div
                            key={kpi.label}
                            className={`glass-card ${styles.kpiCard}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                        >
                            <div className={styles.kpiIcon} style={{ color: kpi.color }}>{kpi.icon}</div>
                            <div className={styles.kpiValue} style={{ color: kpi.color }}>{formatNumber(kpi.value, locale)}</div>
                            <div className={styles.kpiLabel}>{kpi.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Trajectory Distribution */}
                <div className={`glass-card ${styles.distribution}`}>
                    <h3 className={styles.sectionTitle}>{t('trajectory')}</h3>
                    <div className={styles.trajGrid}>
                        <div className={styles.trajItem}>
                            <span className={styles.trajDot} style={{ background: 'var(--success)' }} />
                            <span className={styles.trajLabel}>{t('strengthening')}</span>
                            <span className={styles.trajCount}>{formatNumber(traj.strengthening, locale)}</span>
                        </div>
                        <div className={styles.trajItem}>
                            <span className={styles.trajDot} style={{ background: 'var(--warning)' }} />
                            <span className={styles.trajLabel}>{t('stableLabel')}</span>
                            <span className={styles.trajCount}>{formatNumber(traj.stable, locale)}</span>
                        </div>
                        <div className={styles.trajItem}>
                            <span className={styles.trajDot} style={{ background: 'var(--danger)' }} />
                            <span className={styles.trajLabel}>{t('weakening')}</span>
                            <span className={styles.trajCount}>{formatNumber(traj.weakening, locale)}</span>
                        </div>
                    </div>
                </div>

                {/* Score Distribution */}
                {kpis.scoreDistribution.length > 0 && (
                    <div className={`glass-card ${styles.distribution}`}>
                        <h3 className={styles.sectionTitle}>{t('distribution')}</h3>
                        <div className={styles.bars}>
                            {kpis.scoreDistribution.map((band) => (
                                <div key={band.label} className={styles.barRow}>
                                    <span className={styles.barLabel}>{getScoreBandLabel(band.label, locale)}</span>
                                    <div className={styles.barTrack}>
                                        <motion.div
                                            className={styles.barFill}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(band.count * 20, 100)}%` }}
                                            transition={{ duration: 0.6 }}
                                            style={{ background: band.color }}
                                        />
                                    </div>
                                    <span className={styles.barCount}>{formatNumber(band.count, locale)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                {kpis.recentActions.length > 0 && (
                    <div className={`glass-card ${styles.activity}`}>
                        <h3 className={styles.sectionTitle}>{t('recentActivity')}</h3>
                        {kpis.recentActions.map((action, i) => (
                            <div key={i} className={styles.actionRow}>
                                <span className={styles.actionType}>{localizeActionType(action.type, locale)}</span>
                                <span className={styles.actionNote}>{localizeActionNote(action.note, locale)}</span>
                                <span className={styles.actionDate}>{formatNumber(action.date, locale)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
