'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import styles from './efficiency.module.css';

const VELOCITY = {
    orderToCash: 142,
    sectorAverage: 160,
    improvement: 11.3,
};

const FULFILLMENT_STAGES = [
    { key: 'production', status: 'complete', daysSpent: 18 },
    { key: 'logistics', status: 'complete', daysSpent: 12 },
    { key: 'nupcoAcceptance', status: 'active', daysSpent: 7 },
    { key: 'paymentPending', status: 'pending', daysSpent: 0 },
];

const INVENTORY = [
    {
        product: { en: 'Urological Catheter – Foley 2-Way', ar: 'قسطرة بولية – فولي ثنائية الاتجاه' },
        sku: 'UC-F2W-16',
        stock: 14,
        maxDays: 90,
        restockQty: 11.25,
        restockCost: 7312.50,
        critical: true,
    },
    {
        product: { en: 'Suture Braid Silk 2/0 – 75cm', ar: 'خيط جراحي حريري مجدول 2/0 – 75سم' },
        sku: 'SBS-20-75',
        stock: 42,
        maxDays: 90,
        restockQty: 0,
        restockCost: 0,
        critical: false,
    },
    {
        product: { en: 'Surgical Drain – Jackson-Pratt', ar: 'مصرف جراحي – جاكسون برات' },
        sku: 'SD-JP-400',
        stock: 28,
        maxDays: 90,
        restockQty: 0,
        restockCost: 0,
        critical: false,
    },
];

export default function EfficiencyReportPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('efficiency');
    const tc = useTranslations('common');
    const [restockSent, setRestockSent] = useState<Record<string, boolean>>({});

    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const handleRestock = (sku: string) => {
        setRestockSent(prev => ({ ...prev, [sku]: true }));
        setTimeout(() => setRestockSent(prev => ({ ...prev, [sku]: false })), 3000);
    };

    // Velocity dial angles
    const maxDays = 200;
    const velocityAngle = (VELOCITY.orderToCash / maxDays) * 270 - 135;
    const sectorAngle = (VELOCITY.sectorAverage / maxDays) * 270 - 135;

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    {isAr ? '→' : '←'} {t('back')}
                </Link>

                {/* Velocity Dial */}
                <motion.div
                    className={`glass-card ${styles.dialCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.dialTitle}>{t('orderToCash')}</div>
                    <div className={styles.dialContainer}>
                        <svg viewBox="0 0 200 200" className={styles.dialSvg}>
                            {/* Track */}
                            <circle
                                cx="100" cy="100" r="80"
                                fill="none"
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="12"
                                strokeDasharray="339 509"
                                strokeDashoffset="-85"
                                strokeLinecap="round"
                            />
                            {/* Filled arc */}
                            <motion.circle
                                cx="100" cy="100" r="80"
                                fill="none"
                                stroke="#006C35"
                                strokeWidth="12"
                                strokeDasharray={`${(VELOCITY.orderToCash / maxDays) * 339} 509`}
                                strokeDashoffset="-85"
                                strokeLinecap="round"
                                initial={{ strokeDasharray: '0 509' }}
                                animate={{ strokeDasharray: `${(VELOCITY.orderToCash / maxDays) * 339} 509` }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                style={{ filter: 'drop-shadow(0 0 8px rgba(0, 108, 53, 0.5))' }}
                            />
                            {/* Sector Average needle */}
                            <line
                                x1="100" y1="100"
                                x2={100 + 65 * Math.cos((sectorAngle * Math.PI) / 180)}
                                y2={100 + 65 * Math.sin((sectorAngle * Math.PI) / 180)}
                                stroke="rgba(192,192,192,0.5)"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                            />
                            <circle
                                cx={100 + 65 * Math.cos((sectorAngle * Math.PI) / 180)}
                                cy={100 + 65 * Math.sin((sectorAngle * Math.PI) / 180)}
                                r="3"
                                fill="rgba(192,192,192,0.7)"
                            />
                        </svg>
                        <div className={styles.dialCenter}>
                            <span className={styles.dialValue}>{formatNumber(VELOCITY.orderToCash, locale)}</span>
                            <span className={styles.dialUnit}>{t('days')}</span>
                        </div>
                    </div>
                    <div className={styles.dialMeta}>
                        <div className={styles.dialMetaItem}>
                            <span className={styles.sectorDot} />
                            <span>{t('sectorAverage')}: {formatNumber(VELOCITY.sectorAverage, locale)} {t('days')}</span>
                        </div>
                        <div className={`${styles.dialMetaItem} ${styles.improvement}`}>
                            ↗ {formatNumber(VELOCITY.improvement, locale)}% {t('fasterThanSector')}
                        </div>
                    </div>
                </motion.div>

                {/* Fulfillment Pipeline */}
                <motion.div
                    className={`glass-card ${styles.pipelineCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className={styles.pipelineHeader}>
                        <span className={styles.pipelineTitle}>{t('fulfillmentStatus')}</span>
                        <span className={styles.pipelinePO}>{formatNumber('PO 4100000309', locale)}</span>
                    </div>
                    <div className={styles.stageList}>
                        {FULFILLMENT_STAGES.map((stage, i) => (
                            <div key={stage.key} className={styles.stageRow}>
                                <div className={`${styles.stageIcon} ${stage.status === 'complete' ? styles.stageComplete :
                                        stage.status === 'active' ? styles.stageActive :
                                            styles.stagePending
                                    }`}>
                                    {stage.status === 'complete' ? '✓' : stage.status === 'active' ? '◉' : '○'}
                                </div>
                                {i < FULFILLMENT_STAGES.length - 1 && (
                                    <div className={`${styles.stageConnector} ${stage.status === 'complete' ? styles.connectorDone : ''
                                        }`} />
                                )}
                                <div className={styles.stageContent}>
                                    <span className={styles.stageName}>{t(stage.key)}</span>
                                    {stage.status !== 'pending' && (
                                        <span className={styles.stageDays}>
                                            {formatNumber(stage.daysSpent, locale)} {t('days')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Inventory Criticality */}
                <motion.div
                    className={`glass-card ${styles.inventoryCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    <div className={styles.inventoryTitle}>{t('inventoryCriticality')}</div>
                    {INVENTORY.map((item) => {
                        const stockPercent = (item.stock / item.maxDays) * 100;
                        const isCritical = stockPercent < 20;
                        return (
                            <div key={item.sku} className={`${styles.inventoryRow} ${isCritical ? styles.criticalRow : ''}`}>
                                <div className={styles.inventoryInfo}>
                                    <span className={styles.inventoryName}>{L(item.product)}</span>
                                    <span className={styles.inventorySku}>{item.sku}</span>
                                </div>
                                <div className={styles.stockSection}>
                                    <div className={styles.stockBarOuter}>
                                        <motion.div
                                            className={styles.stockBarInner}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stockPercent}%` }}
                                            transition={{ duration: 0.8, delay: 0.5 }}
                                            style={{
                                                background: isCritical
                                                    ? 'rgba(239, 68, 68, 0.7)'
                                                    : stockPercent < 40
                                                        ? 'rgba(245, 158, 11, 0.7)'
                                                        : 'rgba(0, 108, 53, 0.6)',
                                            }}
                                        />
                                    </div>
                                    <span className={`${styles.stockLabel} ${isCritical ? styles.stockCritical : ''}`}>
                                        {formatNumber(item.stock, locale)} {t('daysRemaining')}
                                    </span>
                                </div>
                                {item.critical && (
                                    <div className={styles.restockAction}>
                                        <span className={styles.lowStockBadge}>
                                            {t('lowStock')}
                                        </span>
                                        <button
                                            className={`${styles.restockBtn} ${isCritical ? styles.restockPulse : ''} ${restockSent[item.sku] ? styles.restockSent : ''}`}
                                            onClick={() => handleRestock(item.sku)}
                                            disabled={restockSent[item.sku]}
                                        >
                                            {restockSent[item.sku] ? (
                                                <>✓ {t('poApproved')}</>
                                            ) : (
                                                t('approveRestock', { amount: formatSAR(item.restockCost) })
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        </Shell>
    );
}
