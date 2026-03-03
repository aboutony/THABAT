'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Shell from '@/components/Shell';
import styles from './receivables.module.css';

export default function ReceivablesReportPage() {
    const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/ar') ? 'ar' : 'en';

    return (
        <Shell>
            <div className={styles.page}>
                {/* Back Link */}
                <Link href={`/${locale}`} className={styles.backLink}>
                    ← {locale === 'ar' ? 'العودة' : 'Back'}
                </Link>

                {/* Placeholder Hero */}
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
                    <h1 className={styles.title}>
                        {locale === 'ar' ? 'تقرير المستحقات' : 'Receivables Report'}
                    </h1>
                    <p className={styles.subtitle}>
                        {locale === 'ar' ? 'قريبًا — تحليل الذمم المدينة المفصل' : 'Coming Soon — Detailed Receivables Analytics'}
                    </p>
                    <div className={styles.badge}>
                        {locale === 'ar' ? 'قيد التطوير' : 'Under Development'}
                    </div>
                </motion.div>

                {/* Placeholder Cards */}
                <div className={styles.placeholderGrid}>
                    {['Aging Buckets', 'Top Debtors', 'Collection Rate'].map((label, i) => (
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
