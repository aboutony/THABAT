'use client';

import { useRouter } from 'next/navigation';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
}

/**
 * Mobile-first page header with a glass-morphic back button.
 * Used on sub-pages (Analytics, Alerts, Settings) for consistent navigation.
 */
export default function PageHeader({ title, subtitle }: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className={styles.header}>
            <button
                className={styles.backBtn}
                onClick={() => router.back()}
                aria-label="Go back"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <div className={styles.headerText}>
                <h2 className={styles.title}>{title}</h2>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {/* Spacer to center the title */}
            <div className={styles.spacer} />
        </div>
    );
}
