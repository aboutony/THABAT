'use client';

/**
 * ExpenseWaterfall — Phase 03
 *
 * P&L waterfall: Revenue → Raw Materials → Logistics → People/GOSI
 *                → Government/ZATCA → Net Profit
 *
 * Cost model is kept in sync with forecast.ts Phase 02:
 *   Variable costs = 72 % of volume-adjusted revenue  (r1+r2+r3+r4 = 0.72)
 *   Fixed overhead = 10 % of base revenue              (f1+f2 = 0.10)
 *
 * 6-month moving-average factors are seeded from demo data.
 * Logistics is intentionally 19 % over baseline to demonstrate
 * the pulse-alert and action-button system.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { formatSARShort } from '@/lib/forecast';
import { useEntity } from '@/context/EntityContext';
import { getEntityDataset, type EntityCostRates } from '@/lib/entityDatasets';
import { useIdentity } from '@/hooks/useIdentity';
import { useLocale } from 'next-intl';
import styles from './ExpenseWaterfall.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

// Cost rates and historical factors are now per-entity — loaded from entityDatasets.
// Fallback values (ENT_02 medical factory) kept here for reference only.

const OVER_THRESHOLD = 0.15; // > 15 % above moving average → pulse + action

// Category accent colours (single source of truth)
const COLORS = {
    rawMaterials: '#8B5CF6',
    logistics:    '#F59E0B',
    people:       '#3B82F6',
    govt:         '#EF4444',
    profit:       '#006C35',
    revenue:      '#006C35',
} as const;

// ─── Sub-category definitions ─────────────────────────────────────────────────

const SUB_DEFS = {
    logistics: [
        { id: 'logFreight',   labelKey: 'logFreight',   share: 0.50 },
        { id: 'logLastMile',  labelKey: 'logLastMile',  share: 0.25 },
        { id: 'logWarehouse', labelKey: 'logWarehouse', share: 0.15 },
        { id: 'logVisa',      labelKey: 'logVisa',      share: 0.10 },
    ],
    people: [
        { id: 'peopleSalary',   labelKey: 'peopleSalary',   share: 0.65 },
        { id: 'peopleGosi',     labelKey: 'peopleGosi',     share: 0.20 },
        { id: 'peopleBenefits', labelKey: 'peopleBenefits', share: 0.15 },
    ],
    govt: [
        { id: 'zatcaVat',  labelKey: 'zatcaVat',  share: 0.35 },
        { id: 'zatcaCorp', labelKey: 'zatcaCorp', share: 0.30 },
        { id: 'zatcaMuni', labelKey: 'zatcaMuni', share: 0.20 },
        { id: 'zatcaGosi', labelKey: 'zatcaGosi', share: 0.15 },
    ],
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryId = 'rawMaterials' | 'logistics' | 'people' | 'govt';

interface SubRow {
    id: string;
    labelKey: string;
    amount: number;
    sharePct: number; // % of parent
}

interface WaterfallRow {
    id: CategoryId;
    labelKey: string;
    amount: number;
    pct: number;     // % of revenue
    offset: number;  // cumulative left-offset (% of revenue)
    color: string;
    histFactor: number;
    isOver: boolean;
    canExpand: boolean;
    subRows: SubRow[];
}

// ─── Cost computation ────────────────────────────────────────────────────────

function computeCosts(revenue: number, baseRevenue: number, rates: EntityCostRates) {
    return {
        rawMaterials: revenue * rates.rawMaterials.variable + baseRevenue * rates.rawMaterials.fixed,
        logistics:    revenue * rates.logistics.variable    + baseRevenue * rates.logistics.fixed,
        people:       revenue * rates.people.variable       + baseRevenue * rates.people.fixed,
        govt:         revenue * rates.govt.variable         + baseRevenue * rates.govt.fixed,
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ExpenseWaterfallProps {
    revenue:         number;
    baseRevenue:     number;
    isAr:            boolean;
    marginRiskAlert: 'critical' | 'warning' | 'info' | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpenseWaterfall({
    revenue,
    baseRevenue,
    isAr,
    marginRiskAlert,
}: ExpenseWaterfallProps) {
    const t      = useTranslations('waterfall');
    const tc     = useTranslations('common');
    const locale = useLocale();

    const { activeEntity }  = useEntity();
    const { isClient }      = useIdentity();

    const [expandedId,  setExpandedId]  = useState<CategoryId | null>(null);
    const [auditModeId, setAuditModeId] = useState<CategoryId | null>(null);

    // ── Derive waterfall rows ────────────────────────────────────────────────
    const { rows, netProfit, netProfitPct, netProfitOffset } = useMemo(() => {
        const { costRates, histFactors } = getEntityDataset(activeEntity.id);
        const costs = computeCosts(revenue, baseRevenue, costRates);
        const ORDER: CategoryId[] = ['rawMaterials', 'logistics', 'people', 'govt'];
        const LABELS: Record<CategoryId, string> = {
            rawMaterials: 'rawMaterials',
            logistics:    'logistics',
            people:       'people',
            govt:         'govt',
        };
        const CAN_EXPAND: Record<CategoryId, boolean> = {
            rawMaterials: false,
            logistics:    true,
            people:       true,
            govt:         true,
        };

        let offset = 0;
        const rows: WaterfallRow[] = ORDER.map(id => {
            const amount = costs[id];
            const pct    = (amount / revenue) * 100;
            const hf     = histFactors[id];
            const isOver = (1 / hf) - 1 > OVER_THRESHOLD;

            const subDefs = (SUB_DEFS as Record<string, typeof SUB_DEFS[keyof typeof SUB_DEFS]>)[id] ?? [];
            const subRows: SubRow[] = subDefs.map(s => ({
                id:       s.id,
                labelKey: s.labelKey,
                amount:   amount * s.share,
                sharePct: s.share * 100,
            }));

            const row: WaterfallRow = {
                id, labelKey: LABELS[id], amount, pct, offset,
                color: COLORS[id], histFactor: hf, isOver,
                canExpand: CAN_EXPAND[id], subRows,
            };
            offset += pct;
            return row;
        });

        const totalCosts      = Object.values(costs).reduce((a, b) => a + b, 0);
        const netProfit       = revenue - totalCosts;
        const netProfitPct    = (netProfit / revenue) * 100;
        const netProfitOffset = 100 - netProfitPct;

        return { rows, netProfit, netProfitPct, netProfitOffset };
    }, [revenue, baseRevenue, activeEntity.id]);

    // ── Leakage detection (Phase 02 interconnect) ────────────────────────────
    const leakageId = useMemo<CategoryId | null>(() => {
        if (!marginRiskAlert) return null;
        return rows.reduce((worst, row) => {
            const dev       = (1 / row.histFactor) - 1;
            const worstDev  = (1 / worst.histFactor) - 1;
            return dev > worstDev ? row : worst;
        }, rows[0]).id;
    }, [rows, marginRiskAlert]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const sar = (n: number) => `${tc('sar')} ${formatSARShort(n)}`;

    const toggleExpand = (id: CategoryId) => {
        setExpandedId(prev => (prev === id ? null : id));
        setAuditModeId(null);
    };

    const toggleAudit = (id: CategoryId) => {
        setAuditModeId(prev => (prev === id ? null : id));
        setExpandedId(id); // open drill-down too
    };

    // ── CLIENT ghost state ───────────────────────────────────────────────────
    if (isClient) {
        const ctaLabel = isAr
            ? 'تفعيل التغذية المالية'
            : 'Initiate Financial Feed';
        return (
            <div className={styles.ghostWrapper}>
                {[0.72, 0.52, 0.40, 0.30].map((w, i) => (
                    <div
                        key={i}
                        className={styles.ghostBar}
                        style={{ width: `${w * 100}%`, animationDelay: `${i * 0.18}s` }}
                    />
                ))}
                <div className={styles.ghostOverlay}>
                    <a href={`/${locale}/settings`} className={styles.ghostCta}>
                        {ctaLabel}
                    </a>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className={styles.wrapper}>

            {/* Header */}
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>{t('title')}</div>
                    <div className={styles.subtitle}>{t('subtitle')}</div>
                </div>
                <AnimatePresence>
                    {leakageId && (
                        <motion.span
                            className={styles.leakageBadge}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                        >
                            ⚠ {t('leakageHighlight')}
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Waterfall container — dir flips bar orientation for RTL */}
            <div className={styles.waterfall}>

                {/* ── Revenue row ─────────────────────────────────────── */}
                <div className={styles.row}>
                    <span className={styles.label}>{t('revenue')}</span>
                    <div className={styles.track}>
                        <motion.div
                            layoutId="wf-bar-revenue"
                            className={styles.fill}
                            style={{ background: COLORS.revenue, [isAr ? 'right' : 'left']: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                    <span className={styles.amount}>{sar(revenue)}</span>
                </div>

                {/* ── Cost rows ───────────────────────────────────────── */}
                {rows.map(row => {
                    const isExpanded  = expandedId  === row.id;
                    const isAudit     = auditModeId === row.id;
                    const isLeakage   = leakageId   === row.id;

                    // Historical average reference position
                    const histPct    = row.pct * row.histFactor;
                    const histOffset = row.offset + histPct;

                    return (
                        <motion.div key={row.id} layout className={styles.rowGroup}>

                            {/* Main row */}
                            <div className={`${styles.row} ${isLeakage ? styles.rowLeakage : ''}`}>
                                <span className={styles.label}>
                                    {row.canExpand && (
                                        <button
                                            className={styles.expandChevron}
                                            onClick={() => toggleExpand(row.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <motion.span
                                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ display: 'inline-block', lineHeight: 1 }}
                                            >›</motion.span>
                                        </button>
                                    )}
                                    {t(row.labelKey)}
                                    {row.isOver && (
                                        <span
                                            className={`${styles.pulseDot} amber-action-glow`}
                                            title={t('movingAvgAlert')}
                                        />
                                    )}
                                    {isLeakage && (
                                        <span className={styles.leakageChip}>↑ {t('leakageHighlight')}</span>
                                    )}
                                </span>

                                {/* Bar track */}
                                <div className={styles.track}>
                                    {/* Historical average marker */}
                                    {row.isOver && (
                                        <div
                                            className={styles.histMarker}
                                            style={{ [isAr ? 'right' : 'left']: `${histOffset}%` }}
                                            title={t('movingAvgAlert')}
                                        />
                                    )}
                                    {/* Main fill bar */}
                                    <motion.div
                                        layoutId={`wf-bar-${row.id}`}
                                        className={`${styles.fill} ${row.isOver ? styles.fillOver : ''}`}
                                        style={{
                                            background: row.color,
                                            [isAr ? 'right' : 'left']: `${row.offset}%`,
                                            boxShadow: isLeakage
                                                ? `0 0 14px ${row.color}55`
                                                : row.isOver
                                                ? `0 0 8px ${row.color}30`
                                                : 'none',
                                        }}
                                        animate={{ width: `${row.pct}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>

                                {/* Right side: amount + over-avg badge */}
                                <div className={styles.amountCol}>
                                    <span className={styles.amount}>{sar(row.amount)}</span>
                                    {row.isOver && (
                                        <span className={styles.overBadge}>
                                            +{Math.round(((1 / row.histFactor) - 1) * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons (only for over-threshold rows) */}
                            <AnimatePresence>
                                {row.isOver && !isExpanded && (
                                    <motion.div
                                        className={styles.actionRow}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <button
                                            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                            onClick={() => toggleAudit(row.id)}
                                        >
                                            {t('auditBtn')}
                                        </button>
                                        {row.canExpand && (
                                            <button
                                                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                                                onClick={() => toggleExpand(row.id)}
                                            >
                                                {t('topDriversBtn')}
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Drill-down sub-categories */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        className={styles.subBlock}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        {row.subRows.map((sub, idx) => (
                                            <motion.div
                                                key={sub.id}
                                                className={styles.subRow}
                                                initial={{ opacity: 0, x: isAr ? 8 : -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.06, duration: 0.25 }}
                                            >
                                                <span className={styles.subLabel}>
                                                    {isAudit && (
                                                        <span className={styles.auditDot}
                                                            style={{ background: row.color }} />
                                                    )}
                                                    {t(sub.labelKey)}
                                                </span>

                                                {/* Sub-bar (relative width within parent) */}
                                                <div className={styles.subTrack}>
                                                    <motion.div
                                                        className={styles.subFill}
                                                        style={{ background: `${row.color}90` }}
                                                        initial={{ width: '0%' }}
                                                        animate={{ width: `${sub.sharePct}%` }}
                                                        transition={{ delay: idx * 0.06 + 0.1, duration: 0.4 }}
                                                    />
                                                </div>

                                                <div className={styles.subAmountCol}>
                                                    <span className={styles.subAmount}>{sar(sub.amount)}</span>
                                                    {isAudit && (
                                                        <span className={styles.subPct}>
                                                            {sub.sharePct.toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {/* Collapse trigger */}
                                        <button
                                            className={styles.collapseBtn}
                                            onClick={() => {
                                                setExpandedId(null);
                                                setAuditModeId(null);
                                            }}
                                        >
                                            {t('collapse')} ↑
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}

                {/* ── Net Profit row ──────────────────────────────────── */}
                <div className={`${styles.row} ${styles.rowProfit}`}>
                    <span className={styles.label}>{t('netProfit')}</span>
                    <div className={styles.track}>
                        <motion.div
                            layoutId="wf-bar-profit"
                            className={styles.fill}
                            style={{ background: COLORS.profit, [isAr ? 'right' : 'left']: `${netProfitOffset}%` }}
                            animate={{ width: `${netProfitPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                    <span className={`${styles.amount} ${styles.amountProfit}`}>
                        {sar(netProfit)}
                    </span>
                </div>

            </div>{/* /waterfall */}
        </div>
    );
}
