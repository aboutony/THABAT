'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
}

const INDUSTRY_ICONS: Record<string, string> = {
    Technology: '💻',
    Retail: '🏬',
    Manufacturing: '🏭',
    'Professional Services': '📊',
};

const STAGE_LABELS: Record<string, { en: string; ar: string }> = {
    'high-growth': { en: 'High Growth', ar: 'نمو عالٍ' },
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
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    const adminKey = typeof window !== 'undefined'
        ? (document.querySelector('meta[name="admin-key"]') as HTMLMetaElement)?.content || ''
        : '';

    const fetchOrgs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/switch-org', {
                headers: { 'x-admin-key': adminKey || 'demo-key-2026' },
            });
            if (res.ok) {
                const data = await res.json();
                setOrgs(data.orgs || []);
            }
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, [adminKey]);

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    const handleSwitch = async (orgId: string) => {
        if (switching) return;
        setSwitching(orgId);

        try {
            const res = await fetch('/api/admin/switch-org', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey || 'demo-key-2026',
                },
                body: JSON.stringify({ orgId }),
            });

            if (res.ok) {
                // Full state purge + hard reload
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
                                        {STAGE_LABELS[org.growth_stage]?.[locale] || org.growth_stage}
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
