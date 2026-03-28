'use client';

/**
 * EfficiencyRadar — Phase 11: Bottleneck Radar
 *
 * Circular SVG radar with 4 quadrants (Sales / Legal / Mfg / Logistics).
 * A Framer Motion sweep rotates continuously.  Each process stage is plotted
 * as a "blip" — glowing dot — whose distance from the centre encodes friction:
 *   outer ring = low friction (on time)   →  centre = high friction (blocked).
 *
 * Clicking / hovering a blip surfaces its TTV detail.  The Logistics blip
 * carries an additional cross-reference to the ExpenseWaterfall leakage figure.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { TTV_RESULTS, type TTVResult } from '@/lib/calculateTTV';
import { useIdentity } from '@/hooks/useIdentity';
import s from './EfficiencyRadar.module.css';

// ── SVG geometry constants ────────────────────────────────────────────────────
const CX = 110;
const CY = 110;
const R  = 92;          // outer ring radius

const RINGS      = [0.25, 0.50, 0.75, 1.00].map(f => R * f);
const RING_LABELS = ['75+', '50', '25', '0'] as const; // friction %

// Quadrant divider endpoints (4 axes: NE-SW, NW-SE, N-S, E-W)
const AXES = [0, 45, 90, 135].map(deg => {
    const rad = (deg * Math.PI) / 180;
    return {
        x1: CX - R * Math.sin(rad), y1: CY - R * Math.cos(rad),
        x2: CX + R * Math.sin(rad), y2: CY + R * Math.cos(rad),
    };
});

// Trailing sector path for sweep glow (60° arc counter-clockwise from north)
const TRAIL_END_X = CX + R * Math.sin((-60 * Math.PI) / 180);
const TRAIL_END_Y = CY - R * Math.cos((-60 * Math.PI) / 180);
const SWEEP_TRAIL = `M ${CX} ${CY} L ${CX} ${CY - R} A ${R} ${R} 0 0 0 ${TRAIL_END_X.toFixed(2)} ${TRAIL_END_Y.toFixed(2)} Z`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function blipXY(result: TTVResult): { x: number; y: number } {
    const distance = R * result.radarPosition;
    const rad      = (result.quadrantAngle * Math.PI) / 180;
    return {
        x: CX + distance * Math.sin(rad),
        y: CY - distance * Math.cos(rad),
    };
}

function formatHours(h: number, isAr: boolean): string {
    return isAr ? `${h} ساعة` : `${h}h`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EfficiencyRadarProps {
    /** Show the Waterfall cross-link for Logistics (default: true) */
    showWaterfallLink?: boolean;
    /** Called when user taps "Fix Bottleneck" on a high/medium friction blip */
    onFixBottleneck?: (stageKey: string, stageLabel: string) => void;
}

export default function EfficiencyRadar({ showWaterfallLink = true, onFixBottleneck }: EfficiencyRadarProps) {
    const locale      = useLocale();
    const isAr        = locale === 'ar';
    const results     = TTV_RESULTS;
    const { isClient } = useIdentity();

    const [active, setActive] = useState<TTVResult | null>(null);

    // ── CLIENT ghost: grey grid only, no blips ────────────────────────────────
    if (isClient) {
        const awaitingLabel = isAr ? 'في انتظار نبضة التكامل' : 'Awaiting Integration Pulse';
        return (
            <div className={s.wrapper}>
                <svg viewBox="0 0 220 220" className={s.svg} aria-hidden="true">
                    {RINGS.map((r, i) => (
                        <circle key={i} cx={CX} cy={CY} r={r} fill="none"
                            stroke="rgba(148,163,184,0.10)"
                            strokeWidth={i === RINGS.length - 1 ? 1.5 : 1}
                            strokeDasharray={i < RINGS.length - 1 ? '3 4' : undefined}
                        />
                    ))}
                    {AXES.map((ax, i) => (
                        <line key={i} x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2}
                            stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
                    ))}
                    <circle cx={CX} cy={CY} r="3" fill="rgba(148,163,184,0.15)" />
                    <text x={CX} y={CY + 18} textAnchor="middle"
                        fontSize="8" fill="rgba(148,163,184,0.45)"
                        fontWeight="600" letterSpacing="0.04em">
                        {awaitingLabel}
                    </text>
                </svg>
            </div>
        );
    }

    const quadrantLabels = [
        { angle: 45,  textX: CX + (R + 12) * 0.707, textY: CY - (R + 12) * 0.707, label: isAr ? 'المبيعات' : 'Sales'       },
        { angle: 135, textX: CX + (R + 12) * 0.707, textY: CY + (R + 12) * 0.707, label: isAr ? 'القانونية' : 'Legal'      },
        { angle: 225, textX: CX - (R + 12) * 0.707, textY: CY + (R + 12) * 0.707, label: isAr ? 'التصنيع'   : 'Mfg'        },
        { angle: 315, textX: CX - (R + 12) * 0.707, textY: CY - (R + 12) * 0.707, label: isAr ? 'اللوجستيات': 'Logistics'  },
    ];

    const logisticsResult = results.find(r => r.key === 'logistics')!;
    const showWfTooltip   = showWaterfallLink && active?.key === 'logistics';

    return (
        <div className={s.wrapper}>
            {/* ── Radar SVG ─────────────────────────────────────────── */}
            <svg
                viewBox="0 0 220 220"
                className={s.svg}
                aria-label={isAr ? 'رادار الكفاءة' : 'Efficiency Radar'}
            >
                <defs>
                    <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="rgba(16,185,129,0.06)" />
                        <stop offset="100%" stopColor="rgba(16,185,129,0.01)" />
                    </radialGradient>
                    <filter id="blipGlow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="sweepGlow">
                        <feGaussianBlur stdDeviation="3" />
                    </filter>
                </defs>

                {/* Background fill */}
                <circle className={s.radarBgCircle} cx={CX} cy={CY} r={R} fill="url(#radarBg)" />

                {/* Concentric rings */}
                {RINGS.map((r, i) => (
                    <circle
                        key={i}
                        className={s.ring}
                        cx={CX} cy={CY} r={r}
                        fill="none"
                        stroke="rgba(16,185,129,0.12)"
                        strokeWidth={i === RINGS.length - 1 ? 1.5 : 1}
                        strokeDasharray={i < RINGS.length - 1 ? '3 4' : undefined}
                    />
                ))}

                {/* Friction ring labels (right axis) */}
                {RINGS.map((r, i) => (
                    <text key={i} x={CX + r + 3} y={CY + 3}
                        fontSize="6" fill="rgba(16,185,129,0.35)"
                        className={s.ringLabel}
                    >
                        {i < RINGS.length - 1 ? `${Math.round((1 - [0.25,0.5,0.75,1][i]) * 100)}%` : ''}
                    </text>
                ))}

                {/* Quadrant axes */}
                {AXES.map((ax, i) => (
                    <line key={i}
                        className={s.axisLine}
                        x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2}
                        stroke="rgba(16,185,129,0.14)" strokeWidth="1"
                    />
                ))}

                {/* Centre dot */}
                <circle className={s.centreDot} cx={CX} cy={CY} r="3"
                    fill="rgba(16,185,129,0.25)" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />

                {/* ── Sweep ───────────────────────────────────────── */}
                <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                    {/* Trailing sector glow */}
                    <path className={s.sweepTrail} d={SWEEP_TRAIL} fill="rgba(16,185,129,0.09)" />
                    {/* Scan line */}
                    <line
                        className={s.sweepLine}
                        x1={CX} y1={CY} x2={CX} y2={CY - R}
                        stroke="rgba(16,185,129,0.75)" strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    {/* Tip glow */}
                    <circle className={s.sweepTip} cx={CX} cy={CY - R} r="3"
                        fill="rgba(16,185,129,0.8)"
                        filter="url(#sweepGlow)"
                    />
                </motion.g>

                {/* ── Quadrant labels ──────────────────────────────── */}
                {quadrantLabels.map((ql) => (
                    <text
                        key={ql.angle}
                        x={ql.textX} y={ql.textY}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="7.5" fontWeight="700"
                        fill="rgba(255,255,255,0.30)"
                        className={s.quadLabel}
                    >
                        {ql.label}
                    </text>
                ))}

                {/* ── Blips ───────────────────────────────────────── */}
                {results.map((result) => {
                    const { x, y } = blipXY(result);
                    const isSelected = active?.key === result.key;

                    return (
                        <g
                            key={result.key}
                            className={s.blipGroup}
                            onClick={() => setActive(isSelected ? null : result)}
                            onMouseEnter={() => setActive(result)}
                            onMouseLeave={() => setActive(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Outer pulse ring (high/medium friction only) */}
                            {result.severity !== 'low' && (
                                <motion.circle
                                    cx={x} cy={y} r="10"
                                    fill="none"
                                    stroke={result.color}
                                    strokeWidth="1"
                                    animate={{ r: [10, 16], opacity: [0.5, 0] }}
                                    transition={{
                                        duration: result.severity === 'high' ? 1.2 : 2,
                                        repeat: Infinity,
                                        ease: 'easeOut',
                                    }}
                                />
                            )}
                            {/* Blip core */}
                            <circle
                                cx={x} cy={y} r={isSelected ? 7 : 5}
                                fill={result.color}
                                opacity={isSelected ? 1 : 0.85}
                                filter="url(#blipGlow)"
                            />
                            {/* Inner bright spot */}
                            <circle cx={x} cy={y} r="2" fill="white" opacity={0.7} />
                        </g>
                    );
                })}
            </svg>

            {/* ── Detail panel ──────────────────────────────────────── */}
            <AnimatePresence>
                {active && (
                    <motion.div
                        key={active.key}
                        className={`${s.detail} ${s[`detail_${active.severity}`]}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={s.detailHeader}>
                            <span
                                className={s.detailDot}
                                style={{ background: active.color, boxShadow: `0 0 6px ${active.color}` }}
                            />
                            <span className={s.detailName}>
                                {isAr ? active.label.ar : active.label.en}
                            </span>
                            <span className={s.detailSeverity} style={{ color: active.color }}>
                                {active.severity === 'high'   ? (isAr ? 'احتكاك عالٍ'    : 'High Friction')   :
                                 active.severity === 'medium' ? (isAr ? 'احتكاك متوسط' : 'Watch')            :
                                                                (isAr ? 'على المسار'     : 'On Track')}
                            </span>
                        </div>

                        <div className={s.detailRow}>
                            <span className={s.detailLabel}>{isAr ? 'الأساسي' : 'Baseline'}</span>
                            <span className={s.detailVal}>{formatHours(active.baselineHours, isAr)}</span>
                            <span className={s.detailLabel}>{isAr ? 'الحالي' : 'Current'}</span>
                            <span className={s.detailVal} style={{ color: active.color }}>
                                {formatHours(active.currentHours, isAr)}
                            </span>
                        </div>

                        <div className={s.detailDelta}>
                            +{formatHours(active.delayHours, isAr)}
                            {' '}
                            <span className={s.detailRatio}>
                                ({active.frictionRatio.toFixed(1)}×)
                            </span>
                        </div>

                        {/* Waterfall cross-reference for Logistics */}
                        {showWfTooltip && (
                            <div className={s.waterfallLink}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                {isAr
                                    ? 'هذا الاحتكاك يُسهم في تسرب 14% في اللوجستيات — راجع الشلال.'
                                    : 'Friction here is contributing to the 14% Logistics leakage found in your Waterfall.'}
                            </div>
                        )}

                        {/* Fix Bottleneck CTA — only for high/medium friction */}
                        {onFixBottleneck && active.severity !== 'low' && (
                            <button
                                className={s.fixBtn}
                                onClick={() => onFixBottleneck(
                                    active.key,
                                    isAr ? active.label.ar : active.label.en,
                                )}
                            >
                                ⚡ {isAr ? 'إصلاح الاختناق' : 'Fix Bottleneck'}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Legend ────────────────────────────────────────────── */}
            <div className={s.legend}>
                {[
                    { color: '#4ADE80', label: isAr ? 'على المسار'   : 'On Track'      },
                    { color: '#F59E0B', label: isAr ? 'يحتاج مراقبة' : 'Watch'         },
                    { color: '#F87171', label: isAr ? 'احتكاك عالٍ'  : 'High Friction' },
                ].map(item => (
                    <div key={item.color} className={s.legendItem}>
                        <span className={s.legendDot} style={{ background: item.color }} />
                        <span>{item.label}</span>
                    </div>
                ))}
                <div className={s.legendItem}>
                    <span className={s.legendDot} style={{ background: 'rgba(16,185,129,0.4)' }} />
                    <span>{isAr ? 'المركز = أعلى احتكاك' : 'Centre = max friction'}</span>
                </div>
            </div>
        </div>
    );
}
