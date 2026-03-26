'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import { formatNumber } from '@/lib/locale-utils';
import { getRevenueForecast, formatSARShort, type ForecastResult } from '@/lib/forecast';
import ExpenseWaterfall from '@/components/ExpenseWaterfall';
import styles from './sales.module.css';

// ─── NUPCO Purchase Order Data ───────────────────────────────────────────────
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

// ─── Agentic Alert Bar ────────────────────────────────────────────────────────
interface AlertBarProps {
    severity: 'critical' | 'warning' | 'info';
    forecast: ForecastResult;
    volumeMultiplier: number;
    onDismiss: () => void;
    t: ReturnType<typeof useTranslations>;
    locale: string;
}

function AlertBar({ severity, forecast, volumeMultiplier, onDismiss, t, locale }: AlertBarProps) {
    const riskCount = forecast.marginRiskMonths;

    const messageKey =
        severity === 'critical' ? 'alertCritical' :
        severity === 'warning'  ? 'alertWarning'  : 'alertInfo';

    const getInterpolations = (): Record<string, string> => {
        if (severity === 'critical') return {
            volume: String(formatNumber(volumeMultiplier, locale)),
            month:  forecast.months.find(m => m.marginRisk)?.monthLabel ?? '',
        };
        if (severity === 'warning') return {
            volume: String(formatNumber(volumeMultiplier, locale)),
            risk:   String(formatNumber(riskCount, locale)),
        };
        return { months: String(formatNumber(riskCount, locale)) };
    };

    const icons = {
        critical: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        warning: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
        info: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
    };

    return (
        <motion.div
            className={`${styles.alertBar} ${styles[`alert_${severity}`]}`}
            initial={{ opacity: 0, y: -8, scaleY: 0.85 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.85 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <span className={styles.alertIcon}>{icons[severity]}</span>
            <span className={styles.alertText}>
                {t(messageKey, getInterpolations())}
            </span>
            <button className={styles.alertDismiss} onClick={onDismiss} aria-label={t('dismiss')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </motion.div>
    );
}

// ─── Forecast Chart (SVG) ─────────────────────────────────────────────────────
interface ForecastChartProps {
    forecast: ForecastResult;
    isAr: boolean;
}

function ForecastChart({ forecast, isAr }: ForecastChartProps) {
    const { months } = forecast;
    const W = 320, H = 130;
    const PAD = { top: 14, right: 10, bottom: 30, left: 46 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const allValues = months.flatMap(m => [m.bear, m.bull]);
    const maxV = Math.max(...allValues) * 1.04;
    const minV = Math.min(...allValues) * 0.92;
    const range = maxV - minV || 1;

    const xPos = (i: number) =>
        PAD.left + (months.length > 1 ? (i / (months.length - 1)) * cW : cW / 2);
    const yPos = (v: number) => PAD.top + (1 - (v - minV) / range) * cH;

    const polyline = (values: number[]) =>
        values.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');

    // Y-axis: 3 reference lines
    const yTicks = [minV + range * 0.1, minV + range * 0.5, minV + range * 0.9];

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            aria-label="6-month revenue forecast chart"
        >
            {/* Y-axis gridlines + labels */}
            {yTicks.map((v, i) => {
                const y = yPos(v);
                return (
                    <g key={i}>
                        <line
                            x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                            stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="3 3"
                        />
                        <text
                            x={PAD.left - 4} y={y + 4}
                            textAnchor="end"
                            fontSize="8"
                            fill="var(--text-tertiary)"
                            fontFamily="var(--font-geist-sans, sans-serif)"
                        >
                            {formatSARShort(v)}
                        </text>
                    </g>
                );
            })}

            {/* Bear area fill (subtle) */}
            <polygon
                points={[
                    ...months.map((m, i) => `${xPos(i).toFixed(1)},${yPos(m.bear).toFixed(1)}`),
                    ...months.map((_m, i) => `${xPos(months.length - 1 - i).toFixed(1)},${yPos(months[months.length - 1 - i].base).toFixed(1)}`),
                ].join(' ')}
                fill="var(--danger)"
                fillOpacity="0.06"
            />

            {/* Bull area fill (subtle) */}
            <polygon
                points={[
                    ...months.map((m, i) => `${xPos(i).toFixed(1)},${yPos(m.base).toFixed(1)}`),
                    ...months.map((_m, i) => `${xPos(months.length - 1 - i).toFixed(1)},${yPos(months[months.length - 1 - i].bull).toFixed(1)}`),
                ].join(' ')}
                fill="var(--success)"
                fillOpacity="0.07"
            />

            {/* Bear line */}
            <polyline
                points={polyline(months.map(m => m.bear))}
                fill="none"
                stroke="var(--warning)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
            />

            {/* Bull line */}
            <polyline
                points={polyline(months.map(m => m.bull))}
                fill="none"
                stroke="var(--success)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
                opacity="0.7"
            />

            {/* Base line */}
            <polyline
                points={polyline(months.map(m => m.base))}
                fill="none"
                stroke="#006C35"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Base dots — highlight margin-risk months */}
            {months.map((m, i) => (
                <circle
                    key={i}
                    cx={xPos(i)}
                    cy={yPos(m.base)}
                    r={m.marginRisk ? 4.5 : 3}
                    fill={m.marginRisk ? 'var(--warning)' : '#006C35'}
                    stroke="var(--bg-primary)"
                    strokeWidth="1.5"
                />
            ))}

            {/* X-axis month labels */}
            {months.map((m, i) => (
                <text
                    key={i}
                    x={xPos(i)}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="var(--text-tertiary)"
                    fontFamily="var(--font-geist-sans, sans-serif)"
                >
                    {isAr ? m.monthLabelAr : m.monthLabel}
                </text>
            ))}
        </svg>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SalesReportPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const router = useRouter();
    const t = useTranslations('salesReport');
    const tc = useTranslations('common');
    const [volumeMultiplier, setVolumeMultiplier] = useState(100);
    const [alertDismissed, setAlertDismissed] = useState(false);

    const L = (obj: { en: string; ar: string }) => isAr ? obj.ar : obj.en;

    // Pipeline snapshot (existing — cash timeline)
    const forecast = useMemo(() => {
        const factor = volumeMultiplier / 100;
        const revenue = NUPCO_PO.baseRevenue * factor;
        const units = Math.round(NUPCO_PO.baseUnits * factor);
        const today = new Date();
        const deliveryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const cashDate = new Date(deliveryDate.getTime() + NUPCO_PO.paymentTerms * 24 * 60 * 60 * 1000);
        return { revenue, units, deliveryDate, cashDate };
    }, [volumeMultiplier]);

    // 6-month predictive forecast
    const revenueForecast = useMemo(
        () => getRevenueForecast(NUPCO_PO.baseRevenue, volumeMultiplier),
        [volumeMultiplier],
    );

    // Agentic alert severity determination
    const activeAlert = useMemo<'critical' | 'warning' | 'info' | null>(() => {
        if (revenueForecast.marginRiskMonths >= 4 || volumeMultiplier < 70) return 'critical';
        if (revenueForecast.marginRiskMonths >= 2 || volumeMultiplier < 82) return 'warning';
        if (revenueForecast.marginRiskMonths >= 1) return 'info';
        return null;
    }, [revenueForecast.marginRiskMonths, volumeMultiplier]);

    // Re-surface the alert if the volume slider changes significantly
    const [lastAlertVolume, setLastAlertVolume] = useState(volumeMultiplier);
    const showAlert = activeAlert && (!alertDismissed || Math.abs(volumeMultiplier - lastAlertVolume) >= 15);

    const formatSAR = (n: number) => {
        const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${tc('sar')} ${formatNumber(formatted, locale)}`;
    };

    const formatDate = (d: Date) => {
        const dateLocale = isAr ? 'ar-SA' : 'en-US';
        return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleDismiss = () => {
        setAlertDismissed(true);
        setLastAlertVolume(volumeMultiplier);
    };

    const trendIcon = revenueForecast.overallTrend === 'improving' ? '↑'
        : revenueForecast.overallTrend === 'declining' ? '↓' : '→';
    const trendKey = revenueForecast.overallTrend === 'improving' ? 'trendImproving'
        : revenueForecast.overallTrend === 'declining' ? 'trendDeclining' : 'trendFlat';

    return (
        <Shell>
            <div className={styles.page}>
                <button className={styles.backLink} onClick={() => router.push(`/${locale}`)}>
                    {isAr ? '→' : '←'} {t('back')}
                </button>

                {/* ── Agentic Alert Bar ── */}
                <AnimatePresence>
                    {showAlert && (
                        <AlertBar
                            severity={activeAlert!}
                            forecast={revenueForecast}
                            volumeMultiplier={volumeMultiplier}
                            onDismiss={handleDismiss}
                            t={t}
                            locale={locale}
                        />
                    )}
                </AnimatePresence>

                {/* ── Pipeline ── */}
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

                {/* ── Volume Forecast Slider ── */}
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
                        onChange={(e) => {
                            setAlertDismissed(false);
                            setVolumeMultiplier(Number(e.target.value));
                        }}
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

                {/* ── Predictive Revenue Overlay ── */}
                <motion.div
                    className={`glass-card ${styles.forecastCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                >
                    <div className={styles.forecastHeader}>
                        <div>
                            <div className={styles.forecastTitle}>{t('forecastTitle')}</div>
                            <div className={styles.forecastSubtitle}>{t('scenariosLabel')}</div>
                        </div>
                        <span className={`${styles.trendBadge} ${styles[`trend_${revenueForecast.overallTrend}`]}`}>
                            {trendIcon} {t(trendKey)}
                        </span>
                    </div>

                    <ForecastChart forecast={revenueForecast} isAr={isAr} />

                    {/* Legend */}
                    <div className={styles.chartLegend}>
                        <span className={styles.legendItem}>
                            <span className={`${styles.legendDot} ${styles.legendBase}`} />
                            {t('legendBase')}
                        </span>
                        <span className={styles.legendItem}>
                            <span className={`${styles.legendLine} ${styles.legendBull}`} />
                            {t('legendBull')}
                        </span>
                        <span className={styles.legendItem}>
                            <span className={`${styles.legendLine} ${styles.legendBear}`} />
                            {t('legendBear')}
                        </span>
                    </div>

                    {/* Peak / Floor callouts */}
                    <div className={styles.forecastCallouts}>
                        <div className={styles.callout}>
                            <span className={styles.calloutLabel}>{t('peakBull')}</span>
                            <span className={`${styles.calloutVal} ${styles.calloutGreen}`}>
                                {tc('sar')} {formatSARShort(revenueForecast.peakBull)}
                            </span>
                        </div>
                        {revenueForecast.marginRiskMonths > 0 && (
                            <div className={`${styles.callout} ${styles.calloutRisk}`}>
                                <span className={styles.calloutLabel}>
                                    {t('marginRiskWarning', { months: formatNumber(revenueForecast.marginRiskMonths, locale) })}
                                </span>
                            </div>
                        )}
                        <div className={styles.callout}>
                            <span className={styles.calloutLabel}>{t('worstBear')}</span>
                            <span className={`${styles.calloutVal} ${styles.calloutAmber}`}>
                                {tc('sar')} {formatSARShort(revenueForecast.worstBear)}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* ── Executive Expense Waterfall (Phase 03) ── */}
                <motion.div
                    className={`glass-card ${styles.waterfallCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                >
                    <ExpenseWaterfall
                        revenue={forecast.revenue}
                        baseRevenue={NUPCO_PO.baseRevenue}
                        isAr={isAr}
                        marginRiskAlert={activeAlert}
                    />
                </motion.div>

                {/* ── Liquidity Timeline ── */}
                <motion.div
                    className={`glass-card ${styles.timelineCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
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

                {/* ── Product Breakdown ── */}
                <motion.div
                    className={`glass-card ${styles.breakdownCard}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65, duration: 0.5 }}
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
