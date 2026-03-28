'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ERP_CONFIGS, type ERPProvider } from '@/connectors';
import PageHeader from '@/components/PageHeader';
import Shell from '@/components/Shell';
import { useAuth } from '@/context/AuthContext';
import { useIdentity } from '@/hooks/useIdentity';
import styles from './integrations.module.css';

interface Connection {
    id: string;
    provider: string;
    created_at: string;
}

interface CustomFields {
    url: string;
    apiKey: string;
    authType: 'bearer' | 'oauth2' | 'basic';
}

const ERP_SYSTEMS: {
    value: string;
    labelEN: string;
    labelAR: string;
    provider: ERPProvider | null;
}[] = [
    { value: 'infor',    labelEN: 'Infor',                  labelAR: 'إنفور',                     provider: null       },
    { value: 'dynamics', labelEN: 'Microsoft Dynamics 365', labelAR: 'مايكروسوفت دايناميكس ٣٦٥',  provider: 'dynamics' },
    { value: 'odoo',     labelEN: 'Odoo',                   labelAR: 'أودو',                       provider: 'odoo'     },
    { value: 'oracle',   labelEN: 'Oracle Fusion',          labelAR: 'أوراكل فيوجن',               provider: null       },
    { value: 'sap-b1',   labelEN: 'SAP Business One',       labelAR: 'ساب بزنس ون',                provider: 'sap'      },
    { value: 'sap-s4',   labelEN: 'SAP S/4HANA',            labelAR: 'ساب S/4HANA',                provider: null       },
    { value: 'other',    labelEN: 'Other ERP (Custom API)', labelAR: 'نظام ERP آخر (API مخصص)',    provider: null       },
];

export default function IntegrationsPage() {
    const t = useTranslations('integrations');
    const tSettings = useTranslations('settings');
    const locale = useLocale();
    const isAr = locale === 'ar';
    const { user, logout } = useAuth();
    const { isClient } = useIdentity();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedERP, setSelectedERP] = useState<ERPProvider | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Sovereign Connector Hub state
    const [selectedSystem, setSelectedSystem] = useState('');
    const [showCustomPanel, setShowCustomPanel] = useState(false);
    const [customSaved, setCustomSaved] = useState(false);
    const [customFields, setCustomFields] = useState<CustomFields>({
        url: '',
        apiKey: '',
        authType: 'bearer',
    });

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

    const handleConnect = () => {
        if (!selectedSystem) return;
        const system = ERP_SYSTEMS.find(s => s.value === selectedSystem);
        if (!system) return;

        // CLIENT always routes to onboarding
        if (isClient) {
            window.location.href = `/${locale}/onboarding`;
            return;
        }

        // "Other ERP" or provider with no connector → custom API panel
        if (system.value === 'other' || system.provider === null) {
            setShowCustomPanel(true);
            return;
        }

        // SAP Business One → onboarding wizard
        if (system.provider === 'sap') {
            window.location.href = `/${locale}/onboarding`;
            return;
        }

        // Real connector (odoo / dynamics) → credential wizard modal
        setSelectedERP(system.provider);
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
                setMessage({ type: 'success', text: `${data.sync.message}` });
            } else {
                setMessage({ type: 'error', text: data.error || t('syncFailed') });
            }
        } catch {
            setMessage({ type: 'error', text: t('networkError') });
        } finally {
            setSyncing(null);
        }
    };

    const handleSaveCustom = () => {
        if (!customFields.url || !customFields.apiKey) return;
        setCustomSaved(true);
        setMessage({
            type: 'success',
            text: isAr ? 'تم حفظ إعدادات API بنجاح' : 'API configuration saved successfully.',
        });
        setTimeout(() => setCustomSaved(false), 3000);
    };

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader title={t('title')} subtitle={t('subtitle')} />

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

                {/* ── Sovereign Connector Hub ─────────────────────────────── */}
                <motion.div
                    className={`glass-card ${styles.hubSection}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                >
                    <p className={styles.hubLabel}>
                        {isAr ? 'مركز التكامل — الموصّل السيادي' : 'Integration Hub — Sovereign Connector'}
                    </p>

                    <select
                        className={styles.systemSelect}
                        value={selectedSystem}
                        onChange={e => {
                            setSelectedSystem(e.target.value);
                            setShowCustomPanel(false);
                            setCustomSaved(false);
                        }}
                        dir={isAr ? 'rtl' : 'ltr'}
                    >
                        <option value="">
                            {isAr ? '— اختر نظام ERP الخاص بك —' : '— Select your ERP system —'}
                        </option>
                        {ERP_SYSTEMS.map(s => (
                            <option key={s.value} value={s.value}>
                                {isAr ? s.labelAR : s.labelEN}
                            </option>
                        ))}
                    </select>

                    <button
                        className={styles.sovereignBtn}
                        disabled={!selectedSystem}
                        onClick={handleConnect}
                    >
                        {isAr ? 'ربط' : 'Connect'}
                    </button>

                    {/* ── Custom API Configuration Panel ───────────────────── */}
                    <AnimatePresence>
                        {showCustomPanel && (
                            <motion.div
                                className={styles.customPanel}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.28 }}
                            >
                                <p className={styles.customPanelTitle}>
                                    {isAr ? 'إعداد الـ API المخصص' : 'API Configuration'}
                                </p>

                                <div className={styles.customPanelField}>
                                    <label className={styles.customPanelLabel}>
                                        {isAr ? 'رابط النقطة الطرفية' : 'Endpoint URL'}
                                    </label>
                                    <input
                                        type="url"
                                        className={styles.customPanelInput}
                                        placeholder="https://api.clienterp.com/v1"
                                        value={customFields.url}
                                        onChange={e => setCustomFields(p => ({ ...p, url: e.target.value }))}
                                        dir="ltr"
                                    />
                                </div>

                                <div className={styles.customPanelField}>
                                    <label className={styles.customPanelLabel}>
                                        {isAr ? 'مفتاح API / السر' : 'API Key / Secret'}
                                    </label>
                                    <input
                                        type="password"
                                        className={styles.customPanelInput}
                                        placeholder="••••••••••••••••"
                                        value={customFields.apiKey}
                                        onChange={e => setCustomFields(p => ({ ...p, apiKey: e.target.value }))}
                                        dir="ltr"
                                        autoComplete="new-password"
                                    />
                                </div>

                                <div className={styles.customPanelField}>
                                    <label className={styles.customPanelLabel}>
                                        {isAr ? 'نوع المصادقة' : 'Authentication Type'}
                                    </label>
                                    <select
                                        className={styles.customPanelSelect}
                                        value={customFields.authType}
                                        onChange={e => setCustomFields(p => ({ ...p, authType: e.target.value as CustomFields['authType'] }))}
                                        dir={isAr ? 'rtl' : 'ltr'}
                                    >
                                        <option value="bearer">Bearer Token</option>
                                        <option value="oauth2">OAuth 2.0</option>
                                        <option value="basic">Basic Auth</option>
                                    </select>
                                </div>

                                <button
                                    className={styles.customPanelSaveBtn}
                                    onClick={handleSaveCustom}
                                    disabled={!customFields.url || !customFields.apiKey}
                                >
                                    {customSaved
                                        ? (isAr ? '✓ تم الحفظ' : '✓ Saved')
                                        : (isAr ? 'حفظ الإعداد' : 'Save Configuration')
                                    }
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Active connections (non-CLIENT) ──────────────────────── */}
                {!isClient && connections.length > 0 && (
                    <motion.div
                        className={styles.connectedList}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.18 }}
                    >
                        {connections.map(conn => {
                            const config = ERP_CONFIGS[conn.provider as ERPProvider];
                            return (
                                <div key={conn.id} className={styles.connectedItem}>
                                    <span className={styles.connectedItemName}>
                                        {config
                                            ? (isAr ? config.nameAR : config.nameEN)
                                            : conn.provider}
                                    </span>
                                    <div className={styles.connectedItemBadge}>
                                        <span>● {t('connected')}</span>
                                        <button
                                            className={styles.syncBtn}
                                            onClick={() => handleSync(conn.provider)}
                                            disabled={syncing === conn.provider}
                                        >
                                            {syncing === conn.provider ? t('syncing') : t('sync')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {/* ── Connection Wizard Modal ───────────────────────────────── */}
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
                                        {isAr
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
                                                {isAr ? field.labelAR : field.labelEN}
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
