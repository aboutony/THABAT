'use client';

import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRUST_COLORS, getEntitySaudiAlternatives } from '@/lib/calculateTrustScore';
import type { Supplier, TrustBand } from '@/lib/calculateTrustScore';
import { addLedgerEntry } from '@/lib/ledger';
import { getEntitySafeguardMetrics } from '@/lib/calculateSafeguardValue';
import { useEntity } from '@/context/EntityContext';
import s from './SupplierCard.module.css';

// ── Band label maps ───────────────────────────────────────────────────────────
const BAND_EN: Record<TrustBand, string> = {
    emerald: 'Trusted Partner',
    gold:    'Monitor Required',
    crimson: 'At Risk',
};
const BAND_AR: Record<TrustBand, string> = {
    emerald: 'شريك موثوق',
    gold:    'يتطلب متابعة',
    crimson: 'في خطر',
};

// ── ShieldIcon — one shield in the 5-shield row ───────────────────────────────
// fill: 0 (empty) → 1 (full)
function ShieldIcon({ fill, color, size = 14 }: {
    fill:   number;
    color:  string;
    size?:  number;
}) {
    const uid   = useId().replace(/:/g, '');
    const VW    = 20;
    const VH    = 22;
    const PATH  = 'M 10,1 L 19,5 L 19,14 Q 19,20 10,22 Q 1,20 1,14 L 1,5 Z';
    const pct   = Math.max(0, Math.min(1, fill));

    return (
        <svg
            width={size}
            height={Math.round(size * VH / VW)}
            viewBox={`0 0 ${VW} ${VH}`}
            aria-hidden="true"
            style={{ overflow: 'visible', flexShrink: 0 }}
        >
            <defs>
                <clipPath id={`sh-${uid}`}>
                    <rect x={0} y={0} width={VW * pct} height={VH} />
                </clipPath>
            </defs>
            {/* Empty shell */}
            <path d={PATH} fill="none" stroke={color} strokeWidth={1.5} opacity={0.22} />
            {/* Filled portion */}
            {pct > 0.02 && (
                <path d={PATH} fill={color} clipPath={`url(#sh-${uid})`} opacity={0.85} />
            )}
        </svg>
    );
}

// ── ShieldRating — 5 shield icons in a row ────────────────────────────────────
export function ShieldRating({ score, color, size = 14 }: {
    score:  number;
    color:  string;
    size?:  number;
}) {
    return (
        <div className={s.shieldRow}>
            {Array.from({ length: 5 }, (_, i) => (
                <ShieldIcon
                    key={i}
                    fill={Math.max(0, Math.min(1, score - i))}
                    color={color}
                    size={size}
                />
            ))}
        </div>
    );
}

// ── Alternative supplier mini-row (inside Local Sourcing overlay) ─────────────
function AltRow({ supplier, isAr, originalName }: {
    supplier:     Supplier;
    isAr:         boolean;
    originalName: string;
}) {
    const [requested, setRequested] = useState(false);
    const [pulsing,   setPulsing]   = useState(false);
    const color = TRUST_COLORS[supplier.band];
    const { activeEntity } = useEntity();
    const { safeguardValue, shortfallUnits } = getEntitySafeguardMetrics(activeEntity.id);

    function handleQuote() {
        if (requested) return;
        setRequested(true);
        setPulsing(true);
        setTimeout(() => setPulsing(false), 700);
        addLedgerEntry({
            actionType:  'SUPPLY_CHAIN_PIVOT',
            avoidedCost: safeguardValue,
            meta: {
                original:    originalName,
                alternative: supplier.name,
                units:       shortfallUnits,
                description: `Pivoted to Local Sourcing to prevent ${shortfallUnits}-unit production halt.`,
            },
        });
    }

    return (
        <div className={`${s.altRow} ${pulsing ? s.altPulse : ''}`}>
            <span className={s.altFlag}>🇸🇦</span>
            <div className={s.altBody}>
                <span className={s.altName}>{isAr ? supplier.nameAr : supplier.name}</span>
                <span className={s.altCity}>{isAr ? supplier.cityAr : supplier.city}</span>
                <ShieldRating score={supplier.trustScore} color={color} size={12} />
            </div>
            <div className={s.altRight}>
                <span className={s.altScore} style={{ color }}>
                    {supplier.trustScore.toFixed(1)}
                </span>
                <button
                    className={`${s.quoteBtn} ${requested ? s.quoteSent : ''}`}
                    onClick={handleQuote}
                    disabled={requested}
                >
                    {requested
                        ? (isAr ? '✓ أُرسل' : '✓ Sent')
                        : (isAr ? 'طلب عرض' : 'Request Quote')}
                </button>
            </div>
        </div>
    );
}

// ── SupplierCard ──────────────────────────────────────────────────────────────
export interface SupplierCardProps {
    supplier: Supplier;
    isAr?:    boolean;
}

export default function SupplierCard({ supplier, isAr = false }: SupplierCardProps) {
    const [expanded, setExpanded] = useState(false);
    const { activeEntity } = useEntity();
    const color    = TRUST_COLORS[supplier.band];
    const isCrimson = supplier.band === 'crimson';
    const alternatives = getEntitySaudiAlternatives(activeEntity.id);

    return (
        <div className={`${s.card} ${isCrimson ? s.cardCrimson : ''}`}>

            {/* ── Header row ──────────────────────────────────────────── */}
            <div className={s.header}>

                <div className={s.left}>
                    {/* Status dot */}
                    <span className={s.statusDot} style={{ background: color }} />
                    <div className={s.nameBlock}>
                        <span className={s.name}>
                            {isAr ? supplier.nameAr : supplier.name}
                        </span>
                        <span className={s.origin}>
                            {isAr ? supplier.cityAr : supplier.city}
                            {', '}
                            {isAr ? supplier.countryAr : supplier.country}
                        </span>
                    </div>
                </div>

                <div className={s.right}>
                    <ShieldRating score={supplier.trustScore} color={color} />
                    <div className={s.scoreRow}>
                        <span className={s.scoreNum} style={{ color }}>
                            {supplier.trustScore.toFixed(1)}
                        </span>
                        <span
                            className={s.bandPill}
                            style={{
                                color,
                                background:   `${color}18`,
                                borderColor:  `${color}38`,
                            }}
                        >
                            {isAr ? BAND_AR[supplier.band] : BAND_EN[supplier.band]}
                        </span>
                    </div>
                </div>

            </div>

            {/* ── Metrics row ─────────────────────────────────────────── */}
            <div className={s.metrics}>
                <div className={s.metric}>
                    <span className={s.metricVal}>{supplier.onTimeRate}%</span>
                    <span className={s.metricLabel}>{isAr ? 'في الموعد' : 'On-Time'}</span>
                </div>
                <span className={s.divider} />
                <div className={s.metric}>
                    <span className={s.metricVal}>{supplier.qualityCompliance}%</span>
                    <span className={s.metricLabel}>{isAr ? 'الجودة' : 'Quality'}</span>
                </div>
                <span className={s.divider} />
                <div className={s.metric}>
                    <span
                        className={s.metricVal}
                        style={supplier.processingFrictionDays >= 5
                            ? { color: 'var(--warning)' }
                            : undefined}
                    >
                        {supplier.processingFrictionDays}d
                    </span>
                    <span className={s.metricLabel}>{isAr ? 'احتكاك' : 'Friction'}</span>
                </div>
            </div>

            {/* ── "Find Alternative" pivot — crimson suppliers only ────── */}
            {isCrimson && (
                <motion.button
                    className={s.pivotBtn}
                    onClick={() => setExpanded(v => !v)}
                    whileTap={{ scale: 0.98 }}
                >
                    <span className={s.pivotWarn}>⚠</span>
                    <span>{isAr ? 'البحث عن مورد بديل' : 'Find Alternative Supplier'}</span>
                    <motion.span
                        className={s.pivotChevron}
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        ▼
                    </motion.span>
                </motion.button>
            )}

            {/* ── Local Sourcing overlay ───────────────────────────────── */}
            <AnimatePresence>
                {isCrimson && expanded && (
                    <motion.div
                        key="overlay"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className={s.overlay}>
                            <p className={s.overlayTitle}>
                                {isAr
                                    ? 'موردون سعوديون مسجّلون — تقييم أعلى'
                                    : 'Saudi-Registered Alternatives — Higher Trust Score'}
                            </p>
                            {alternatives.map(alt => (
                                <AltRow key={alt.id} supplier={alt} isAr={isAr} originalName={supplier.name} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
