'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import styles from '../login/auth.module.css';

export default function SignupPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const { signup } = useAuth();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        orgName: '',
        industry: '',
        revenueBand: '',
        growthStage: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signup(form);

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

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className={`glass-card ${styles.authForm}`}>
                    <h2 className={styles.formTitle}>{t('signup')}</h2>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.fieldRow}>
                        <div className={styles.field}>
                            <label className={styles.label}>{t('fullName')}</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={form.fullName}
                                onChange={(e) => update('fullName', e.target.value)}
                                placeholder={t('fullNamePlaceholder')}
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>{t('orgName')}</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={form.orgName}
                                onChange={(e) => update('orgName', e.target.value)}
                                placeholder={t('orgNamePlaceholder')}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>{t('email')}</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={form.email}
                            onChange={(e) => update('email', e.target.value)}
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
                            value={form.password}
                            onChange={(e) => update('password', e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <div className={styles.field}>
                            <label className={styles.label}>{t('industry')}</label>
                            <select
                                className={styles.input}
                                value={form.industry}
                                onChange={(e) => update('industry', e.target.value)}
                            >
                                <option value="">{t('selectIndustry')}</option>
                                <option value="retail">Retail</option>
                                <option value="technology">Technology</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="services">Professional Services</option>
                                <option value="hospitality">Hospitality</option>
                                <option value="healthcare">Healthcare</option>
                                <option value="construction">Construction</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>{t('revenueBand')}</label>
                            <select
                                className={styles.input}
                                value={form.revenueBand}
                                onChange={(e) => update('revenueBand', e.target.value)}
                            >
                                <option value="">{t('selectRevenue')}</option>
                                <option value="0-1m">0 - 1M SAR</option>
                                <option value="1-5m">1M - 5M SAR</option>
                                <option value="5-20m">5M - 20M SAR</option>
                                <option value="20-50m">20M - 50M SAR</option>
                                <option value="50m+">50M+ SAR</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? t('loading') : t('signupBtn')}
                    </button>

                    <p className={styles.switchLink}>
                        {t('hasAccount')}{' '}
                        <a href="./login" className={styles.link}>{t('loginLink')}</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
