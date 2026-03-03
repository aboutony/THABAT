'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Shell from '@/components/Shell';
import styles from './receivables.module.css';

export default function ReceivablesReportPage() {
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';
    const t = useTranslations('receivables');

    const placeholders = [t('agingBuckets'), t('topDebtors'), t('collectionRate')];

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    ← {t('back')}
                </Link>

                <motion.div
                    className={`glass-card ${styles.hero}`}
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                    <div className={styles.iconCircle}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <h1 className={styles.title}>{t('title')}</h1>
                    <p className={styles.subtitle}>{t('subtitle')}</p>
                    <div className={styles.badge}>{t('badge')}</div>
                </motion.div>

                <div className={styles.placeholderGrid}>
                    {placeholders.map((label, i) => (
                        <motion.div
                            key={label}
                            className={`glass-card ${styles.placeholderCard}`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                        >
                            <div className={styles.placeholderBar} />
                            <span className={styles.placeholderLabel}>{label}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Shell>
    );
}
