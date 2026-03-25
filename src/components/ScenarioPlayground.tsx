'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { projectScenarioImpact } from '@/lib/projectScenarioImpact';
import { addLedgerEntry } from '@/lib/ledger';
import { TIER_COLORS } from '@/lib/nitaqat';
import type { NitaqatTierKey } from '@/lib/ledger';
import s from './ScenarioPlayground.module.css';

// ── Lever config ──────────────────────────────────────────────────────────────

const LEVERS = [
    { key: 'salesGrowthPct',    min: -50,  max: 100,  step: 1,  unit: '%',  defaultVal: 0  },
    { key: 'expatsHired',       min:   0,  max:  50,  step: 1,  unit: '',   defaultVal: 0  },
    { key: 'materialCostDelta', min: -30,  max:  50,  step: 1,  unit: '%',  defaultVal: 0  },
] as const;

type LeverKey = typeof LEVERS[number]['key'];

// ── Sub-component: horizontal ghost bar pair ──────────────────────────────────

function GhostBars({
    currentPct,
    projectedPct,
    currentLabel,
    projectedLabel,
    currentColor,
    projectedColor,
    tagNow,
    tagEst,
}: {
    currentPct:    number;
    projectedPct:  number;
    currentLabel:  string;
    projectedLabel:string;
    currentColor:  string;
    projectedColor:string;
    tagNow: string;
    tagEst: string;
}) {
    return (
        <div className={s.barPair}>
            {/* Current — solid */}
            <div className={s.barRow}>
                <span className={s.barTag}>{tagNow}</span>
                <div className={s.track}>
                    <motion.div
                        className={s.barFill}
                        style={{ background: currentColor }}
                        animate={{ width: `${Math.max(2, currentPct)}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                </div>
                <span className={s.barVal}>{currentLabel}</span>
            </div>
            {/* Projected — ghost */}
            <div className={s.barRow}>
                <span className={s.barTag}>{tagEst}</span>
                <div className={s.track}>
                    <motion.div
                        className={s.barFill}
                        style={{ background: projectedColor, opacity: 0.45 }}
                        animate={{ width: `${Math.max(2, projectedPct)}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                </div>
                <span className={s.barVal}>{projectedLabel}</span>
            </div>
        </div>
    );
}

// ── Nitaqat tier colors (dark-mode optimised) ─────────────────────────────────

const TIER_DARK: Record<NitaqatTierKey, string> = {
    platinum:  '#D4AF37',
    highGreen: '#4ADE80',
    medGreen:  '#86EFAC',
    lowGreen:  '#BEF264',
    red:       '#F87171',
};

// ── Main component ────────────────────────────────────────────────────────────

interface ScenarioPlaygroundProps {
    onClose: () => void;
}

export default function ScenarioPlayground({ onClose }: ScenarioPlaygroundProps) {
    const t      = useTranslations('scenario');
    const locale = useLocale();

    const [levers, setLevers] = useState<Record<LeverKey, number>>({
        salesGrowthPct:    0,
        expatsHired:       0,
        materialCostDelta: 0,
    });
    const [saved, setSaved] = useState(false);

    const projection = useMemo(
        () => projectScenarioImpact(levers),
        [levers],
    );

    function handleSlider(key: LeverKey, val: number) {
        setLevers(prev => ({ ...prev, [key]: val }));
    }

    function handleSave() {
        if (saved) return;
        addLedgerEntry({
            actionType:  'SCENARIO_PLAN',
            avoidedCost: Math.abs(projection.estimatedAnnualImpact),
            scenarioMeta: {
                salesGrowthPct:     levers.salesGrowthPct,
                expatsHired:        levers.expatsHired,
                materialCostDelta:  levers.materialCostDelta,
                projectedMarginPct: projection.projectedMarginPct,
                projectedTier:      projection.projectedTier,
                projectedStockRisk: projection.projectedStockRisk,
            },
        });
        setSaved(true);
        setTimeout(onClose, 1400);
    }

    // ── Margin bar metrics ────────────────────────────────────────────────────
    const MARGIN_MAX = 40;
    const currentMarginPct_bar  = (Math.max(0, projection.currentMarginPct)   / MARGIN_MAX) * 100;
    const projectedMarginPct_bar= (Math.max(0, projection.projectedMarginPct) / MARGIN_MAX) * 100;
    const marginImproved = projection.projectedMarginPct >= projection.currentMarginPct;

    // ── Stock bar metrics ─────────────────────────────────────────────────────
    const STOCK_MAX = 30;
    const currentStockPct  = (projection.currentStockDays  / STOCK_MAX) * 100;
    const projectedStockPct= (projection.projectedStockDays / STOCK_MAX) * 100;

    // ── Impact sign ───────────────────────────────────────────────────────────
    const impact     = projection.estimatedAnnualImpact;
    const impactSign = impact > 0 ? '+' : impact < 0 ? '' : '';
    const impactCls  = impact > 0 ? s.impactPos : impact < 0 ? s.impactNeg : s.impactPos;

    const deltaCls = (better: boolean, neutral: boolean) =>
        neutral ? s.deltaNeu : better ? s.deltaPos : s.deltaNeg;

    return (
        <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                className={s.panel}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            >
                {/* ── Top bar ────────────────────────────────────────── */}
                <div className={s.topBar}>
                    <span className={s.labIcon}>⚗</span>
                    <p className={s.labTitle}>{t('title')}</p>
                    <button className={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* ── Scrollable body ────────────────────────────────── */}
                <div className={s.body}>

                    {/* ── LEVERS ────────────────────────────────────────── */}
                    <div className={s.section}>
                        <p className={s.sectionLabel}>{t('leversTitle')}</p>

                        {LEVERS.map(lever => {
                            const val  = levers[lever.key];
                            const sign = val > 0 ? '+' : '';
                            const valCls = val > 0 ? s.leverValPos
                                         : val < 0 ? s.leverValNeg
                                         : s.leverValNeu;
                            return (
                                <div key={lever.key} className={s.leverRow}>
                                    <div className={s.leverHeader}>
                                        <p className={s.leverName}>{t(`lever.${lever.key}`)}</p>
                                        <span className={`${s.leverVal} ${valCls}`}>
                                            {sign}{val}{lever.unit}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        className={s.slider}
                                        min={lever.min}
                                        max={lever.max}
                                        step={lever.step}
                                        value={val}
                                        onChange={e => handleSlider(lever.key, Number(e.target.value))}
                                    />
                                    <div className={s.leverRange}>
                                        <span>{lever.min > 0 ? lever.min : `${lever.min}${lever.unit}`}</span>
                                        <span>{`+${lever.max}${lever.unit}`}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── IMPACT MATRIX ─────────────────────────────────── */}
                    <div className={s.section}>
                        <p className={s.sectionLabel}>{t('matrixTitle')}</p>

                        <div className={s.card}>

                            {/* Net Margin */}
                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricMargin')}</p>
                                <GhostBars
                                    tagNow={t('tagNow')}
                                    tagEst={t('tagEst')}
                                    currentPct={currentMarginPct_bar}
                                    projectedPct={projectedMarginPct_bar}
                                    currentLabel={`${projection.currentMarginPct}%`}
                                    projectedLabel={`${projection.projectedMarginPct}%`}
                                    currentColor="#4ADE80"
                                    projectedColor={marginImproved ? '#4ADE80' : '#F87171'}
                                />
                                {projection.marginDelta !== 0 && (
                                    <p className={`${s.delta} ${deltaCls(marginImproved, false)}`}>
                                        {projection.marginDelta > 0 ? '▲' : '▼'}&nbsp;
                                        {Math.abs(projection.marginDelta)}pp
                                    </p>
                                )}
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: 'rgba(99,102,241,0.10)' }} />

                            {/* Nitaqat tier */}
                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricNitaqat')}</p>
                                <div className={s.tierRow}>
                                    <div
                                        className={s.tierDot}
                                        style={{ background: TIER_DARK[projection.currentTier] }}
                                    />
                                    <span className={s.tierName}>
                                        {t(`tier.${projection.currentTier}`)}
                                    </span>
                                    <span className={s.tierArrow}>→</span>
                                    <div
                                        className={s.tierDot}
                                        style={{
                                            background: TIER_DARK[projection.projectedTier],
                                            opacity: projection.tierDropped ? 1 : 0.55,
                                        }}
                                    />
                                    <span
                                        className={s.tierName}
                                        style={{ color: TIER_DARK[projection.projectedTier] }}
                                    >
                                        {t(`tier.${projection.projectedTier}`)}
                                    </span>
                                    {projection.tierDropped && (
                                        <span className={s.tierWarn}>⚠</span>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: 'rgba(99,102,241,0.10)' }} />

                            {/* Stock Risk */}
                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricStock')}</p>
                                <GhostBars
                                    tagNow={t('tagNow')}
                                    tagEst={t('tagEst')}
                                    currentPct={currentStockPct}
                                    projectedPct={projectedStockPct}
                                    currentLabel={`${projection.currentStockDays}d ${projection.currentStockRisk ? '⚠' : '✓'}`}
                                    projectedLabel={`${projection.projectedStockDays}d ${projection.projectedStockRisk ? '⚠' : '✓'}`}
                                    currentColor={projection.currentStockRisk ? '#F87171' : '#4ADE80'}
                                    projectedColor={projection.projectedStockRisk ? '#F87171' : '#4ADE80'}
                                />
                            </div>

                        </div>
                    </div>

                    {/* ── CTA ───────────────────────────────────────────── */}
                    <div className={s.ctaArea}>
                        <div className={s.impactSummary}>
                            <span className={s.impactSummaryLabel}>{t('annualImpact')}</span>
                            <span className={`${s.impactSummaryVal} ${impactCls}`}>
                                {impactSign}SAR {Math.abs(impact).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-SA')}
                            </span>
                        </div>

                        <AnimatePresence mode="wait">
                            {saved ? (
                                <motion.button
                                    key="saved"
                                    className={`${s.saveBtn} ${s.saveBtnSaved}`}
                                    initial={{ scale: 0.97, opacity: 0 }}
                                    animate={{ scale: 1,    opacity: 1 }}
                                    disabled
                                >
                                    ✓ {t('savedBtn')}
                                </motion.button>
                            ) : (
                                <motion.button
                                    key="save"
                                    className={s.saveBtn}
                                    onClick={handleSave}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {t('saveBtn')}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
