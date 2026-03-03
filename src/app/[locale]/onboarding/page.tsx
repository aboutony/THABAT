'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './Onboarding.module.css';

type Step = 'credentials' | 'branches' | 'testing' | 'success';
type TestState = 'idle' | 'syncing' | 'success' | 'error';

interface SAPFields {
    serviceLayerUrl: string;
    companyDB: string;
    username: string;
    password: string;
}

const BRANCHES = [
    { flag: '🇸🇦', name: 'UNIMED KSA (Riyadh)', db: 'UNIMED_KSA' },
    { flag: '🇦🇪', name: 'UNIMED UAE (Dubai)', db: 'UNIMED_UAE' },
];

export default function OnboardingPage() {
    const t = useTranslations('onboarding');
    const locale = useLocale();
    const isRtl = locale === 'ar';

    const [step, setStep] = useState<Step>('credentials');
    const [testState, setTestState] = useState<TestState>('idle');
    const [fields, setFields] = useState<SAPFields>({
        serviceLayerUrl: '',
        companyDB: '',
        username: '',
        password: '',
    });
    const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set(['UNIMED_KSA', 'UNIMED_UAE']));

    const steps: Step[] = ['credentials', 'branches', 'testing', 'success'];
    const currentIdx = steps.indexOf(step);

    const updateField = (key: keyof SAPFields, value: string) => {
        setFields(prev => ({ ...prev, [key]: value }));
    };

    const isCredentialsValid = fields.serviceLayerUrl && fields.companyDB && fields.username && fields.password;

    const handleTestConnection = async () => {
        setTestState('syncing');

        // Simulate SAP Service Layer connection test (2.5s)
        await new Promise(resolve => setTimeout(resolve, 2500));

        // For demo: if URL contains 'sap' or any non-empty URL, succeed
        if (fields.serviceLayerUrl.length > 5) {
            setTestState('success');
            setTimeout(() => setStep('success'), 1500);
        } else {
            setTestState('error');
            setTimeout(() => setTestState('idle'), 3000);
        }
    };

    const toggleBranch = (db: string) => {
        setSelectedBranches(prev => {
            const next = new Set(prev);
            if (next.has(db)) next.delete(db);
            else next.add(db);
            return next;
        });
    };

    // Ring animation
    const circumference = 2 * Math.PI * 52;
    const ringOffset = testState === 'syncing' ? circumference * 0.3
        : testState === 'success' ? 0
            : circumference;

    return (
        <div className={styles.wizardShell} dir={isRtl ? 'rtl' : 'ltr'}>
            <motion.div
                className={styles.glassCard}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.logoArea}>
                        <img src="/thabat-logo.png" alt="THABAT" width={36} height={36} />
                        <span className={styles.sapBadge}>🔷 SAP B1</span>
                    </div>
                    <h1 className={styles.wizardTitle}>{t('title')}</h1>
                    <p className={styles.wizardSubtitle}>{t('subtitle')}</p>
                </div>

                {/* Steps indicator */}
                <div className={styles.stepsBar}>
                    {steps.map((s, i) => (
                        <span key={s}>
                            <span className={`${styles.stepDot} ${i === currentIdx ? styles.active : ''} ${i < currentIdx ? styles.complete : ''}`} />
                            {i < steps.length - 1 && <span className={styles.stepLine} />}
                        </span>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: SAP Credentials */}
                    {step === 'credentials' && (
                        <motion.div
                            key="creds"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className={styles.form}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>{t('serviceLayerUrl')}</label>
                                    <input
                                        id="sap-url"
                                        className={styles.fieldInput}
                                        type="url"
                                        placeholder="https://sap-server:50000/b1s/v1"
                                        value={fields.serviceLayerUrl}
                                        onChange={e => updateField('serviceLayerUrl', e.target.value)}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>{t('companyDB')}</label>
                                    <input
                                        id="sap-db"
                                        className={styles.fieldInput}
                                        type="text"
                                        placeholder="UNIMED_PROD"
                                        value={fields.companyDB}
                                        onChange={e => updateField('companyDB', e.target.value)}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>{t('username')}</label>
                                    <input
                                        id="sap-user"
                                        className={styles.fieldInput}
                                        type="text"
                                        placeholder="manager"
                                        value={fields.username}
                                        onChange={e => updateField('username', e.target.value)}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>{t('password')}</label>
                                    <input
                                        id="sap-pass"
                                        className={styles.fieldInput}
                                        type="password"
                                        placeholder="••••••••"
                                        value={fields.password}
                                        onChange={e => updateField('password', e.target.value)}
                                    />
                                </div>
                                <div className={styles.actions}>
                                    <Link href={`/${locale}/settings`} className={styles.btnBack}>
                                        ← {t('cancel')}
                                    </Link>
                                    <button
                                        className={styles.btnPrimary}
                                        disabled={!isCredentialsValid}
                                        onClick={() => setStep('branches')}
                                    >
                                        {t('nextStep')} →
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Branch Mapping */}
                    {step === 'branches' && (
                        <motion.div
                            key="branches"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className={styles.form}>
                                <div className={styles.branchSection}>
                                    <h3 className={styles.branchTitle}>🏭 {t('branchMapping')}</h3>
                                    {BRANCHES.map(b => (
                                        <label key={b.db} className={styles.branchRow}>
                                            <input
                                                type="checkbox"
                                                checked={selectedBranches.has(b.db)}
                                                onChange={() => toggleBranch(b.db)}
                                            />
                                            <span className={styles.branchFlag}>{b.flag}</span>
                                            <span className={styles.branchName}>{b.name}</span>
                                            <span className={styles.branchDb}>{b.db}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className={styles.actions}>
                                    <button className={styles.btnBack} onClick={() => setStep('credentials')}>
                                        ← {t('back')}
                                    </button>
                                    <button
                                        className={styles.btnPrimary}
                                        disabled={selectedBranches.size === 0}
                                        onClick={() => { setStep('testing'); handleTestConnection(); }}
                                    >
                                        🔌 {t('testConnection')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Test Connection — Syncing Ring */}
                    {step === 'testing' && (
                        <motion.div
                            key="testing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className={styles.ringContainer}>
                                <div className={styles.syncRing}>
                                    <svg className={styles.syncRingSVG} viewBox="0 0 120 120">
                                        <circle className={styles.ringTrack} cx="60" cy="60" r="52" />
                                        <circle
                                            className={`${styles.ringProgress} ${styles[testState]}`}
                                            cx="60" cy="60" r="52"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={ringOffset}
                                        />
                                    </svg>
                                    <span className={styles.ringLabel}>
                                        <span className={styles.ringIcon}>
                                            {testState === 'syncing' ? '🔄' : testState === 'success' ? '✅' : testState === 'error' ? '❌' : '🔌'}
                                        </span>
                                        {testState === 'syncing' ? t('syncing') : testState === 'success' ? t('connected') : testState === 'error' ? t('failed') : ''}
                                    </span>
                                </div>
                                <p className={`${styles.statusMessage} ${styles[testState]}`}>
                                    {testState === 'syncing' && t('syncingMessage')}
                                    {testState === 'success' && t('successMessage')}
                                    {testState === 'error' && t('errorMessage')}
                                </p>
                                {testState === 'error' && (
                                    <button className={styles.btnPrimary} onClick={() => { setStep('credentials'); setTestState('idle'); }}>
                                        ← {t('tryAgain')}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        >
                            <div className={styles.successCard}>
                                <div className={styles.successIcon}>🎉</div>
                                <h2 className={styles.successTitle}>{t('successTitle')}</h2>
                                <p className={styles.successDesc}>{t('successDesc')}</p>
                                <Link href={`/${locale}`} className={styles.btnDashboard}>
                                    📊 {t('goToDashboard')}
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
