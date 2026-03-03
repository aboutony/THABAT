'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { formatNumber } from '@/lib/locale-utils';
import styles from './OrgSwitcher.module.css';

interface DemoOrg {
    id: string;
    name: string;
    industry: string;
    growth_stage: string;
    total_score: number | null;
    trajectory_direction: string | null;
    entity_group: string | null;
    currency: string | null;
    corp_tax_rate: number | null;
    vat_rate: number | null;
}

interface ConsolidatedData {
    consolidatedScore: {
        overall: number;
        trend: string;
    };
    entities: Array<{
        name: string;
        currency: string;
        latestScore: number | null;
        trend: string;
    }>;
}

const INDUSTRY_ICONS: Record<string, string> = {
    Technology: '💻',
    Retail: '🏬',
    Manufacturing: '🏭',
    'Professional Services': '📊',
    'Medical Manufacturing': '🏥',
};

const STAGE_LABELS: Record<string, { en: string; ar: string }> = {
    'high-growth': { en: 'High Growth', ar: 'نمو عالٍ' },
    growth: { en: 'Growth', ar: 'نمو' },
    mature: { en: 'Mature', ar: 'ناضجة' },
    stable: { en: 'Stable', ar: 'مستقرة' },
    turnaround: { en: 'Turnaround', ar: 'تحوّل' },
};

function getScoreColor(score: number | null): string {
    if (score === null) return 'var(--text-tertiary)';
    if (score >= 75) return 'var(--ring-green)';
    if (score >= 50) return 'var(--ring-amber)';
    return 'var(--ring-red)';
}

function getTrendArrow(trend: string | null): string {
    if (trend === 'strengthening') return '↗';
    if (trend === 'weakening') return '↘';
    return '→';
}

export default function OrgSwitcher() {
    const t = useTranslations('demo');
    const { user } = useAuth();
    const [orgs, setOrgs] = useState<DemoOrg[]>([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<string | null>(null);
    const [showConsolidated, setShowConsolidated] = useState(false);
    const [consolidatedData, setConsolidatedData] = useState<ConsolidatedData | null>(null);
    const [loadingConsolidated, setLoadingConsolidated] = useState(false);
    const locale = useLocale();

    const isAdmin = user?.role === 'admin';

    const fetchOrgs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/switch-org');
            if (res.ok) {
                const data = await res.json();
                setOrgs(data.orgs || []);
            }
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    // Check if there's an entity group among the orgs
    const entityGroups = new Set(orgs.filter(o => o.entity_group).map(o => o.entity_group!));
    const hasEntityGroup = entityGroups.size > 0;

    const fetchConsolidated = useCallback(async (group: string) => {
        setLoadingConsolidated(true);
        try {
            const res = await fetch(`/api/metrics/consolidated?group=${group}`);
            if (res.ok) {
                const data = await res.json();
                setConsolidatedData(data);
            }
        } catch {
            // Silently fail
        } finally {
            setLoadingConsolidated(false);
        }
    }, []);

    const handleToggleConsolidated = () => {
        const next = !showConsolidated;
        setShowConsolidated(next);
        if (next && !consolidatedData && entityGroups.size > 0) {
            fetchConsolidated(Array.from(entityGroups)[0]);
        }
    };

    const handleSwitch = async (orgId: string) => {
        if (switching) return;
        setSwitching(orgId);

        try {
            const res = await fetch('/api/admin/switch-org', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orgId }),
            });

            if (res.ok) {
                localStorage.removeItem('thabat-theme');
                window.location.href = '/';
            }
        } catch {
            setSwitching(null);
        }
    };

    if (loading || orgs.length === 0) return null;

    const currentOrgId = user?.orgId;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.icon}>🏢</span>
                <span className={styles.title}>{t('switchOrg')}</span>
            </div>

            {/* Consolidated View Toggle */}
            {hasEntityGroup && (
                <button
                    className={`${styles.consolidatedToggle} ${showConsolidated ? styles.consolidatedActive : ''}`}
                    onClick={handleToggleConsolidated}
                >
                    <span className={styles.consolidatedIcon}>🌐</span>
                    <span className={styles.consolidatedLabel}>
                        {locale === 'ar' ? 'العرض الموحّد' : 'Consolidated View'}
                    </span>
                    {showConsolidated && consolidatedData && (
                        <span
                            className={styles.consolidatedScore}
                            style={{ color: getScoreColor(consolidatedData.consolidatedScore.overall) }}
                        >
                            {formatNumber(Math.round(consolidatedData.consolidatedScore.overall), locale)}
                        </span>
                    )}
                    {loadingConsolidated && <span className={styles.loadingDot}>⏳</span>}
                </button>
            )}

            {/* Consolidated Breakdown */}
            <AnimatePresence>
                {showConsolidated && consolidatedData && (
                    <motion.div
                        className={styles.consolidatedBreakdown}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {consolidatedData.entities.map(e => (
                            <div key={e.name} className={styles.entityRow}>
                                <span className={styles.entityName}>{e.name}</span>
                                <span className={styles.entityCurrency}>{e.currency}</span>
                                <span style={{ color: getScoreColor(e.latestScore) }}>
                                    {e.latestScore !== null ? formatNumber(Math.round(e.latestScore), locale) : '—'}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.orgList}>
                <AnimatePresence>
                    {orgs.map((org, i) => {
                        const isCurrent = org.id === currentOrgId;
                        const isLoading = switching === org.id;

                        return (
                            <motion.button
                                key={org.id}
                                className={`${styles.orgCard} ${isCurrent ? styles.active : ''}`}
                                onClick={() => !isCurrent && handleSwitch(org.id)}
                                disabled={isCurrent || !!switching}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className={styles.orgIcon}>
                                    {INDUSTRY_ICONS[org.industry] || '🏢'}
                                </div>

                                <div className={styles.orgInfo}>
                                    <span className={styles.orgName}>{org.name}</span>
                                    <span className={styles.orgStage}>
                                        {STAGE_LABELS[org.growth_stage]?.[locale as 'en' | 'ar'] || org.growth_stage}
                                        {org.currency && org.currency !== 'SAR' && (
                                            <span className={styles.currencyBadge}>{org.currency}</span>
                                        )}
                                        {org.corp_tax_rate && Number(org.corp_tax_rate) > 0 && (
                                            <span className={styles.taxBadge}>
                                                {locale === 'ar' ? 'ضريبة' : 'Tax'} {Math.round(Number(org.corp_tax_rate) * 100)}%
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className={styles.orgScore}>
                                    <span
                                        className={styles.scoreValue}
                                        style={{ color: getScoreColor(org.total_score) }}
                                    >
                                        {org.total_score !== null ? formatNumber(Math.round(org.total_score), locale) : '—'}
                                    </span>
                                    <span className={styles.scoreTrend}>
                                        {getTrendArrow(org.trajectory_direction)}
                                    </span>
                                </div>

                                <div className={styles.action}>
                                    {isCurrent ? (
                                        <span className={styles.currentBadge}>{t('current')}</span>
                                    ) : isLoading ? (
                                        <span className={styles.loadingDot}>⏳</span>
                                    ) : (
                                        <span className={styles.switchBtn}>{t('switch')}</span>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
