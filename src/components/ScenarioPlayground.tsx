'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { projectScenarioImpact } from '@/lib/projectScenarioImpact';
import { addLedgerEntry } from '@/lib/ledger';
import { useIdentity } from '@/hooks/useIdentity';
import type { NitaqatTierKey } from '@/lib/ledger';
import type { OptimalResult } from '@/lib/findOptimalPath';
import type { ScenarioLevers } from '@/lib/projectScenarioImpact';
import { useEntity } from '@/context/EntityContext';
import OptimizerWidget from './OptimizerWidget';
import s from './ScenarioPlayground.module.css';

// ── Lever config ──────────────────────────────────────────────────────────────

const LEVERS = [
    { key: 'salesGrowthPct',    min: -50,  max: 100,  step: 1,  unit: '%',  defaultVal: 0  },
    { key: 'expatsHired',       min:   0,  max:  50,  step: 1,  unit: '',   defaultVal: 0  },
    { key: 'materialCostDelta', min: -30,  max:  50,  step: 1,  unit: '%',  defaultVal: 0  },
] as const;

type LeverKey = typeof LEVERS[number]['key'];

// ── Ghost bar pair ────────────────────────────────────────────────────────────

function GhostBars({
    currentPct, projectedPct, currentLabel, projectedLabel,
    currentColor, projectedColor, tagNow, tagEst,
}: {
    currentPct: number; projectedPct: number;
    currentLabel: string; projectedLabel: string;
    currentColor: string; projectedColor: string;
    tagNow: string; tagEst: string;
}) {
    return (
        <div className={s.barPair}>
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
            <div className={s.barRow}>
                <span className={s.barTag}>{tagEst}</span>
                <div className={s.track}>
                    <motion.div
                        className={`${s.barFill} ${s.barFillProjected}`}
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

// ── Tier colour map (dark-optimised) ─────────────────────────────────────────

const TIER_DARK: Record<NitaqatTierKey, string> = {
    platinum:  '#D4AF37',
    highGreen: '#4ADE80',
    medGreen:  '#86EFAC',
    lowGreen:  '#BEF264',
    red:       '#F87171',
};

// ── Main component ────────────────────────────────────────────────────────────

interface ScenarioPlaygroundProps { onClose: () => void; }

export default function ScenarioPlayground({ onClose }: ScenarioPlaygroundProps) {
    const t        = useTranslations('scenario');
    const tO       = useTranslations('optimizer');
    const locale   = useLocale();
    const isAr     = locale === 'ar';
    const { isClient } = useIdentity();
    const { activeEntity } = useEntity();

    const [levers, setLevers] = useState<Record<LeverKey, number>>({
        salesGrowthPct:    0,
        expatsHired:       0,
        materialCostDelta: 0,
    });
    const [optimizedKeys,   setOptimizedKeys]   = useState<Set<LeverKey>>(new Set());
    const [optimalResult,   setOptimalResult]   = useState<OptimalResult | null>(null);
    const [drawerOpen,      setDrawerOpen]      = useState(false);
    const [saved,           setSaved]           = useState(false);
    const [adopted,         setAdopted]         = useState(false);
    const [economicStress,  setEconomicStress]  = useState(false);

    // Economic Stress applies a +15 pp material cost headwind on top of the slider
    const STRESS_SHIFT = 15;
    const effectiveLevers = useMemo(() => economicStress
        ? { ...levers, materialCostDelta: Math.min(50, levers.materialCostDelta + STRESS_SHIFT) }
        : levers,
    [levers, economicStress]);

    const projection = useMemo(
        () => projectScenarioImpact(effectiveLevers, activeEntity.id),
        [activeEntity.id, effectiveLevers],
    );

    // Persist current lever state to sessionStorage so ExportPortal can include
    // live What-If values in the Capital Report even without saving to ledger.
    useEffect(() => {
        try {
            sessionStorage.setItem('thabat-session-levers', JSON.stringify({
                salesGrowthPct:        levers.salesGrowthPct,
                expatsHired:           levers.expatsHired,
                materialCostDelta:     levers.materialCostDelta,
                projectedMarginPct:    projection.projectedMarginPct,
                projectedTier:         projection.projectedTier,
                estimatedAnnualImpact: projection.estimatedAnnualImpact,
            }));
        } catch { /* sessionStorage unavailable */ }
    }, [levers, projection]);

    function handleSlider(key: LeverKey, val: number) {
        setLevers(prev => ({ ...prev, [key]: val }));
        // Clear optimizer highlight when user manually overrides
        setOptimizedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
    }

    function handleOptimize(optLevers: ScenarioLevers, result: OptimalResult) {
        setLevers(optLevers as Record<LeverKey, number>);
        setOptimizedKeys(new Set(Object.keys(optLevers) as LeverKey[]));
        setOptimalResult(result);
        setDrawerOpen(true);
        setSaved(false);
        setAdopted(false);
    }

    function handleSave() {
        if (saved) return;
        addLedgerEntry({
            actionType:   'SCENARIO_PLAN',
            avoidedCost:  Math.abs(projection.estimatedAnnualImpact),
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

    function handleAdopt() {
        if (adopted || !optimalResult) return;
        addLedgerEntry({
            actionType:   'VERIFIED_STRATEGY',
            avoidedCost:  Math.abs(optimalResult.projection.estimatedAnnualImpact),
            scenarioMeta: {
                salesGrowthPct:     optimalResult.levers.salesGrowthPct,
                expatsHired:        optimalResult.levers.expatsHired,
                materialCostDelta:  optimalResult.levers.materialCostDelta,
                projectedMarginPct: optimalResult.projection.projectedMarginPct,
                projectedTier:      optimalResult.projection.projectedTier,
                projectedStockRisk: optimalResult.projection.projectedStockRisk,
            },
        });
        setAdopted(true);
        setTimeout(onClose, 1400);
    }

    // ── Bar metrics ───────────────────────────────────────────────────────────
    const MARGIN_MAX = 40;
    const currentMarginBar   = (Math.max(0, projection.currentMarginPct)   / MARGIN_MAX) * 100;
    const projectedMarginBar = (Math.max(0, projection.projectedMarginPct) / MARGIN_MAX) * 100;
    const marginImproved     = projection.projectedMarginPct >= projection.currentMarginPct;
    const STOCK_MAX          = 30;
    const currentStockBar    = (projection.currentStockDays  / STOCK_MAX) * 100;
    const projectedStockBar  = (Math.max(0, projection.projectedStockDays) / STOCK_MAX) * 100;

    const impact    = projection.estimatedAnnualImpact;
    const impactCls = impact > 0 ? s.impactPos : impact < 0 ? s.impactNeg : s.impactPos;
    const deltaCls  = (better: boolean) => better ? s.deltaPos : s.deltaNeg;

    return (
        <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                className={`${s.panel} ${drawerOpen ? s.panelDrawerOpen : ''}`}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            >
                {/* ── Top bar ──────────────────────────────────────────── */}
                <div className={s.topBar}>
                    <span className={s.labIcon}>⚗</span>
                    <p className={s.labTitle}>{t('title')}</p>
                    <button className={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* ── CLIENT lock gate ─────────────────────────────────── */}
                {isClient && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 12, padding: '48px 24px', textAlign: 'center',
                    }}>
                        <span style={{ fontSize: 36, opacity: 0.35 }}>🔒</span>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {isAr ? 'مميزة للقائد' : 'Commander-Level Feature'}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 260, lineHeight: 1.5 }}>
                            {isAr
                                ? 'مختبر السيناريوهات متاح بعد توصيل نظام ERP الخاص بك.'
                                : 'Scenario Lab unlocks after your ERP is connected and data is ingested.'}
                        </p>
                    </div>
                )}

                {/* ── Scrollable body ───────────────────────────────────── */}
                {!isClient && <div className={s.body}>

                    {/* ── LEVERS ──────────────────────────────────────────── */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <p className={s.sectionLabel}>{t('leversTitle')}</p>
                            <OptimizerWidget onOptimize={handleOptimize} />
                        </div>

                        {/* Economic Stress toggle */}
                        <button
                            className={`${s.stressToggle} ${economicStress ? s.stressToggleActive : ''}`}
                            onClick={() => setEconomicStress(v => !v)}
                            type="button"
                        >
                            <span className={s.stressIcon}>⚡</span>
                            <span className={s.stressLabel}>
                                {locale === 'ar' ? 'وضع الضغط الاقتصادي' : 'Economic Stress Mode'}
                            </span>
                            <span className={s.stressEffect}>
                                {locale === 'ar' ? `+${STRESS_SHIFT}% تكلفة مواد` : `+${STRESS_SHIFT}% material cost`}
                            </span>
                            <span className={`${s.stressPill} ${economicStress ? s.stressPillOn : ''}`}>
                                {economicStress
                                    ? (locale === 'ar' ? 'مُفعَّل' : 'ON')
                                    : (locale === 'ar' ? 'مُعطَّل' : 'OFF')}
                            </span>
                        </button>

                        {LEVERS.map(lever => {
                            const val     = levers[lever.key];
                            const sign    = val > 0 ? '+' : '';
                            const valCls  = val > 0 ? s.leverValPos : val < 0 ? s.leverValNeg : s.leverValNeu;
                            const sparked = optimizedKeys.has(lever.key);
                            return (
                                <div
                                    key={lever.key}
                                    className={`${s.leverRow} ${sparked ? s.leverRowSparked : ''}`}
                                >
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
                                        <span>{lever.min < 0 ? `${lever.min}${lever.unit}` : lever.min}</span>
                                        <span>{`+${lever.max}${lever.unit}`}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── IMPACT MATRIX ───────────────────────────────────── */}
                    <div className={s.section}>
                        <p className={s.sectionLabel}>{t('matrixTitle')}</p>
                        <div className={s.card}>

                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricMargin')}</p>
                                <GhostBars
                                    tagNow={t('tagNow')} tagEst={t('tagEst')}
                                    currentPct={currentMarginBar}   projectedPct={projectedMarginBar}
                                    currentLabel={`${projection.currentMarginPct}%`}
                                    projectedLabel={`${projection.projectedMarginPct}%`}
                                    currentColor="#4ADE80"
                                    projectedColor={marginImproved ? '#4ADE80' : '#F87171'}
                                />
                                {projection.marginDelta !== 0 && (
                                    <p className={`${s.delta} ${deltaCls(marginImproved)}`}>
                                        {projection.marginDelta > 0 ? '▲' : '▼'}&nbsp;{Math.abs(projection.marginDelta)}pp
                                    </p>
                                )}
                            </div>

                            <div style={{ height: 1, background: 'rgba(99,102,241,0.10)' }} />

                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricNitaqat')}</p>
                                <div className={s.tierRow}>
                                    <div className={s.tierDot} style={{ background: TIER_DARK[projection.currentTier] }} />
                                    <span className={s.tierName}>{t(`tier.${projection.currentTier}`)}</span>
                                    <span className={s.tierArrow}>→</span>
                                    <div className={s.tierDot} style={{ background: TIER_DARK[projection.projectedTier], opacity: projection.tierDropped ? 1 : 0.6 }} />
                                    <span className={s.tierName} style={{ color: TIER_DARK[projection.projectedTier] }}>
                                        {t(`tier.${projection.projectedTier}`)}
                                    </span>
                                    {projection.tierDropped && <span className={s.tierWarn}>⚠</span>}
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'rgba(99,102,241,0.10)' }} />

                            <div className={s.impactRow}>
                                <p className={s.impactLabel}>{t('metricStock')}</p>
                                <GhostBars
                                    tagNow={t('tagNow')} tagEst={t('tagEst')}
                                    currentPct={currentStockBar}   projectedPct={projectedStockBar}
                                    currentLabel={`${projection.currentStockDays.toFixed(1)}d ${projection.currentStockRisk ? '⚠' : '✓'}`}
                                    projectedLabel={`${projection.projectedStockDays.toFixed(1)}d ${projection.projectedStockRisk ? '⚠' : '✓'}`}
                                    currentColor={projection.currentStockRisk ? '#F87171' : '#4ADE80'}
                                    projectedColor={projection.projectedStockRisk ? '#F87171' : '#4ADE80'}
                                />
                            </div>

                        </div>
                    </div>

                    {/* ── CTA (manual save) ────────────────────────────────── */}
                    <div className={s.ctaArea}>
                        <div className={s.impactSummary}>
                            <span className={s.impactSummaryLabel}>{t('annualImpact')}</span>
                            <span className={`${s.impactSummaryVal} ${impactCls}`}>
                                {impact > 0 ? '+' : ''}SAR {Math.abs(impact).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-SA')}
                            </span>
                        </div>
                        <AnimatePresence mode="wait">
                            {saved ? (
                                <motion.button key="saved" className={`${s.saveBtn} ${s.saveBtnSaved}`}
                                    initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled>
                                    ✓ {t('savedBtn')}
                                </motion.button>
                            ) : (
                                <motion.button key="save" className={s.saveBtn} onClick={handleSave} whileTap={{ scale: 0.98 }}>
                                    {t('saveBtn')}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                </div>}

                {/* ── Reasoning drawer (bottom-sheet inside panel) ──────── */}
                <AnimatePresence>
                    {drawerOpen && optimalResult && (
                        <motion.div
                            key="drawer"
                            className={s.reasoningDrawer}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                        >
                            {/* Handle */}
                            <button className={s.drawerHandle} onClick={() => setDrawerOpen(false)} aria-label="Close reasoning">
                                <span className={s.drawerHandleBar} />
                            </button>

                            <p className={s.drawerTitle}>{tO('drawerTitle')}</p>

                            {/* Reasoning points */}
                            <div className={s.reasoningList}>
                                {optimalResult.reasoning.map((pt, i) => (
                                    <motion.div
                                        key={pt.key}
                                        className={s.reasoningPoint}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.08 + i * 0.09 }}
                                    >
                                        <span className={s.reasoningIcon}>{pt.icon}</span>
                                        <p className={s.reasoningText}>
                                            {tO(`reason.${pt.key}`, pt.params)}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Adopt Strategy CTA */}
                            <AnimatePresence mode="wait">
                                {adopted ? (
                                    <motion.button key="adopted" className={`${s.adoptBtn} ${s.adoptBtnDone}`}
                                        initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled>
                                        ✓ {tO('adoptedBtn')}
                                    </motion.button>
                                ) : (
                                    <motion.button key="adopt" className={s.adoptBtn} onClick={handleAdopt} whileTap={{ scale: 0.98 }}>
                                        {tO('adoptBtn')}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </div>
    );
}
