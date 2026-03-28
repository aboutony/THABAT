'use client';

/**
 * ClientConstellation — Phase 12: Relationship Constellation
 *
 * Replaces the static star-field placeholder on the Home Screen with a live
 * SVG showing each major client as a star:
 *
 *   Star size       → Annual Contract Value (ACV)
 *   Star brightness → Health Score (opacity proportional)
 *   Star colour     → health level (emerald / yellow / amber)
 *   Flicker         → score < 60 (Framer Motion amber pulse)
 *
 * Tap a star to see client name + health score in a compact tooltip.
 * Links to /analytics/retention for the full Churn Sentinel dashboard.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
    CLIENT_HEALTH_RESULTS,
    MAX_CLIENT_ACV,
    type ClientHealthResult,
} from '@/lib/calculateClientHealth';
import s from './ClientConstellation.module.css';

// ── SVG canvas dimensions ─────────────────────────────────────────────────────
const W = 340;
const H = 130;

// Faint background decoration stars (not clients — purely decorative)
const BG_STARS = [
    { x: 20,  y: 15 }, { x: 130, y: 10 }, { x: 210, y: 20 }, { x: 310, y: 12 },
    { x: 60,  y: 75 }, { x: 170, y: 70 }, { x: 270, y: 110 }, { x: 330, y: 60 },
    { x: 90,  y: 120 }, { x: 230, y: 78 },
];

// Constellation lines between adjacent client stars (index pairs in CLIENT_HEALTH_RESULTS)
// Ordered: MoH(0)–NUPCO(1), MoH(0)–NG Health(2), NG Health(2)–KFSH(3),
//          NG Health(2)–SGH(4), MoH(0)–KFSH(3)
const CONSTELLATION_LINES: Array<[number, number]> = [
    [0, 1], [0, 2], [2, 3], [2, 4], [0, 3],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function starRadius(acv: number): number {
    // Range: 6–12 SVG units → at 0.8 scale (72mm viewport) = 1.27–2.54mm
    // matches spec: Active 2.5mm / Passive 1.2mm at mobile scale factor
    return 6 + (acv / MAX_CLIENT_ACV) * 6;
}

function starOpacity(healthScore: number): number {
    // Range: 0.35–1.0
    return 0.35 + (healthScore / 100) * 0.65;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientConstellation() {
    const locale = useLocale();
    const isAr   = locale === 'ar';
    const [active, setActive] = useState<ClientHealthResult | null>(null);

    const clients = CLIENT_HEALTH_RESULTS;

    return (
        <Link
            href={`/${locale}/analytics/retention`}
            className={s.wrapper}
            onClick={e => active && e.preventDefault()}   // tap-on-star shows tooltip first
        >
            {/* ── Section label ──────────────────────────────────────── */}
            <div className={s.labelRow}>
                <span className={s.icon}>⬡</span>
                <span className={s.label}>
                    {isAr ? 'كوكبة العملاء' : 'Client Constellation'}
                </span>
                <span className={s.arrow} aria-hidden="true">›</span>
            </div>

            {/* ── SVG canvas ─────────────────────────────────────────── */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                className={s.svg}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <defs>
                    <filter id="ccStarGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="ccFlicker">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Decorative background stars */}
                {BG_STARS.map((bs, i) => (
                    <circle key={i} className={s.bgStar} cx={bs.x} cy={bs.y} r="1"
                        fill="rgba(165,180,252,0.25)" />
                ))}

                {/* Constellation lines */}
                {CONSTELLATION_LINES.map(([a, b], i) => (
                    <line key={i}
                        className={s.constellationLine}
                        x1={clients[a].starX} y1={clients[a].starY}
                        x2={clients[b].starX} y2={clients[b].starY}
                        stroke="rgba(165,180,252,0.12)"
                        strokeWidth="0.75"
                        strokeDasharray="3 4"
                    />
                ))}

                {/* Client stars */}
                {clients.map(client => {
                    const r   = starRadius(client.acv);
                    const op  = starOpacity(client.healthScore);
                    const isSelected = active?.id === client.id;

                    return (
                        <g key={client.id}
                            className={s.starGroup}
                            style={{ cursor: 'pointer' }}
                            onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActive(isSelected ? null : client);
                            }}
                        >
                            {/* Outer glow halo for at-risk / active */}
                            {(client.isFlickering || isSelected) && (
                                <motion.circle
                                    cx={client.starX} cy={client.starY}
                                    r={r + 4}
                                    fill="none"
                                    stroke={client.color}
                                    strokeWidth="1"
                                    animate={client.isFlickering
                                        ? { opacity: [0.6, 0.1, 0.7, 0.2, 0.6], r: [r + 4, r + 8, r + 4] }
                                        : { opacity: [0.5, 0.8, 0.5] }
                                    }
                                    transition={{
                                        duration: client.isFlickering ? 2.2 : 1.8,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            )}

                            {/* Star body */}
                            <motion.circle
                                cx={client.starX} cy={client.starY}
                                r={isSelected ? r + 2 : r}
                                fill={client.color}
                                opacity={op}
                                filter={client.isFlickering ? 'url(#ccFlicker)' : 'url(#ccStarGlow)'}
                                animate={client.isFlickering
                                    ? { opacity: [op, op * 0.45, op * 0.9, op * 0.5, op] }
                                    : { opacity: op }
                                }
                                transition={client.isFlickering
                                    ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                                    : undefined
                                }
                            />

                            {/* Inner bright spot */}
                            <circle
                                cx={client.starX} cy={client.starY}
                                r={r * 0.35}
                                fill="white"
                                opacity={op * 0.8}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* ── Client tooltip ─────────────────────────────────────── */}
            <AnimatePresence>
                {active && (
                    <motion.div
                        key={active.id}
                        className={s.tooltip}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        onClick={e => e.preventDefault()}
                    >
                        <span
                            className={s.tooltipDot}
                            style={{
                                background: active.color,
                                boxShadow: `0 0 5px ${active.color}`,
                            }}
                        />
                        <span className={s.tooltipName}>
                            {isAr ? active.name.ar : active.name.en}
                        </span>
                        <span className={s.tooltipScore} style={{ color: active.color }}>
                            {active.healthScore}
                        </span>
                        <span className={s.tooltipLabel}>
                            {isAr ? 'صحة' : 'health'}
                        </span>
                        {active.isFlickering && (
                            <span className={s.tooltipRisk}>
                                {isAr ? '⚠ خطر' : '⚠ At-Risk'}
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── At-risk count badge ────────────────────────────────── */}
            {(() => {
                const atRiskCount = clients.filter(c => c.isFlickering).length;
                return atRiskCount > 0 ? (
                    <div className={s.riskBadge}>
                        <span className={s.riskDot} />
                        <span>
                            {isAr
                                ? `${atRiskCount} عملاء في خطر`
                                : `${atRiskCount} clients at risk`}
                        </span>
                    </div>
                ) : null;
            })()}
        </Link>
    );
}
