'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    rightAction?: React.ReactNode;
}

/**
 * Mobile-first page header with a glass-morphic back button.
 * Used on sub-pages (Analytics, Alerts, Settings) for consistent navigation.
 */
export default function PageHeader({ title, subtitle, rightAction }: PageHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    // analytics root → home; every other sub-page → analytics
    const isAnalyticsRoot = pathname === `/${locale}/analytics`;
    const backHref = isAnalyticsRoot ? `/${locale}` : `/${locale}/analytics`;

    return (
        <div className={styles.header}>
            <button
                className={styles.backBtn}
                onClick={() => router.push(backHref)}
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
            {/* Right slot — spacer keeps title centred when empty */}
            {rightAction ?? <div className={styles.spacer} />}
        </div>
    );
}
