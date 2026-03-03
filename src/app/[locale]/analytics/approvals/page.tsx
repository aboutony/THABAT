'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import styles from './approvals.module.css';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    product: string;
    sku: string;
    supplier: string;
    amount: number;
    currency: string;
    date: string;
    urgency: 'high' | 'medium' | 'low';
    status: 'pending' | 'approved' | 'rejected';
}

const PENDING_POS: PurchaseOrder[] = [
    {
        id: 'po-001',
        poNumber: 'PO-2026-0847',
        product: 'Suture Braid Silk 2/0 – 75cm',
        sku: 'SBS-20-75',
        supplier: 'Medline Saudi Arabia',
        amount: 939.80,
        currency: 'SAR',
        date: '2026-03-01',
        urgency: 'high',
        status: 'pending',
    },
    {
        id: 'po-002',
        poNumber: 'PO-2026-0848',
        product: 'Surgical Gloves – Sterile (Box/50)',
        sku: 'SG-ST-50',
        supplier: 'Al-Borg Medical Supplies',
        amount: 1250.00,
        currency: 'SAR',
        date: '2026-03-02',
        urgency: 'medium',
        status: 'pending',
    },
    {
        id: 'po-003',
        poNumber: 'PO-2026-0849',
        product: 'IV Cannula 20G – Safety',
        sku: 'IVC-20G-S',
        supplier: 'Becton Dickinson KSA',
        amount: 2180.00,
        currency: 'SAR',
        date: '2026-03-03',
        urgency: 'low',
        status: 'pending',
    },
];

export default function ApprovalsPage() {
    const locale = useLocale();
    const t = useTranslations('approvals');
    const tc = useTranslations('common');
    const [orders, setOrders] = useState<PurchaseOrder[]>(PENDING_POS);
    const [toast, setToast] = useState<string | null>(null);

    const handleApprove = (id: string) => {
        setOrders(prev =>
            prev.map(po =>
                po.id === id ? { ...po, status: 'approved' as const } : po
            )
        );
        setToast(t('toastSuccess'));
        setTimeout(() => setToast(null), 3500);
    };

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const approvedCount = orders.filter(o => o.status === 'approved').length;
    const totalPending = orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.amount, 0);

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const urgencyLabel = (u: string) => {
        switch (u) {
            case 'high': return `🔴 ${t('urgent')}`;
            case 'medium': return `🟡 ${t('standard')}`;
            case 'low': return `🟢 ${t('lowPriority')}`;
            default: return u;
        }
    };

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}/settings`} className={styles.backLink}>
                    ← {t('back')}
                </Link>

                {/* Summary */}
                <motion.div
                    className={`glass-card ${styles.summaryCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.summaryTitle}>{t('title')}</div>
                    <div className={styles.summaryRow}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryNumber}>{formatNumber(pendingCount, locale)}</span>
                            <span className={styles.summaryLabel}>{t('pending')}</span>
                        </div>
                        <div className={styles.summaryDivider} />
                        <div className={styles.summaryItem}>
                            <span className={`${styles.summaryNumber} ${styles.approved}`}>{formatNumber(approvedCount, locale)}</span>
                            <span className={styles.summaryLabel}>{t('approved')}</span>
                        </div>
                        <div className={styles.summaryDivider} />
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryNumber}>{formatSAR(totalPending)}</span>
                            <span className={styles.summaryLabel}>{t('pendingValue')}</span>
                        </div>
                    </div>
                </motion.div>

                {/* PO List */}
                <div className={styles.poList}>
                    {orders.map((po, i) => (
                        <motion.div
                            key={po.id}
                            className={`glass-card ${styles.poCard} ${po.status === 'approved' ? styles.poApproved : ''}`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                            layout
                        >
                            <div className={styles.poHeader}>
                                <div className={styles.poMeta}>
                                    <span className={styles.poNumber}>{po.poNumber}</span>
                                    <span className={styles.poUrgency}>{urgencyLabel(po.urgency)}</span>
                                </div>
                                <span className={styles.poAmount}>{formatSAR(po.amount)}</span>
                            </div>

                            <div className={styles.poBody}>
                                <div className={styles.poProduct}>
                                    <span className={styles.productName}>{po.product}</span>
                                    <span className={styles.productSku}>{po.sku}</span>
                                </div>
                                <span className={styles.poSupplier}>{po.supplier}</span>
                            </div>

                            <div className={styles.poFooter}>
                                {po.status === 'approved' ? (
                                    <motion.div
                                        className={styles.approvedBadge}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 200 }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {t('approvedSynced')}
                                    </motion.div>
                                ) : (
                                    <button
                                        className={styles.approveBtn}
                                        onClick={() => handleApprove(po.id)}
                                    >
                                        {t('approveBtn')}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            className={styles.toast}
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span>{toast}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Shell>
    );
}
