'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { formatNumber } from '@/lib/locale-utils';
import styles from './PercentileBadge.module.css';

interface PercentileBadgeProps {
    percentile: number;   // e.g., 12 means "Top 12%"
    industryLabel: string;
}

export default function PercentileBadge({ percentile, industryLabel }: PercentileBadgeProps) {
    const t = useTranslations('benchmark');
    const locale = useLocale();

    const tierIcon = percentile <= 10 ? '🏆' : percentile <= 25 ? '🥇' : percentile <= 50 ? '🥈' : '📊';

    return (
        <motion.div
            className={`glass-card ${styles.badge}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: 'spring', stiffness: 120 }}
        >
            <span className={styles.icon}>{tierIcon}</span>
            <div className={styles.content}>
                <span className={styles.rank}>
                    {t('topPercent', { value: formatNumber(percentile, locale) })}
                </span>
                <span className={styles.industry}>{industryLabel}</span>
            </div>
        </motion.div>
    );
}
