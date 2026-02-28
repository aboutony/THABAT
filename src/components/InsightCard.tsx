'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ConsequenceInsight } from '@/lib/scoring';
import { formatNumber, toArabicDigits } from '@/lib/locale-utils';
import styles from './InsightCard.module.css';

interface InsightCardProps {
    insight: ConsequenceInsight;
}

export default function InsightCard({ insight }: InsightCardProps) {
    const t = useTranslations();
    const ts = useTranslations('scoring');
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    const severityIcon = {
        critical: '🔴',
        warning: '🟠',
        moderate: '🟡',
    }[insight.severity];

    const metricLabel = ts(insight.metricKey.replace('scoring.', ''));
    const localizedImpact = locale === 'ar' ? toArabicDigits(insight.impactValue) : insight.impactValue;
    const consequence = t(insight.consequenceKey, { value: localizedImpact });

    return (
        <motion.div
            className={`glass-card ${styles.card} ${styles[insight.severity]}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.8, duration: 0.6, ease: 'easeOut' }}
        >
            <div className={styles.header}>
                <span className={styles.icon}>{severityIcon}</span>
                <span className={styles.label}>{metricLabel}</span>
                <span className={styles.score}>{formatNumber(insight.score, locale)}</span>
            </div>
            <p className={styles.statement}>{consequence}</p>
        </motion.div>
    );
}
