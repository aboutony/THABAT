'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ERP_CONFIGS, type ERPProvider } from '@/connectors';
import PageHeader from '@/components/PageHeader';
import OrgSwitcher from '@/components/OrgSwitcher';
import Shell from '@/components/Shell';
import { useAuth } from '@/context/AuthContext';
import styles from './integrations.module.css';

interface Connection {
    id: string;
    provider: string;
    created_at: string;
}

export default function IntegrationsPage() {
    const t = useTranslations('integrations');
    const tSettings = useTranslations('settings');
    const locale = useLocale();
    const { user, logout } = useAuth();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedERP, setSelectedERP] = useState<ERPProvider | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchConnections = useCallback(async () => {
        try {
            const res = await fetch('/api/integrations');
            if (res.ok) {
                const data = await res.json();
                setConnections(data.connections || []);
            }
        } catch { /* no connections yet */ }
    }, []);

    useEffect(() => { fetchConnections(); }, [fetchConnections]);

    const isConnected = (provider: string) =>
        connections.some(c => c.provider === provider);

    const handleSelectERP = (provider: ERPProvider) => {
        setSelectedERP(provider);
        setCredentials({});
        setMessage(null);
    };

    const handleSaveCredentials = async () => {
        if (!selectedERP) return;
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: selectedERP, credentials }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: t('connectionSuccess') });
                setSelectedERP(null);
                fetchConnections();
            } else {
                setMessage({ type: 'error', text: data.error || t('connectionFailed') });
            }
        } catch {
            setMessage({ type: 'error', text: t('networkError') });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (provider: string) => {
        setSyncing(provider);
        setMessage(null);

        try {
            const res = await fetch('/api/integrations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({
                    type: 'success',
                    text: `${data.sync.message}`,
                });
            } else {
                setMessage({ type: 'error', text: data.error || t('syncFailed') });
            }
        } catch {
            setMessage({ type: 'error', text: t('networkError') });
        } finally {
            setSyncing(null);
        }
    };

    const providers: ERPProvider[] = ['odoo', 'sap', 'dynamics'];

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader title={t('title')} subtitle={t('subtitle')} />

                {/* Demo Org Switcher */}
                <OrgSwitcher />

                {/* Status Message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            className={`${styles.message} ${styles[message.type]}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {message.type === 'success' ? '✓' : '✗'} {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ERP Cards */}
                <div className={styles.erpGrid}>
                    {providers.map((provider, i) => {
                        const config = ERP_CONFIGS[provider];
                        const connected = isConnected(provider);

                        return (
                            <motion.div
                                key={provider}
                                className={`glass-card ${styles.erpCard} ${connected ? styles.connected : ''}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.erpHeader}>
                                    <span className={styles.erpIcon}>{config.icon}</span>
                                    <div>
                                        <div className={styles.erpName}>
                                            {locale === 'ar' ? config.nameAR : config.nameEN}
                                        </div>
                                        <div className={styles.erpDesc}>
                                            {locale === 'ar' ? config.descAR : config.descEN}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.erpActions}>
                                    {connected ? (
                                        <>
                                            <span className={styles.connectedBadge}>
                                                ● {t('connected')}
                                            </span>
                                            <button
                                                className={styles.syncBtn}
                                                onClick={() => handleSync(provider)}
                                                disabled={syncing === provider}
                                            >
                                                {syncing === provider ? t('syncing') : t('sync')}
                                            </button>
                                        </>
                                    ) : (
                                        provider === 'sap' ? (
                                            <a
                                                className={styles.connectBtn}
                                                href={`/${locale}/onboarding`}
                                            >
                                                {t('connect')}
                                            </a>
                                        ) : (
                                            <button
                                                className={styles.connectBtn}
                                                onClick={() => handleSelectERP(provider)}
                                            >
                                                {t('connect')}
                                            </button>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Connection Wizard Modal */}
                <AnimatePresence>
                    {selectedERP && (
                        <motion.div
                            className={styles.modalOverlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedERP(null)}
                        >
                            <motion.div
                                className={`glass-card ${styles.modal}`}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={styles.modalHeader}>
                                    <span className={styles.modalIcon}>
                                        {ERP_CONFIGS[selectedERP].icon}
                                    </span>
                                    <h3 className={styles.modalTitle}>
                                        {t('connectTo')}{' '}
                                        {locale === 'ar'
                                            ? ERP_CONFIGS[selectedERP].nameAR
                                            : ERP_CONFIGS[selectedERP].nameEN}
                                    </h3>
                                    <button
                                        className={styles.closeBtn}
                                        onClick={() => setSelectedERP(null)}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className={styles.modalBody}>
                                    {ERP_CONFIGS[selectedERP].fields.map((field) => (
                                        <div key={field.key} className={styles.field}>
                                            <label className={styles.fieldLabel}>
                                                {locale === 'ar' ? field.labelAR : field.labelEN}
                                            </label>
                                            <input
                                                type={field.type}
                                                className={styles.fieldInput}
                                                placeholder={field.placeholder}
                                                value={credentials[field.key] || ''}
                                                onChange={(e) =>
                                                    setCredentials(prev => ({
                                                        ...prev,
                                                        [field.key]: e.target.value,
                                                    }))
                                                }
                                                required={field.required}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.modalFooter}>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => setSelectedERP(null)}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        className={styles.saveBtn}
                                        onClick={handleSaveCredentials}
                                        disabled={loading}
                                    >
                                        {loading ? t('testing') : t('testAndSave')}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Account Section */}
                <div className={styles.accountSection}>
                    {user && (
                        <div className={styles.userInfo}>
                            <span className={styles.userIcon}>👤</span>
                            <div>
                                <div className={styles.userName}>{user.fullName}</div>
                                <div className={styles.userEmail}>{user.email}</div>
                            </div>
                        </div>
                    )}
                    <button
                        className={styles.logoutBtn}
                        onClick={logout}
                    >
                        {tSettings('logout')}
                    </button>
                </div>
            </div>
        </Shell>
    );
}
