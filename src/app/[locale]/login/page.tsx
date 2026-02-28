'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import styles from './auth.module.css';

export default function LoginPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('./');
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authContainer}>
                {/* Branding */}
                <div className={styles.brandHeader}>
                    <div className={styles.brandIcon}>◆</div>
                    <h1 className={styles.brandTitle}>THABAT</h1>
                    <p className={styles.brandSubtitle}>{t('tagline')}</p>
                </div>

                {/* Theme & Language — centered, thumb-accessible */}
                <div className={styles.authToggles}>
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className={`glass-card ${styles.authForm}`}>
                    <h2 className={styles.formTitle}>{t('login')}</h2>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.field}>
                        <label className={styles.label}>{t('email')}</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="executive@company.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>{t('password')}</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? t('loading') : t('loginBtn')}
                    </button>

                    <p className={styles.switchLink}>
                        {t('noAccount')}{' '}
                        <a href="./signup" className={styles.link}>{t('signupLink')}</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
