'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import styles from './sales.module.css';

const NUPCO_PO = {
    number: 'PO 4100000309',
    client: { en: 'NUPCO (National Unified Procurement Company)', ar: 'نوبكو (الشركة الوطنية الموحدة للشراء)' },
    baseRevenue: 1053000.0,
    unitPrice: 650.0,
    baseUnits: 1620,
    paymentTerms: 120,
    products: [
        { name: { en: 'Urological Catheter – Foley 2-Way', ar: 'قسطرة بولية – فولي ثنائية الاتجاه' }, sku: 'UC-F2W-16', unitPrice: 650.0, qty: 800 },
        { name: { en: 'Suture Braid Silk 2/0 – 75cm', ar: 'خيط جراحي حريري مجدول 2/0 – 75سم' }, sku: 'SBS-20-75', unitPrice: 469.9, qty: 600 },
        { name: { en: 'Surgical Drain – Jackson-Pratt', ar: 'مصرف جراحي – جاكسون برات' }, sku: 'SD-JP-400', unitPrice: 312.5, qty: 220 },
    ],
};

export default function SalesReportPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('salesReport');
    const tc = useTranslations('common');
    const [volumeMultiplier, setVolumeMultiplier] = useState(100);

    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;

    const forecast = useMemo(() => {
        const factor = volumeMultiplier / 100;
        const revenue = NUPCO_PO.baseRevenue * factor;
        const units = Math.round(NUPCO_PO.baseUnits * factor);
        const today = new Date();
        const deliveryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const cashDate = new Date(deliveryDate.getTime() + NUPCO_PO.paymentTerms * 24 * 60 * 60 * 1000);
        return { revenue, units, deliveryDate, cashDate };
    }, [volumeMultiplier]);

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const formatDate = (d: Date) => {
        const dateLocale = isAr ? 'ar-SA' : 'en-US';
        return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Shell>
            <div className={styles.page}>
                <Link href={`/${locale}`} className={styles.backLink}>
                    {isAr ? '→' : '←'} {t('back')}
                </Link>

                {/* Pipeline */}
                <motion.div
                    className={`glass-card ${styles.pipelineCard}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.pipelineHeader}>
                        <span className={styles.poTag}>{formatNumber(NUPCO_PO.number, locale)}</span>
                        <span className={styles.clientLabel}>{L(NUPCO_PO.client)}</span>
                    </div>
                    <div className={styles.pipelineValue}>
                        {formatSAR(forecast.revenue)}
                    </div>
                    <div className={styles.pipelineSubtext}>
                        {t('pipeline')} • {formatNumber(forecast.units.toLocaleString('en-US'), locale)} {t('units')}
                    </div>
                </motion.div>

                {/* Volume Forecast Slider */}
                <motion.div
                    className={`glass-card ${styles.sliderCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className={styles.sliderHeader}>
                        <span className={styles.sliderTitle}>{t('volumeForecast')}</span>
                        <span className={styles.sliderValue}>{formatNumber(volumeMultiplier, locale)}%</span>
                    </div>
                    <input
                        type="range"
                        min={50}
                        max={200}
                        step={5}
                        value={volumeMultiplier}
                        onChange={(e) => setVolumeMultiplier(Number(e.target.value))}
                        className={styles.slider}
                    />
                    <div className={styles.sliderLabels}>
                        <span>{formatNumber(50, locale)}%</span>
                        <span>{formatNumber(100, locale)}% ({t('base')})</span>
                        <span>{formatNumber(200, locale)}%</span>
                    </div>
                    <div className={styles.sliderMetrics}>
                        <div className={styles.metricPill}>
                            <span className={styles.metricLabel}>{t('unitPrice')}</span>
                            <span className={styles.metricVal}>{formatSAR(NUPCO_PO.unitPrice)}</span>
                        </div>
                        <div className={styles.metricPill}>
                            <span className={styles.metricLabel}>{t('projectedRevenue')}</span>
                            <span className={`${styles.metricVal} ${styles.highlight}`}>{formatSAR(forecast.revenue)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Liquidity Timeline */}
                <motion.div
                    className={`glass-card ${styles.timelineCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                >
                    <div className={styles.timelineTitle}>{t('liquidityTimeline')}</div>
                    <div className={styles.timeline}>
                        <div className={styles.timelineNode}>
                            <div className={`${styles.dot} ${styles.dotNow}`} />
                            <div className={styles.nodeContent}>
                                <span className={styles.nodeDate}>{t('today')}</span>
                                <span className={styles.nodeLabel}>{t('poConfirmed')}</span>
                            </div>
                        </div>
                        <div className={styles.timelineConnector} />
                        <div className={styles.timelineNode}>
                            <div className={`${styles.dot} ${styles.dotMid}`} />
                            <div className={styles.nodeContent}>
                                <span className={styles.nodeDate}>{formatDate(forecast.deliveryDate)}</span>
                                <span className={styles.nodeLabel}>{t('deliveryComplete')}</span>
                            </div>
                        </div>
                        <div className={styles.timelineConnector} />
                        <div className={styles.timelineNode}>
                            <div className={`${styles.dot} ${styles.dotEnd}`} />
                            <div className={styles.nodeContent}>
                                <span className={styles.nodeDate}>{formatDate(forecast.cashDate)}</span>
                                <span className={styles.nodeLabel}>{t('cashArrival', { days: formatNumber(NUPCO_PO.paymentTerms, locale) })}</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.cashNote}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        {t('cashNote', { days: formatNumber(NUPCO_PO.paymentTerms, locale) })}
                    </div>
                </motion.div>

                {/* Product Breakdown */}
                <motion.div
                    className={`glass-card ${styles.breakdownCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <div className={styles.breakdownTitle}>{t('productBreakdown')}</div>
                    {NUPCO_PO.products.map((p, i) => (
                        <div key={i} className={styles.productRow}>
                            <div className={styles.productInfo}>
                                <span className={styles.productName}>{L(p.name)}</span>
                                <span className={styles.productSku}>{p.sku}</span>
                            </div>
                            <div className={styles.productNumbers}>
                                <span className={styles.productQty}>
                                    {formatNumber(Math.round(p.qty * volumeMultiplier / 100), locale)} {t('units')}
                                </span>
                                <span className={styles.productTotal}>
                                    {formatSAR(p.unitPrice * p.qty * volumeMultiplier / 100)}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </Shell>
    );
}
