'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import styles from './Shell.module.css';

interface ShellProps {
    children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
    const tApp = useTranslations('app');
    const tNav = useTranslations('nav');
    const pathname = usePathname();
    const { user } = useAuth();

    // Detect locale from pathname
    const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
    const isAdmin = user?.role === 'admin';

    // Active tab detection
    const isActive = (path: string) => {
        if (path === '') return pathname === `/${locale}` || pathname === `/${locale}/`;
        return pathname.includes(`/${path}`);
    };

    const allNavItems = [
        {
            path: '',
            label: tNav('home'),
            adminOnly: false,
            alertGlow: false,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
        },
        {
            path: 'analytics',
            label: tNav('analytics'),
            adminOnly: false,
            alertGlow: false,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            ),
        },
        {
            path: 'alerts',
            label: tNav('alerts'),
            adminOnly: true,
            alertGlow: true, // Executive Action glow when alerts are active
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            ),
        },
        {
            path: 'settings',
            label: tNav('settings'),
            adminOnly: false,
            alertGlow: false,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
    ];

    // Filter: admin-only tabs hidden from regular users
    const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

    return (
        <div className={styles.shell}>
            {/* Top App Bar */}
            <header className={`glass-nav ${styles.header}`}>
                <div className={styles.brand}>
                    <img src="/thabat-logo.png" alt="THABAT" className={styles.logo} width={32} height={32} />
                    <div className={styles.brandText}>
                        <span className={styles.title}>{tApp('title')}</span>
                        <span className={styles.subtitle}>{tApp('subtitle')}</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <LanguageToggle />
                    <ThemeToggle />
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                {children}
            </main>

            {/* Floating Glass Bottom Navigation */}
            <nav className={styles.bottomNav}>
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={`/${locale}/${item.path}`}
                        className={`${styles.navItem} ${isActive(item.path) ? styles.navActive : ''} ${item.alertGlow ? styles.navAlertGlow : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}

