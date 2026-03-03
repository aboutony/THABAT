'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { formatScore } from '@/lib/locale-utils';
import styles from './StabilityRing.module.css';

type Trend = 'strengthening' | 'stable' | 'weakening';

interface StabilityRingProps {
    score: number;       // 0–100
    trend: Trend;
    locale?: string;
    loading?: boolean;   // Show shimmer 'Computing...' state
}

export default function StabilityRing({ score, trend, locale = 'en', loading = false }: StabilityRingProps) {
    const t = useTranslations('stability');

    // SVG geometry — pixel-locked 220px diameter
    const size = 220;
    const strokeWidth = 14;
    const center = size / 2;
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(100, score));
    const dashOffset = circumference - (progress / 100) * circumference;

    // Color based on score
    const getStrokeColor = () => {
        if (score >= 70) return 'url(#ringGradient)';
        if (score >= 40) return 'url(#ringGradientAmber)';
        return 'url(#ringGradientRed)';
    };

    const getGlowColor = () => {
        if (score >= 70) return 'var(--ring-glow-green)';
        if (score >= 40) return 'var(--ring-glow-amber)';
        return 'var(--ring-glow-red)';
    };

    const getGlowClass = () => {
        if (score >= 70) return styles.glowGreen;
        if (score >= 40) return styles.glowAmber;
        return styles.glowRed;
    };

    // Trajectory arrow rotation
    const getArrowRotation = () => {
        switch (trend) {
            case 'strengthening': return -45;
            case 'stable': return 0;
            case 'weakening': return 45;
        }
    };

    const getTrendLabel = () => t(trend);

    const getTrendColor = () => {
        switch (trend) {
            case 'strengthening': return 'var(--success)';
            case 'stable': return 'var(--text-secondary)';
            case 'weakening': return 'var(--danger)';
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.ringWrapper} ${loading ? styles.shimmerLoading : getGlowClass()}`} style={{ width: size, height: size }}>
                <svg
                    className={styles.svg}
                    viewBox={`0 0 ${size} ${size}`}
                    width={size}
                    height={size}
                >
                    {/* Gradient definitions */}
                    <defs>
                        {/* Glow filter */}
                        <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        {/* Green gradient — Saudi Green */}
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#006C35" stopOpacity="1" />
                            <stop offset="50%" stopColor="#00a550" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#006C35" stopOpacity="0.7" />
                        </linearGradient>
                        {/* Amber gradient */}
                        <linearGradient id="ringGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
                        </linearGradient>
                        {/* Red gradient */}
                        <linearGradient id="ringGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                            <stop offset="50%" stopColor="#f87171" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
                        </linearGradient>
                    </defs>

                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="var(--ring-track)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Soft underglow arc (wider, blurred) */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={getStrokeColor()}
                        strokeWidth={strokeWidth + 12}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
                        transform={`rotate(-90 ${center} ${center})`}
                        opacity={0.15}
                        filter="url(#ringGlow)"
                    />

                    {/* Main progress arc */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={getStrokeColor()}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
                        transform={`rotate(-90 ${center} ${center})`}
                    />
                </svg>

                {/* Inner content */}
                <div className={styles.inner}>
                    {loading ? (
                        <motion.div
                            className={styles.computingText}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {locale === 'ar' ? 'جارٍ الحساب...' : 'Computing...'}
                        </motion.div>
                    ) : (
                        <motion.div
                            className={styles.scoreValue}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 100 }}
                        >
                            {formatScore(score, locale)}
                        </motion.div>
                    )}
                    <div className={styles.scoreLabel}>{t('score')}</div>

                    {/* Trajectory Arrow */}
                    <motion.div
                        className={styles.trendRow}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.4, duration: 0.5 }}
                    >
                        <motion.svg
                            className={styles.arrow}
                            viewBox="0 0 24 24"
                            fill="none"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: getArrowRotation() }}
                            transition={{ duration: 0.6, type: 'spring', stiffness: 150 }}
                            style={{ color: getTrendColor() }}
                        >
                            <path
                                d="M5 12h14M13 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                        <span className={styles.trendLabel} style={{ color: getTrendColor() }}>
                            {getTrendLabel()}
                        </span>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
