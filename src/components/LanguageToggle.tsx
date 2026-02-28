'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import styles from './LanguageToggle.module.css';

export default function LanguageToggle() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('language');

    const toggleLocale = () => {
        const nextLocale = locale === 'en' ? 'ar' : 'en';
        // Persist preference to server (fire-and-forget)
        fetch('/api/auth/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ languagePreference: nextLocale }),
        }).catch(() => { });
        // Replace the current locale prefix in the pathname
        const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '');
        router.push(`/${nextLocale}${pathWithoutLocale || '/'}`);
    };

    return (
        <button
            className={styles.toggle}
            onClick={toggleLocale}
            aria-label={`Switch to ${locale === 'en' ? 'Arabic' : 'English'}`}
        >
            <span className={styles.label}>{t('toggle')}</span>
        </button>
    );
}
