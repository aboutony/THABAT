'use client';

import { useState }          from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence }    from 'framer-motion';
import Link                           from 'next/link';

import Shell from '@/components/Shell';
import NitaqatShield from '@/components/NitaqatShield';
import { ShieldRating } from '@/components/SupplierCard';
import { PRIMARY_SUPPLIER, TRUST_COLORS } from '@/lib/calculateTrustScore';
import {
    calcWeightedSaudi,
    calcSaudizationPct,
    getTier,
    simulateExpats,
    calcCorrectionSaudis,
    maxExpatsBeforeDrop,
    TIER_COLORS,
    type WorkforceInput,
    type NitaqatTier,
} from '@/lib/nitaqat';
import { addLedgerEntry, calcAvoidedCost } from '@/lib/ledger';

// Local tier-label key map — `as const` lets next-intl infer the exact key literals
const TIER_KEYS = {
    platinum:  'tierPlatinum',
    highGreen: 'tierHighGreen',
    medGreen:  'tierMedGreen',
    lowGreen:  'tierLowGreen',
    red:       'tierRed',
} as const satisfies Record<NitaqatTier, string>;

import s from './nitaqat.module.css';

// ── UNIMED demo workforce ─────────────────────────────────────────────────
// weighted = 42×1.0 + 4×0.5 + 5×0.5 + 1×4.0 = 42 + 2 + 2.5 + 4 = 50.5
// saudizationPct = 50.5 / 120 × 100 = 42.08%  →  Platinum
const DEMO_WORKFORCE: WorkforceInput = {
    totalEmployees:    120,
    saudiRegular:       42,   // weight 1.0
    saudiLowSalary:      4,   // weight 0.5
    saudiStudents:       5,   // weight 0.5
    saudiSpecialNeeds:   1,   // weight 4.0  (cap 10% of 120 = 12)
};

const WORKER_ROWS: {
    key: keyof Omit<WorkforceInput, 'totalEmployees'>;
    labelKey: string;
    weight: string;
    primary: boolean;   // primary rows always visible; secondary collapse on mobile
}[] = [
    { key: 'saudiRegular',      labelKey: 'regulars',     weight: '1.0×', primary: true  },
    { key: 'saudiLowSalary',    labelKey: 'lowSalary',    weight: '0.5×', primary: false },
    { key: 'saudiStudents',     labelKey: 'students',     weight: '0.5×', primary: false },
    { key: 'saudiSpecialNeeds', labelKey: 'specialNeeds', weight: '4.0×', primary: false },
];

// ── Visa fee reference from ExpenseWaterfall (Phase 03) ───────────────────
// Each expat hire generates a visa renewal cost in the Government / ZATCA waterfall.
// We surface the safe-window count here as the Nitaqat–Visa interlink.

export default function NitaqatPage() {
    const locale  = useLocale();
    const isAr    = locale === 'ar';
    const t       = useTranslations('nitaqat');

    const [plannedExpats,      setPlannedExpats]      = useState(0);
    const [finalized,          setFinalized]          = useState(false);
    const [isCelebrating,      setIsCelebrating]      = useState(false);
    const [workforceExpanded,  setWorkforceExpanded]  = useState(false);

    // ── Current state ──────────────────────────────────────────────────────
    const weightedSaudi  = calcWeightedSaudi(DEMO_WORKFORCE);
    const saudizationPct = calcSaudizationPct(weightedSaudi, DEMO_WORKFORCE.totalEmployees);
    const currentTier    = getTier(saudizationPct, DEMO_WORKFORCE.totalEmployees);
    const currentLabel   = t(TIER_KEYS[currentTier]);

    // ── Simulation ────────────────────────────────────────────────────────
    const sim = simulateExpats(
        weightedSaudi,
        DEMO_WORKFORCE.totalEmployees,
        currentTier,
        plannedExpats,
    );
    const correctionNeeded = (sim.tierDropped && currentTier !== 'red')
        ? calcCorrectionSaudis(weightedSaudi, sim.newTotal, currentTier)
        : 0;

    // Max safe expats without dropping from currentTier (if not red)
    const safeWindow = currentTier !== 'red'
        ? maxExpatsBeforeDrop(weightedSaudi, DEMO_WORKFORCE.totalEmployees, currentTier)
        : 0;

    const simLabel = t(TIER_KEYS[sim.newTier]);

    function handleFinalize() {
        // Post simulation snapshot to the Action Ledger
        const avoidedCost = calcAvoidedCost(
            plannedExpats,
            correctionNeeded,
            sim.tierDropped,
            safeWindow,
        );
        const saved = addLedgerEntry({
            plannedExpats,
            currentTier:      currentTier,
            projectedTier:    sim.newTier,
            tierDropped:      sim.tierDropped,
            correctionNeeded,
            safeWindow,
            avoidedCost,
        });

        // Belt-and-suspenders: dispatch even if saveLedger already did
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('thabat-ledger-updated'));
        }

        console.log('Action Saved to Ledger', saved);

        // Celebration pulse then toast
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 700);
        setFinalized(true);
        setTimeout(() => setFinalized(false), 3000);
    }

    return (
        <Shell>
        {/* ── Celebration overlay — position:fixed bypasses all overflow clipping ── */}
        <AnimatePresence>
            {isCelebrating && (
                <motion.div
                    style={{
                        position:      'fixed',
                        inset:         0,
                        pointerEvents: 'none',
                        zIndex:        50,
                        background:    'radial-gradient(ellipse at 50% 92%, rgba(180,83,9,0.22) 0%, transparent 68%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                />
            )}
        </AnimatePresence>
        <motion.div
            className={s.page}
            animate={isCelebrating ? {
                scale:     1.02,
                boxShadow: 'inset 0 0 52px 10px rgba(180, 83, 9, 0.18)',
            } : {
                scale:     1,
                boxShadow: 'inset 0 0 0px 0px rgba(180, 83, 9, 0)',
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            {/* Back link */}
            <Link href={`/${locale}/analytics`} className={s.backLink}>
                {isAr ? '←' : '→'}&nbsp;{t('back')}
            </Link>

            {/* Header */}
            <div className={s.header}>
                <h2 className={s.title}>{t('title')}</h2>
                <p className={s.subtitle}>{t('subtitle')}</p>
            </div>

            {/* ── Gauge card ──────────────────────────────────────────────── */}
            <div className={`glass-card ${s.gaugeCard}`}>
                <NitaqatShield
                    saudizationPct={plannedExpats > 0 ? sim.newWeightedPct : saudizationPct}
                    tier={plannedExpats > 0 ? sim.newTier : currentTier}
                    tierLabel={plannedExpats > 0 ? simLabel : currentLabel}
                    isAr={isAr}
                />
                <div className={s.gaugeMeta}>
                    <span className={s.gaugeMetaItem}>
                        <span className={s.metaLabel}>{t('totalEmployees')}</span>
                        <span className={s.metaVal}>
                            {plannedExpats > 0 ? sim.newTotal : DEMO_WORKFORCE.totalEmployees}
                        </span>
                    </span>
                    <span className={s.gaugeMetaItem}>
                        <span className={s.metaLabel}>{t('saudiWeighted')}</span>
                        <span className={s.metaVal}>{weightedSaudi.toFixed(1)}</span>
                    </span>
                </div>
            </div>

            {/* ── Supplier Trust Shield — margin linkage ──────────────────── */}
            <Link
                href={`/${locale}/analytics/supply-chain`}
                className={`glass-card ${s.supplierCard}`}
            >
                <div className={s.supplierLeft}>
                    <p className={s.supplierLabel}>{t('supplierLabel')}</p>
                    <p className={s.supplierName}>
                        {isAr ? PRIMARY_SUPPLIER.nameAr : PRIMARY_SUPPLIER.name}
                    </p>
                    <ShieldRating
                        score={PRIMARY_SUPPLIER.trustScore}
                        color={TRUST_COLORS[PRIMARY_SUPPLIER.band]}
                        size={13}
                    />
                </div>
                <div className={s.supplierRight}>
                    <span
                        className={s.supplierScore}
                        style={{ color: TRUST_COLORS[PRIMARY_SUPPLIER.band] }}
                    >
                        {PRIMARY_SUPPLIER.trustScore.toFixed(1)}<span className={s.supplierOf}>/5</span>
                    </span>
                    <span className={s.supplierMargin}>{t('supplierMarginNote')}</span>
                </div>
            </Link>

            {/* ── Visa interlink — full-width, high-context after gauge ────── */}
            <div className={`glass-card ${s.visaCard}`}>
                <span className={s.visaIcon}>🛂</span>
                <div className={s.visaText}>
                    <p className={s.visaTitle}>{t('visaInterlink')}</p>
                    <p className={s.visaDesc}>{t('visaImpactText', { n: safeWindow })}</p>
                </div>
                <Link
                    href={`/${locale}/analytics/sales-report`}
                    className={s.visaLink}
                >
                    {t('viewWaterfall')} →
                </Link>
            </div>

            {/* ── Workforce snapshot ──────────────────────────────────────── */}
            <div className={`glass-card ${s.card}`}>
                <div className={s.cardTitleRow}>
                    <p className={s.cardTitle}>{t('workforce')}</p>
                    <button
                        className={s.expandBtn}
                        onClick={() => setWorkforceExpanded(e => !e)}
                        aria-expanded={workforceExpanded}
                    >
                        {workforceExpanded
                            ? (isAr ? '▲ إخفاء' : '▲ Hide')
                            : (isAr ? '▼ التفاصيل' : '▼ Details')
                        }
                    </button>
                </div>
                <div className={s.workerGrid}>
                    {WORKER_ROWS.map(({ key, labelKey, weight, primary }) => {
                        const count  = DEMO_WORKFORCE[key];
                        const wValue = key === 'saudiSpecialNeeds'
                            ? Math.min(count, Math.floor(DEMO_WORKFORCE.totalEmployees * 0.10)) * 4.0
                            : count * parseFloat(weight);
                        return (
                            <div
                                key={key}
                                className={[
                                    s.workerRow,
                                    !primary ? s.workerRowCollapsible : '',
                                    !primary && workforceExpanded ? s.expanded : '',
                                ].join(' ')}
                            >
                                <span className={s.workerLabel}>{t(labelKey)}</span>
                                <span className={s.workerCount}>{count}</span>
                                <span className={s.workerWeight}>{weight}</span>
                                <span className={s.workerWeighted}>{wValue.toFixed(1)}</span>
                            </div>
                        );
                    })}
                    <div className={`${s.workerRow} ${s.workerTotal}`}>
                        <span className={s.workerLabel}>{t('totalEmployees')}</span>
                        <span className={s.workerCount}>{DEMO_WORKFORCE.totalEmployees}</span>
                        <span className={s.workerWeight}/>
                        <span className={s.workerWeighted}>{weightedSaudi.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* ── Expansion simulator ─────────────────────────────────────── */}
            <div className={`glass-card ${s.card}`}>
                <div className={s.simHeader}>
                    <p className={s.cardTitle}>{t('simulatorTitle')}</p>
                    <p className={s.cardSubtitle}>{t('simulatorSubtitle')}</p>
                </div>

                {/* Counter always above slider so thumb never blocks the number */}
                <div className={s.simCounterRow}>
                    <span className={s.simCount}>{plannedExpats}</span>
                    <span className={s.simUnit}>{t('plannedExpats')}</span>
                </div>

                {/* Slider */}
                <input
                    type="range"
                    min={0} max={50} step={1}
                    value={plannedExpats}
                    onChange={e => setPlannedExpats(Number(e.target.value))}
                    className={s.slider}
                    dir="ltr"
                />
                <div className={s.sliderLabels}>
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                </div>

                {/* Simulation result */}
                <AnimatePresence>
                    {plannedExpats > 0 && (
                        <motion.div
                            className={s.simResult}
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {/* Projected tier */}
                            <div className={s.simResultRow}>
                                <span className={s.simResultLabel}>{t('projectedTier')}</span>
                                <span
                                    className={s.tierBadge}
                                    style={{
                                        color:           TIER_COLORS[sim.newTier],
                                        borderColor:     TIER_COLORS[sim.newTier] + '44',
                                        backgroundColor: TIER_COLORS[sim.newTier] + '18',
                                    }}
                                >
                                    {simLabel}
                                </span>
                            </div>

                            {/* Projected pct */}
                            <div className={s.simResultRow}>
                                <span className={s.simResultLabel}>{t('saudizationPct')}</span>
                                <span className={s.simResultVal}>{sim.newWeightedPct.toFixed(1)}%</span>
                            </div>

                            {/* Tier drop warning */}
                            {sim.tierDropped && (
                                <div className={s.tierDropWarning}>
                                    <span className={s.warnIcon}>⚠</span>
                                    <span>{t('tierDrop')}</span>
                                </div>
                            )}

                            {/* Correction insight */}
                            {sim.tierDropped && correctionNeeded > 0 && (
                                <div className={s.correctionBox}>
                                    <p className={s.correctionLabel}>{t('correctionInsight')}</p>
                                    <p className={s.correctionText}>
                                        {t('correctionText', { n: correctionNeeded, tier: currentLabel })}
                                    </p>
                                </div>
                            )}

                            {/* Still safe — remaining window */}
                            {!sim.tierDropped && (
                                <div className={s.safeNote}>
                                    {t('stillSafe', { tier: currentLabel })}
                                    {' · '}
                                    {t('remainingWindow', { n: Math.max(0, safeWindow - plannedExpats) })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Safe expansion window ────────────────────────────────────── */}
            <div className={`glass-card ${s.card}`}>
                <p className={s.cardTitle}>{t('maxExpatsSafe')}</p>
                <div className={s.insightRow}>
                    <div className={s.insightStat}>
                        <span className={s.insightNum} style={{ color: TIER_COLORS[currentTier] }}>
                            {safeWindow}
                        </span>
                        <span className={s.insightDesc}>{t('maxExpatsText', { n: safeWindow })}</span>
                    </div>
                </div>
            </div>

            {/* ── Finalize button ──────────────────────────────────────────── */}
            <div className={`${s.finalizeWrap} ${isCelebrating ? s.celebrating : ''}`}>
                <motion.button
                    className={s.finalizeBtn}
                    onClick={handleFinalize}
                    whileTap={{ scale: 0.97 }}
                >
                    {t('finalizeBtn')}
                </motion.button>

                <AnimatePresence>
                    {finalized && (
                        <motion.div
                            className={s.toast}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                        >
                            {t('finalizeToast')}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
        </Shell>
    );
}
