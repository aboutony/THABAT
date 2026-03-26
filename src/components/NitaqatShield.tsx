'use client';

import { useSpring, useTransform, motion } from 'framer-motion';
import {
    toNeedleRotation,
    TIER_COLORS,
    TIER_ORDER,
    GAUGE_MAX_PCT,
    type NitaqatTier,
} from '@/lib/nitaqat';
import s from './NitaqatShield.module.css';

// ── SVG constants ─────────────────────────────────────────────────────────
const W = 280, H = 160;
const CX = 140, CY = 140;
const OUTER_R = 120, INNER_R = 74, NEEDLE_R = 68;

function polar(r: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

/**
 * Donut ring segment from math angle `from` → `to` (from > to, sweeping CW in math = CCW in screen).
 * Outer arc: sweep=0 (screen CCW = math CW = going up through top)
 * Inner arc: sweep=1 (screen CW  = math CCW = returning back down)
 */
function arcPath(from: number, to: number, outerR: number, innerR: number): string {
    const a = polar(outerR, from), b = polar(outerR, to);
    const c = polar(innerR, to),   d = polar(innerR, from);
    const lg = Math.abs(from - to) > 180 ? 1 : 0;
    return [
        `M ${a.x} ${a.y}`,
        `A ${outerR} ${outerR} 0 ${lg} 0 ${b.x} ${b.y}`,
        `L ${c.x} ${c.y}`,
        `A ${innerR} ${innerR} 0 ${lg} 1 ${d.x} ${d.y}`,
        'Z',
    ].join(' ');
}

// ── Band layout ───────────────────────────────────────────────────────────
type BandDef = { tier: NitaqatTier; from: number; to: number };

// LTR: Red on left (low score), Platinum on right (high score)
const BANDS_LTR: BandDef[] = [
    { tier: 'red',       from: 180, to: 144 },
    { tier: 'lowGreen',  from: 144, to: 108 },
    { tier: 'medGreen',  from: 108, to:  72 },
    { tier: 'highGreen', from:  72, to:  36 },
    { tier: 'platinum',  from:  36, to:   0 },
];

// RTL: mirrored — Platinum on left, Red on right
const BANDS_RTL: BandDef[] = [
    { tier: 'platinum',  from: 180, to: 144 },
    { tier: 'highGreen', from: 144, to: 108 },
    { tier: 'medGreen',  from: 108, to:  72 },
    { tier: 'lowGreen',  from:  72, to:  36 },
    { tier: 'red',       from:  36, to:   0 },
];

// ── Component ─────────────────────────────────────────────────────────────
export interface NitaqatShieldProps {
    saudizationPct: number;
    tier:           NitaqatTier;
    tierLabel:      string;
    isAr?:          boolean;
}

export default function NitaqatShield({
    saudizationPct,
    tier,
    tierLabel,
    isAr = false,
}: NitaqatShieldProps) {
    const svgRot    = toNeedleRotation(saudizationPct, isAr);
    const springRot = useSpring(svgRot, { stiffness: 60, damping: 14, mass: 1.2 });

    // Compute needle tip in circular coordinates from the spring value
    const tipX = useTransform(springRot, (deg) =>
        CX + NEEDLE_R * Math.sin((deg * Math.PI) / 180),
    );
    const tipY = useTransform(springRot, (deg) =>
        CY - NEEDLE_R * Math.cos((deg * Math.PI) / 180),
    );

    const amberGlow  = TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf('lowGreen');
    const tierColor  = TIER_COLORS[tier];
    const bands      = isAr ? BANDS_RTL : BANDS_LTR;
    const activeBand = bands.find(b => b.tier === tier);

    // Min/max labels depend on reading direction
    const minLabel  = isAr ? `${GAUGE_MAX_PCT}%` : '0%';
    const maxLabel  = isAr ? '0%' : `${GAUGE_MAX_PCT}%`;

    return (
        <div className={`${s.shield} ${amberGlow ? s.amberGlow : ''}`}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                style={{ maxWidth: W, display: 'block', margin: '0 auto' }}
                aria-label="Nitaqat Saudization gauge"
            >
                <defs>
                    <filter id="nq-band-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="nq-needle-glow" x="-200%" y="-200%" width="500%" height="500%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Track background */}
                <path
                    d={arcPath(180, 0, OUTER_R + 3, INNER_R - 3)}
                    fill="rgba(128,128,128,0.06)"
                />

                {/* Tier bands */}
                {bands.map(({ tier: t, from, to }) => (
                    <path
                        key={t}
                        d={arcPath(from, to, OUTER_R, INNER_R)}
                        fill={TIER_COLORS[t]}
                        opacity={t === tier ? 0.92 : 0.20}
                    />
                ))}

                {/* Active band glow */}
                {activeBand && (
                    <path
                        d={arcPath(activeBand.from, activeBand.to, OUTER_R, INNER_R)}
                        fill={tierColor}
                        opacity={0.22}
                        filter="url(#nq-band-glow)"
                    />
                )}

                {/* Band dividers */}
                {[144, 108, 72, 36].map((angle) => {
                    const p1 = polar(INNER_R - 1, angle);
                    const p2 = polar(OUTER_R + 1, angle);
                    return (
                        <line
                            key={angle}
                            x1={p1.x} y1={p1.y}
                            x2={p2.x} y2={p2.y}
                            stroke="var(--bg-primary)"
                            strokeWidth={1.5}
                            opacity={0.55}
                        />
                    );
                })}

                {/* Tier label */}
                <text
                    x={CX} y={CY - 46}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={tierColor}
                    fontSize={10}
                    fontWeight={700}
                    letterSpacing="0.1em"
                    style={{ textTransform: 'uppercase' }}
                >
                    {tierLabel}
                </text>

                {/* Saudization percentage */}
                <text
                    x={CX} y={CY - 26}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-primary)"
                    fontSize={22}
                    fontWeight={700}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                    {saudizationPct.toFixed(1)}%
                </text>

                {/* "SAUDIZATION" sub-label */}
                <text
                    x={CX} y={CY - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-tertiary)"
                    fontSize={8}
                    fontWeight={500}
                    letterSpacing="0.12em"
                >
                    {isAr ? 'التوطين' : 'SAUDIZATION'}
                </text>

                {/* Scale edge labels */}
                <text x={16} y={CY + 14} textAnchor="middle" fill="var(--text-tertiary)" fontSize={9}>{minLabel}</text>
                <text x={W - 16} y={CY + 14} textAnchor="middle" fill="var(--text-tertiary)" fontSize={9}>{maxLabel}</text>

                {/* Needle — animated via MotionValues */}
                <motion.line
                    x1={CX} y1={CY}
                    x2={tipX} y2={tipY}
                    stroke="white"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    filter="url(#nq-needle-glow)"
                    opacity={0.92}
                />

                {/* Pivot outer ring */}
                <circle
                    cx={CX} cy={CY} r={8}
                    fill="var(--bg-card)"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={1}
                />
                {/* Pivot dot */}
                <circle
                    cx={CX} cy={CY} r={4}
                    fill="white"
                    opacity={0.88}
                />
            </svg>
        </div>
    );
}
